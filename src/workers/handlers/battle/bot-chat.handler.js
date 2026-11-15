import { randomUUID } from "node:crypto";
import { AppLogger } from "../../../utils/logger.js";
import {
    BATTLE_BOT_CHAT,
    BATTLE_CHAT,
    BATTLE_EVENTS,
    BATTLE_TTL_SECONDS
} from "../../../modules/battle/battle.constants.js";
import {
    classifyBotChatIntent,
    contextualizeBotChatCategory,
    getBotChatCandidates,
    getBotChatTypingDelay
} from "../../../modules/battle/battle.bot-chat.dialogues.js";
import {
    APPEND_BOT_CHAT_SCRIPT,
    BATTLE_KEYS,
    RESERVE_BOT_CHAT_PHRASE_SCRIPT,
    redisCall
} from "../../../modules/battle/battle.redis.js";
import {
    scheduleBotChatSend
} from "../../../modules/battle/battle.jobs.js";
import { redis } from "../../../config/redis.js";
import { emitBattlePlayers } from "./socketEmitter.js";

const getBattleState = async (battleId) => {
    const raw = await redis.get(BATTLE_KEYS.payload(battleId));
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (error) {
        AppLogger.error("Bot chat found corrupt battle state", error, {
            component: "battle-bot-chat",
            battleId
        });
        throw error;
    }
};

const releaseBotChatLock = async (battleId, lockToken) => {
    await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
        1,
        BATTLE_KEYS.botChatPending(battleId),
        lockToken
    );
};

export const startBotChat = async ({
    battleId,
    botUserId,
    humanUserId,
    message,
    category,
    roundIndex,
    proactive = false
} = {}) => {
    if (
        typeof battleId !== "string" ||
        (typeof category !== "string" && typeof message !== "string")
    ) {
        throw new TypeError("Bot-chat job payload is invalid.");
    }

    const state = await getBattleState(battleId);
    if (
        !state?.isBot ||
        state.phase !== "active" ||
        !state.botuserid ||
        (botUserId && state.botuserid !== botUserId) ||
        !state.bot_chat_personality
    ) return;

    const botId = state.botuserid;
    const replyToUserId = proactive
        ? state.players.find((playerId) => playerId !== botId)
        : humanUserId;
    if (!replyToUserId || replyToUserId === botId || !state.players.includes(replyToUserId)) return;
    if (proactive && state.bot_can_proactively_chat !== true) return;

    const lockToken = randomUUID();
    const lockKey = BATTLE_KEYS.botChatPending(battleId);
    const acquired = await redis.set(
        lockKey,
        lockToken,
        "EX",
        BATTLE_BOT_CHAT.CHAT_PENDING_TTL_SECONDS,
        "NX"
    );
    if (!acquired) return;

    let scheduled = false;
    try {
        let responseCategory = category;
        if (!proactive && typeof message === "string") {
            const recentEntries = await redis.lrange(BATTLE_KEYS.chat(battleId), -12, -1);
            const recentMessages = recentEntries.map((entry) => {
                try {
                    return JSON.parse(entry);
                } catch (error) {
                    AppLogger.error("Bot chat found a corrupt chat-history entry", error, {
                        component: "battle-bot-chat",
                        battleId
                    });
                    throw error;
                }
            });
            let skippedCurrentMessage = false;
            const recentHumanMessages = [];
            for (const chatMessage of recentMessages.reverse()) {
                if (chatMessage?.userId !== humanUserId || typeof chatMessage.text !== "string") {
                    continue;
                }
                if (!skippedCurrentMessage && chatMessage.text === message) {
                    skippedCurrentMessage = true;
                    continue;
                }
                recentHumanMessages.push(chatMessage.text);
            }
            recentHumanMessages.reverse();
            responseCategory = classifyBotChatIntent(message, recentHumanMessages);
        }
        const contextualCategory = contextualizeBotChatCategory(
            state,
            responseCategory,
            replyToUserId,
            roundIndex
        );
        const candidates = getBotChatCandidates(state.bot_chat_personality, contextualCategory);
        const reserved = await redisCall(
            RESERVE_BOT_CHAT_PHRASE_SCRIPT,
            [BATTLE_KEYS.payload(battleId), BATTLE_KEYS.botChatState(battleId)],
            [
                botId,
                String(BATTLE_TTL_SECONDS.BATTLE_STATE),
                ...candidates.map(({ id }) => id)
            ]
        );
        if (reserved[0] === "NOT_ACTIVE" || reserved[0] === "MISSING" || reserved[0] === "EXHAUSTED") return;
        if (reserved[0] === "CORRUPT") throw new Error(`Battle ${battleId} state is corrupted.`);
        if (reserved[0] !== "OK") throw new Error(`Unexpected bot phrase reservation result: ${reserved[0]}`);

        const phrase = candidates.find(({ id }) => id === reserved[1]);
        if (!phrase) throw new Error("Reserved bot chat phrase is missing from the dialogue bank.");

        emitBattlePlayers(state, BATTLE_EVENTS.DISPLAY_TYPING, {
            userId: botId,
            isTyping: true
        });
        await scheduleBotChatSend(
            battleId,
            botId,
            replyToUserId,
            phrase.text,
            getBotChatTypingDelay(phrase.text.length),
            lockToken
        );
        scheduled = true;
    } catch (error) {
        emitBattlePlayers(state, BATTLE_EVENTS.DISPLAY_TYPING, {
            userId: botId,
            isTyping: false
        });
        throw error;
    } finally {
        if (!scheduled) await releaseBotChatLock(battleId, lockToken);
    }
};

export const sendBotChat = async ({
    battleId,
    botUserId,
    humanUserId,
    text,
    lockToken
} = {}) => {
    if (
        typeof battleId !== "string" ||
        typeof botUserId !== "string" ||
        typeof humanUserId !== "string" ||
        typeof text !== "string" ||
        typeof lockToken !== "string"
    ) {
        throw new TypeError("Bot-chat send job payload is invalid.");
    }

    try {
        const state = await getBattleState(battleId);
        if (
            !state?.isBot ||
            state.phase !== "active" ||
            state.botuserid !== botUserId ||
            !state.players.includes(humanUserId)
        ) return;

        const result = await redisCall(
            APPEND_BOT_CHAT_SCRIPT,
            [BATTLE_KEYS.payload(battleId), BATTLE_KEYS.chat(battleId)],
            [
                botUserId,
                text,
                String(BATTLE_CHAT.HISTORY_LIMIT),
                String(BATTLE_TTL_SECONDS.BATTLE_STATE)
            ]
        );
        if (result[0] === "NOT_ACTIVE" || result[0] === "MISSING" || result[0] === "NOT_PLAYER") return;
        if (result[0] === "CORRUPT") throw new Error(`Battle ${battleId} state is corrupted.`);
        if (result[0] !== "OK") throw new Error(`Unexpected bot chat append result: ${result[0]}`);

        emitBattlePlayers(state, BATTLE_EVENTS.DISPLAY_TYPING, {
            userId: botUserId,
            isTyping: false
        });
        emitBattlePlayers(state, BATTLE_EVENTS.CHAT_MESSAGE, JSON.parse(result[1]));
    } finally {
        await releaseBotChatLock(battleId, lockToken);
    }
};

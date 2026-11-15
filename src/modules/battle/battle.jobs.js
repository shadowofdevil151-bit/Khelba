import { randomInt, randomUUID } from "node:crypto";
import { redis } from "../../config/redis.js";
import { mainQueue } from "../../queues/main.queue.js";
import { BATTLE_BOT_CHAT, BATTLE_JOBS, BATTLE_TTL_SECONDS } from "./battle.constants.js";
import { BATTLE_KEYS, CLAIM_BOT_CHAT_MILESTONE_SCRIPT, redisCall } from "./battle.redis.js";

const addBattleJob = (name, jobId, data, delay = 0) =>
    mainQueue.add(name, data, {
        jobId,
        delay,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true
    });

export const scheduleNextQuestion = (battleId, expectedIndex, delay = 0) =>
    addBattleJob(
        BATTLE_JOBS.NEXT_QUESTION,
        `battle-next-${battleId}-${expectedIndex + 1}`,
        { battleId, expectedIndex },
        delay
    );

export const scheduleRoundTimeout = (battleId, questionIndex, delay) =>
    addBattleJob(
        BATTLE_JOBS.ROUND_TIMEOUT,
        `battle-timeout-${battleId}-${questionIndex}`,
        { battleId, questionIndex },
        delay
    );

export const scheduleBotAnswer = (battleId, questionIndex, delay) =>
    addBattleJob(
        BATTLE_JOBS.BOT_SUBMIT_ANSWER,
        `battle-bot-answer-${battleId}-${questionIndex}`,
        { battleId, questionIndex },
        delay
    );

export const scheduleBotChatReply = (battleId, botUserId, humanUserId, message, delay) =>
    addBattleJob(
        BATTLE_JOBS.BOT_CHAT,
        `battle-bot-chat-${battleId}-${randomUUID()}`,
        { battleId, botUserId, humanUserId, message, proactive: false },
        delay
    );

export const scheduleBotProactiveChat = async (battleId, milestone, category, roundIndex) => {
    const chanceKey = category === "round_result" ? "round-result" : category;
    const chance = BATTLE_BOT_CHAT.PROACTIVE_CHANCES_PERCENT[chanceKey]
        ?? BATTLE_BOT_CHAT.PROACTIVE_CHANCES_PERCENT[milestone];
    if (chance === undefined) {
        throw new TypeError(`Unsupported bot-chat milestone: ${milestone}`);
    }
    const key = BATTLE_KEYS.botChatState(battleId);
    const claimed = await redisCall(
        CLAIM_BOT_CHAT_MILESTONE_SCRIPT,
        [key],
        [`milestone:${milestone}`, String(BATTLE_TTL_SECONDS.BATTLE_STATE)]
    );
    if (!claimed) return null;
    if (randomInt(0, 100) >= chance) return null;

    try {
        const delay = randomInt(
            BATTLE_BOT_CHAT.PROACTIVE_MIN_DELAY_MS,
            BATTLE_BOT_CHAT.PROACTIVE_MAX_DELAY_MS + 1
        );
        return await addBattleJob(
            BATTLE_JOBS.BOT_CHAT,
            `battle-bot-chat-${battleId}-${milestone}`,
            { battleId, milestone, category, roundIndex, proactive: true },
            delay
        );
    } catch (error) {
        await redis.srem(key, `milestone:${milestone}`);
        throw error;
    }
};

export const scheduleBotChatSend = (battleId, botUserId, humanUserId, text, delay, lockToken) =>
    addBattleJob(
        BATTLE_JOBS.BOT_CHAT_SEND,
        `battle-bot-chat-send-${battleId}-${randomUUID()}`,
        { battleId, botUserId, humanUserId, text, lockToken },
        delay
    );

export const scheduleBattleForfeit = (battleId, userId, socketId, delay) =>
    addBattleJob(
        BATTLE_JOBS.FORFEIT_BATTLE,
        `battle-forfeit-${battleId}-${userId}`,
        { battleId, forfeitedUserId: userId, expectedSocketId: socketId, isVoluntary: delay === 0 },
        delay
    );

export const scheduleBattleFinalization = (battleId) =>
    addBattleJob(
        BATTLE_JOBS.FINALIZE_BATTLE,
        `battle-finalize-${battleId}`,
        { battleId }
    );

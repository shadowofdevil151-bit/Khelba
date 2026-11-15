import { randomInt } from "node:crypto";
import { redis } from "../../config/redis.js";
import { mainQueue } from "../../queues/main.queue.js";
import { AppLogger } from "../../utils/logger.js";
import { ApiError } from "../../utils/ApiError.js";
import {
    BATTLE_CHAT,
    BATTLE_EVENTS,
    BATTLE_TTL_SECONDS
} from "./battle.constants.js";
import { BattleValidator, cancelSearchPayloadSchema } from "./battle.validator.js";
import { submitBattleAnswer } from "./battle.rounds.js";
import { scheduleBattleForfeit } from "./battle.jobs.js";
import {
    BATTLE_KEYS,
    CLAIM_SOCKET_SCRIPT,
    CLEAN_WAITING_SCRIPT,
    REFRESH_SOCKET_SCRIPT,
    RELEASE_SOCKET_SCRIPT,
    BATTLE_CHAT_SCRIPT,
    COUNT_BOT_CHAT_TURN_SCRIPT,
    redisCall
} from "./battle.redis.js";
import { cancelMatchmaking } from "./battle.matchmaking-cancel.js";
import { sanitizeQuestion } from "./battle.questions.js";
import { setBattleSocketConnections } from "../../config/metrics.js";
import {
    getBotChatReplyDelay,
    getBotReplyChancePercent
} from "./battle.bot-chat.dialogues.js";
import { scheduleBotChatReply } from "./battle.jobs.js";

const RELEASE_GUARD_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;

const connectedBattleSocketIds = new Set();

const DELETE_JOB_REFERENCE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;

const throwSocketInUse = () => {
    const error = new Error("A battle socket is already connected for this account.");
    error.code = "BATTLE_SOCKET_IN_USE";
    error.data = { code: error.code, retryable: true };
    return error;
};

const removeDelayedJob = async (jobId) => {
    if (!jobId) return;
    const job = await mainQueue.getJob(jobId);
    if (!job) return;
    const state = await job.getState();
    if (state === "delayed" || state === "waiting" || state === "waiting-children") {
        await job.remove();
    }
};

export const claimBattleSocket = async (socket, namespace) => {
    const userId = socket.data.user._id;
    const guardKey = BATTLE_KEYS.socketGuard(userId);
    const acquiredGuard = await redis.set(
        guardKey,
        socket.id,
        "EX",
        10,
        "NX"
    );
    if (!acquiredGuard) throw throwSocketInUse();

    try {
        const lockKey = BATTLE_KEYS.socketLock(userId);
        const currentOwner = await redis.get(lockKey);
        if (currentOwner && currentOwner !== socket.id) {
            if (socket.handshake.auth?.reconnect !== true) {
                throw throwSocketInUse();
            }
            const existingSockets = await namespace.in(currentOwner).fetchSockets();
            if (existingSockets.length) throw throwSocketInUse();
        }

        const profile = JSON.stringify({
            _id: userId,
            username: socket.data.user.username,
            tier: socket.data.user.tier,
            avatar_url: socket.data.user.avatar_url
        });
        const claimed = await redisCall(
            CLAIM_SOCKET_SCRIPT,
            [lockKey, BATTLE_KEYS.socket(userId), BATTLE_KEYS.profile(userId)],
            [
                currentOwner || "",
                socket.id,
                profile,
                String(BATTLE_TTL_SECONDS.USER_BATTLE_LOCK),
                String(BATTLE_TTL_SECONDS.USER_SOCKET_ID)
            ]
        );
        if (!claimed) throw throwSocketInUse();
        socket.data.battleOwnershipClaimed = true;
        return currentOwner;
    } finally {
        await redis.eval(RELEASE_GUARD_SCRIPT, 1, guardKey, socket.id);
    }
};

const emitResumeSnapshot = async (socket, battleId) => {
    const rawState = await redis.get(BATTLE_KEYS.payload(battleId));
    if (!rawState) {
        socket.emit("BATTLE_ERROR", { message: "Battle state is no longer available." });
        return false;
    }

    let state;
    try {
        state = JSON.parse(rawState);
    } catch (error) {
        AppLogger.error("Corrupt battle state in Redis", error, {
            component: "battle-socket",
            battleId
        });
        socket.emit("BATTLE_ERROR", { message: "Battle state could not be restored." });
        return false;
    }
    if (!Array.isArray(state.players) || !state.players.includes(socket.data.user._id)) {
        socket.emit("BATTLE_ERROR", { message: "This account is not part of the battle." });
        return false;
    }

    const chat = (await redis.lrange(BATTLE_KEYS.chat(battleId), 0, -1)).map((message) => {
        try {
            return JSON.parse(message);
        } catch (error) {
            AppLogger.error("Corrupt battle chat entry in Redis", error, {
                component: "battle-chat",
                battleId
            });
            throw error;
        }
    });
    const question = state.questions?.[state.current_index];
    socket.emit(BATTLE_EVENTS.BATTLE_STATE_SNAPSHOT, {
        battleId,
        yourUserId: socket.data.user._id,
        players: state.players.map((userId) => ({
            userId,
            isBot: userId === state.botuserid,
            ...state.player_profiles?.[userId]
        })),
        scores: state.scores,
        total_questions: state.total_questions,
        current_index: state.current_index,
        phase: state.phase,
        timeout_seconds: state.phase === "active" && Number.isFinite(Number(state.round_started_at))
            ? Math.max(0, BATTLE_TTL_SECONDS.ROUND_TIMEOUT - (Date.now() - Number(state.round_started_at)) / 1000)
            : BATTLE_TTL_SECONDS.ROUND_TIMEOUT,
        answered_count: state.answered_count,
        chat,
        hasAnswered: state.players_answers?.[socket.data.user._id]?.[state.current_index] !== undefined,
        question: question ? sanitizeQuestion(question) : null
    });
    return { players: state.players, botUserId: state.botuserid };
};

export const registerBattleSocketHandlers = (battleNamespace) => {
    battleNamespace.on("connection", (socket) => {
        socket.emit(BATTLE_EVENTS.CHAT_CONFIG, {
            maxMessageLength: BATTLE_CHAT.MAX_MESSAGE_LENGTH,
            messagesPerMinute: BATTLE_CHAT.RATE_LIMIT,
            historyLimit: BATTLE_CHAT.HISTORY_LIMIT
        });
        if (!connectedBattleSocketIds.has(socket.id)) {
            connectedBattleSocketIds.add(socket.id);
            setBattleSocketConnections(connectedBattleSocketIds.size);
        }
        const userId = socket.data.user._id;
        let heartbeat;

        const initialize = async () => {
            heartbeat = setInterval(() => {
                redisCall(
                    REFRESH_SOCKET_SCRIPT,
                    [
                        BATTLE_KEYS.socketLock(userId),
                        BATTLE_KEYS.socket(userId),
                        BATTLE_KEYS.profile(userId)
                    ],
                    [
                        socket.id,
                        String(BATTLE_TTL_SECONDS.USER_BATTLE_LOCK),
                        String(BATTLE_TTL_SECONDS.USER_SOCKET_ID)
                    ]
                ).catch((error) => {
                    AppLogger.error("Failed to refresh battle socket ownership", error, {
                        component: "battle-socket",
                        userId
                    });
                });
            }, 5 * 60 * 1000);
            heartbeat.unref();

            const battleId = await redis.get(BATTLE_KEYS.inBattle(userId));
            if (!battleId) return;
            const snapshot = await emitResumeSnapshot(socket, battleId);
            if (snapshot) {
                const forfeitJobId = await redis.get(BATTLE_KEYS.forfeitJob(userId));
                await removeDelayedJob(forfeitJobId);
                if (forfeitJobId) {
                    await redisCall(
                        DELETE_JOB_REFERENCE_SCRIPT,
                        [BATTLE_KEYS.forfeitJob(userId)],
                        [forfeitJobId]
                    );
                }
                for (const playerId of snapshot.players) {
                    if (playerId !== userId && playerId !== snapshot.botUserId) {
                        battleNamespace.to(playerId).emit(BATTLE_EVENTS.USER_RECONNECTED, { userId });
                    }
                }
            }
        };

        socket.on(BATTLE_EVENTS.CANCEL_MATCHMAKING, async (payload, acknowledge) => {
            const parsed = cancelSearchPayloadSchema.safeParse(payload);
            if (!parsed.success) {
                if (typeof acknowledge === "function") {
                    acknowledge({ success: false, message: "Matchmaking request ID is invalid." });
                }
                return;
            }

            try {
                const requestId = parsed.data.request_id;
                const result = await cancelMatchmaking(String(userId), requestId);
                if (result.status === "MATCHED") {
                    if (typeof acknowledge === "function") {
                        acknowledge({ success: true, status: "matched", battleId: result.battleId });
                    }
                    return;
                }
                if (result.status === "MATCH_CANCELLED" && !result.isBot && result.opponentId) {
                    socket.nsp.to(result.opponentId).emit(BATTLE_EVENTS.MATCHMAKING_CANCELLED, {
                        battleId: result.battleId,
                        requestId: result.opponentRequestId
                    });
                }
                if (["STALE", "CANCELLED", "IDLE", "MATCH_CANCELLED"].includes(result.status)) {
                    if (typeof acknowledge === "function") {
                        acknowledge({
                            success: true,
                            status: result.status === "STALE" ? "stale" : "cancelled",
                            battleId: result.battleId
                        });
                    }
                    return;
                }
                throw new Error(`Unexpected matchmaking cancellation result: ${result.status}`);
            } catch (error) {
                AppLogger.error("Battle matchmaking cancellation failed", error, {
                    component: "battle-matchmaking",
                    userId,
                    socketId: socket.id
                });
                if (typeof acknowledge === "function") {
                    acknowledge({ success: false, message: "Matchmaking cancellation failed." });
                }
            }
        });

        socket.on(BATTLE_EVENTS.SUBMIT_ANSWER, async (payload, acknowledge) => {
            const parsed = BattleValidator.submitAnswerSchema.safeParse(payload);
            if (!parsed.success) {
                const error = { success: false, message: "Answer payload is invalid." };
                if (typeof acknowledge === "function") acknowledge(error);
                else socket.emit("BATTLE_ERROR", error);
                return;
            }
            try {
                const battleId = await redis.get(BATTLE_KEYS.inBattle(userId));
                if (!battleId) throw new ApiError(409, "You are not currently in a battle.");
                const result = await submitBattleAnswer({
                    battleId,
                    userId,
                    questionIndex: parsed.data.question_index,
                    answer: parsed.data.answer
                });
                if (typeof acknowledge === "function") acknowledge({
                    success: true,
                    correct: result.correct,
                    correct_answer: result.correctAnswer,
                    duplicate: result.duplicate === true
                });
            } catch (error) {
                if (error.statusCode && error.statusCode < 500) {
                    AppLogger.warn("Battle answer submission rejected", {
                        component: "battle-rounds",
                        userId,
                        socketId: socket.id,
                        error: error.message
                    });
                } else {
                    AppLogger.error("Battle answer submission failed", error, {
                        component: "battle-rounds",
                        userId,
                        socketId: socket.id
                    });
                }
                const response = {
                    success: false,
                    message: error.statusCode && error.statusCode < 500
                        ? error.message
                        : "Answer submission failed. Please retry."
                };
                if (typeof acknowledge === "function") acknowledge(response);
                else socket.emit("BATTLE_ERROR", response);
            }
        });

        socket.on(BATTLE_EVENTS.SEND_CHAT_MESSAGE, async (payload, acknowledge) => {
            const parsed = BattleValidator.chatMessageSchema.safeParse(payload);
            if (!parsed.success) {
                if (typeof acknowledge === "function") acknowledge({
                    success: false,
                    message: `Chat message must contain 1 to ${BATTLE_CHAT.MAX_MESSAGE_LENGTH} characters.`
                });
                return;
            }
            try {
                const battleId = await redis.get(BATTLE_KEYS.inBattle(userId));
                if (!battleId) throw new ApiError(409, "You are not currently in a battle.");
                const result = await redisCall(
                    BATTLE_CHAT_SCRIPT,
                    [
                        BATTLE_KEYS.payload(battleId),
                        BATTLE_KEYS.chat(battleId),
                        BATTLE_KEYS.chatRate(battleId, userId),
                        BATTLE_KEYS.inBattle(userId),
                        BATTLE_KEYS.chatMessage(
                            battleId,
                            userId,
                            parsed.data.client_message_id || "legacy"
                        )
                    ],
                    [
                        userId,
                        battleId,
                        String(BATTLE_CHAT.RATE_WINDOW_SECONDS),
                        String(BATTLE_CHAT.RATE_LIMIT),
                        socket.data.user.username || "",
                        socket.data.user.avatar_url || "",
                        parsed.data.message,
                        String(BATTLE_CHAT.HISTORY_LIMIT),
                        String(BATTLE_TTL_SECONDS.BATTLE_STATE),
                        parsed.data.client_message_id || ""
                    ]
                );
                if (result[0] !== "OK" && result[0] !== "DUPLICATE") {
                    const statusCode = result[0] === "RATE_LIMIT" ? 429
                        : result[0] === "NOT_PLAYER" ? 403
                            : result[0] === "NOT_ACTIVE" ? 409 : 404;
                    throw new ApiError(statusCode, result[0] === "RATE_LIMIT"
                        ? "Chat rate limit reached. Try again shortly."
                        : "Chat is not available for this battle.");
                }
                const message = JSON.parse(result[1]);
                if (result[0] === "DUPLICATE") {
                    if (typeof acknowledge === "function") acknowledge({ success: true, message });
                    return;
                }
                const rawState = await redis.get(BATTLE_KEYS.payload(battleId));
                const state = rawState ? JSON.parse(rawState) : null;
                if (!state || !Array.isArray(state.players)) {
                    throw new ApiError(409, "Battle is no longer active.");
                }
                for (const playerId of state.players) {
                    battleNamespace.to(playerId).emit(BATTLE_EVENTS.CHAT_MESSAGE, message);
                }
                if (state.isBot && state.botuserid && state.botuserid !== userId) {
                    const turnResult = await redisCall(
                        COUNT_BOT_CHAT_TURN_SCRIPT,
                        [BATTLE_KEYS.payload(battleId), BATTLE_KEYS.botChatTurns(battleId)],
                        [
                            state.botuserid,
                            userId,
                            String(BATTLE_TTL_SECONDS.BATTLE_STATE)
                        ]
                    );
                    if (turnResult[0] === "CORRUPT") {
                        throw new Error(`Battle ${battleId} state is corrupted.`);
                    }
                    if (turnResult[0] === "OK") {
                        const userTurn = Number(turnResult[1]);
                        const replyChance = getBotReplyChancePercent(userTurn);
                        if (Number.isSafeInteger(userTurn) && randomInt(0, 100) < replyChance) {
                            scheduleBotChatReply(
                                battleId,
                                state.botuserid,
                                userId,
                                parsed.data.message,
                                getBotChatReplyDelay(parsed.data.message.length, userTurn)
                            ).catch((error) => {
                                AppLogger.error("Could not schedule bot chat reply", error, {
                                    component: "battle-bot-chat",
                                    battleId,
                                    userId
                                });
                            });
                        }
                    }
                }
                if (typeof acknowledge === "function") acknowledge({ success: true, message });
            } catch (error) {
                if (!(error instanceof ApiError) || error.statusCode >= 500) {
                    AppLogger.error("Battle chat message could not be processed", error, {
                        component: "battle-chat",
                        userId
                    });
                }
                if (typeof acknowledge === "function") acknowledge({
                    success: false,
                    statusCode: error.statusCode || 500,
                    message: error.statusCode && error.statusCode < 500
                        ? error.message
                        : "Chat message could not be sent."
                });
            }
        });

        socket.on(BATTLE_EVENTS.QUIT_BATTLE, async (_payload, acknowledge) => {
            const ack = typeof _payload === "function" ? _payload : acknowledge;
            try {
                const battleId = await redis.get(BATTLE_KEYS.inBattle(userId));
                if (!battleId) throw new ApiError(409, "You are not currently in a battle.");
                const job = await scheduleBattleForfeit(battleId, userId, socket.id, 0);
                await redis.set(
                    BATTLE_KEYS.forfeitJob(userId),
                    job.id,
                    "EX",
                    BATTLE_TTL_SECONDS.JOB_ID
                );
                if (typeof ack === "function") ack({ success: true });
            } catch (error) {
                AppLogger.error("Could not schedule battle quit", error, {
                    component: "battle-forfeit",
                    userId
                });
                const response = { success: false, message: "Battle quit could not be processed." };
                if (typeof ack === "function") ack(response);
                else socket.emit("BATTLE_ERROR", response);
            }
        });

        

        socket.on("disconnect", () => {
            if (connectedBattleSocketIds.delete(socket.id)) {
                setBattleSocketConnections(connectedBattleSocketIds.size);
            }
            if (heartbeat) clearInterval(heartbeat);
            if (!socket.data.battleOwnershipClaimed) return;

            (async () => {
                let battleId = await redis.get(BATTLE_KEYS.inBattle(userId));
                const released = await redisCall(
                    RELEASE_SOCKET_SCRIPT,
                    [
                        BATTLE_KEYS.socketLock(userId),
                        BATTLE_KEYS.socket(userId),
                        BATTLE_KEYS.inBattle(userId),
                        BATTLE_KEYS.profile(userId)
                    ],
                    [socket.id]
                );
                if (!released) return;
                if (!battleId) battleId = await redis.get(BATTLE_KEYS.inBattle(userId));

                if (battleId) {
                    const forfeitJob = await scheduleBattleForfeit(
                        battleId,
                        userId,
                        socket.id,
                        BATTLE_TTL_SECONDS.FORFEIT_DELAY * 1000
                    );
                    await redis.set(
                        BATTLE_KEYS.forfeitJob(userId),
                        forfeitJob.id,
                        "EX",
                        BATTLE_TTL_SECONDS.JOB_ID
                    );
                    if (await redis.get(BATTLE_KEYS.socket(userId))) {
                        await removeDelayedJob(forfeitJob.id);
                        await redisCall(
                            DELETE_JOB_REFERENCE_SCRIPT,
                            [BATTLE_KEYS.forfeitJob(userId)],
                            [forfeitJob.id]
                        );
                        return;
                    }
                    const rawState = await redis.get(BATTLE_KEYS.payload(battleId));
                    if (rawState) {
                        const state = JSON.parse(rawState);
                        for (const playerId of state.players) {
                            if (playerId !== userId && (!state.isBot || playerId !== state.botuserid)) {
                                battleNamespace.to(playerId).emit(BATTLE_EVENTS.USER_DISCONNECTED, { userId });
                            }
                        }
                    }
                    return;
                }

                const [marker, jobId] = await Promise.all([
                    redis.get(BATTLE_KEYS.waiting(userId)),
                    redis.get(BATTLE_KEYS.matchupWithBotJob(userId))
                ]);
                const cleanedWaiting = await redisCall(
                    CLEAN_WAITING_SCRIPT,
                    [BATTLE_KEYS.waiting(userId), BATTLE_KEYS.matchupWithBotJob(userId)],
                    [userId, marker || "", jobId || ""]
                );
                if (cleanedWaiting) await removeDelayedJob(jobId);
            })().catch((error) => {
                AppLogger.error("Battle socket disconnect cleanup failed", error, {
                    component: "battle-socket",
                    userId,
                    socketId: socket.id
                });
            });
        });

        initialize().catch((error) => {
            AppLogger.error("Failed to initialize battle socket", error, {
                component: "battle-socket",
                userId,
                socketId: socket.id
            });
            socket.emit("BATTLE_ERROR", { message: "Battle connection could not be initialized." });
            socket.disconnect(true);
        });
    });
};

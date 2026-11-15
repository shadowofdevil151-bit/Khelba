import { randomInt, randomUUID } from "node:crypto";
import { ApiError } from "../../utils/ApiError.js";
import { redis } from "../../config/redis.js";
import { mainQueue } from "../../queues/main.queue.js";
import { getBattleNamespace } from "../../socket/index.js";
import { AppLogger } from "../../utils/logger.js";
import { User } from "../../models/user.model.js";
import { BATTLE_EVENTS, BATTLE_FORFEIT, BATTLE_JOBS, BATTLE_TTL_SECONDS } from "./battle.constants.js";
import { getBattleQuestions } from "./battle.questions.js";
import { createBattleState } from "./battle.state.js";
import { scheduleNextQuestion } from "./battle.jobs.js";
import {
    BATTLE_KEYS,
    ACTIVATE_MATCH_SCRIPT,
    CLAIM_FRIEND_MATCH_SCRIPT,
    CLAIM_WAITING_REQUEST_SCRIPT,
    CLEAN_WAITING_SCRIPT,
    MATCH_OR_QUEUE_SCRIPT,
    ROLLBACK_MATCH_SCRIPT,
    STORE_JOB_ID_SCRIPT,
    redisCall
} from "./battle.redis.js";
import { cancelMatchmaking } from "./battle.matchmaking-cancel.js";

const USER_KEY_PREFIX = "battle:user:";

const removeJob = async (jobId) => {
    if (!jobId) return;
    const job = await mainQueue.getJob(jobId);
    if (!job) return;

    const state = await job.getState();
    if (state === "delayed" || state === "waiting" || state === "waiting-children") {
        await job.remove();
    }
};

const queueBotMatchJob = async (userId, queueKey, marker, subjectCode, chapter) => {
    const jobId = `battle-bot-match-${userId}-${marker.slice(-36)}`;
    let job;
    try {
        job = await mainQueue.add(
            BATTLE_JOBS.MATCHUP_WITH_BOT,
            { userId, queueKey, marker, subjectCode, chapter },
            {
                jobId,
                delay: randomInt(
                    BATTLE_TTL_SECONDS.BOT_MATCH_MIN_DELAY,
                    BATTLE_TTL_SECONDS.BOT_MATCH_MAX_DELAY + 1
                ) * 1000,
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
                removeOnComplete: true,
                removeOnFail: true
            }
        );
        
        const stored = await redisCall(
            STORE_JOB_ID_SCRIPT,
            [BATTLE_KEYS.waiting(userId), BATTLE_KEYS.matchupWithBotJob(userId)],
            [marker, job.id, String(BATTLE_TTL_SECONDS.JOB_ID)]
        );
        if (!stored) {
            await removeJob(job.id);
            return false;
        }
        return { status: "waiting" };
    } catch (error) {
        if (job) await removeJob(job.id);
        await redisCall(
            CLEAN_WAITING_SCRIPT,
            [BATTLE_KEYS.waiting(userId), BATTLE_KEYS.matchupWithBotJob(userId)],
            [userId, marker, job?.id || ""]
        );
        throw error;
    }
};

const waitingResponse = (marker) => ({
    statusCode: 202,
    data: { status: "waiting", searchId: marker.slice(marker.lastIndexOf("|") + 1) },
    message: "Searching for an opponent."
});

const emitBattleStarted = async (battleId, players, subjectCode, chapter, questions, options = {}) => {
    if (await redis.exists(BATTLE_KEYS.cancelledBattle(battleId))) return false;
    const state = createBattleState({
        battleId,
        subjectCode,
        chapter,
        questions,
        players,
        isFriendBattle: options.isFriendBattle === true
    });

    await redis.set(
        BATTLE_KEYS.payload(battleId),
        JSON.stringify(state),
        "EX",
        BATTLE_TTL_SECONDS.BATTLE_STATE
    );

    const namespace = getBattleNamespace();
    try {
        const socketIds = await Promise.all(players.map(async (player) => {
            const [socketId, lockId] = await Promise.all([
                redis.get(BATTLE_KEYS.socket(player._id)),
                redis.get(BATTLE_KEYS.socketLock(player._id))
            ]);
            if (!socketId || socketId !== lockId || socketId !== player.socketId) {
                throw new ApiError(409, "A player disconnected while the battle was being created.");
            }
            const connectedSockets = await namespace.in(socketId).fetchSockets();
            if (!connectedSockets.some((socket) => socket.id === socketId)) {
                throw new ApiError(409, "A player disconnected while the battle was being created.");
            }
            return socketId;
        }));
        const activated = await redisCall(
            ACTIVATE_MATCH_SCRIPT,
            [
                ...players.map(({ _id }) => BATTLE_KEYS.inBattle(_id)),
                BATTLE_KEYS.cancelledBattle(battleId)
            ],
            [battleId, String(BATTLE_TTL_SECONDS.BATTLE_STATE)]
        );
        if (!activated) throw new ApiError(409, "Battle match expired before it could start.");

        await scheduleNextQuestion(
            battleId,
            -1,
            BATTLE_TTL_SECONDS.BATTLE_START_DELAY * 1000
        );
        const [cancelled, payloadExists, ...playerBattles] = await Promise.all([
            redis.exists(BATTLE_KEYS.cancelledBattle(battleId)),
            redis.exists(BATTLE_KEYS.payload(battleId)),
            ...players.map(({ _id }) => redis.get(BATTLE_KEYS.inBattle(_id)))
        ]);
        if (cancelled || !payloadExists || playerBattles.some((matchId) => matchId !== battleId)) {
            return false;
        }
        if (await redis.exists(BATTLE_KEYS.cancelledBattle(battleId))) {
            return false;
        }
        players.forEach(({ _id }) => namespace.to(_id).emit(BATTLE_EVENTS.STARTING_BATTLE, {
            battleId,
            yourUserId: _id,
            requestId: options.matchRequestIds?.[_id] || null,
            players: players.map(({ _id, username, tier, avatar_url }) => ({
                userId: _id,
                username,
                tier,
                avatar_url: avatar_url || null,
                isBot: false
            })),
            total_questions: state.total_questions
        }));
        return true;
    } catch (error) {
        const wasCancelled = await redis.exists(BATTLE_KEYS.cancelledBattle(battleId));
        await redisCall(
            ROLLBACK_MATCH_SCRIPT,
            [BATTLE_KEYS.payload(battleId), ...players.map(({ _id }) => BATTLE_KEYS.inBattle(_id))],
            [battleId]
        );
        if (wasCancelled) return false;
        await Promise.all(players.map(async (player) => {
            try {
                namespace.to(player._id).emit("BATTLE_ERROR", {
                    message: "Battle could not be started. Please try again."
                });
            } catch (notifyError) {
                AppLogger.error("Failed to notify player of matchmaking rollback", notifyError, {
                    component: "battle-matchmaking",
                    userId: player._id,
                    battleId
                });
            }
        }));
        throw error;
    }
};

export const BattleService = {
    async start({ user, subjectCode, chapter, requestId }) {
        const userId = user?._id?.toString();
        if (!userId) throw new ApiError(401, "Authentication required.");
        const matchmakingRequestId = requestId || randomUUID();
        if (await redis.exists(BATTLE_KEYS.forfeitBlocked(userId))) {
            throw new ApiError(
                429,
                `Matchmaking is restricted after repeated forfeits. Try again in ${BATTLE_FORFEIT.RESTRICTION_SECONDS / 60} minutes.`
            );
        }

        const [socketId, socketLock] = await Promise.all([
            redis.get(BATTLE_KEYS.socket(userId)),
            redis.get(BATTLE_KEYS.socketLock(userId))
        ]);
        if (!socketId || socketId !== socketLock) {
            throw new ApiError(409, "Connect to the battle socket before matchmaking.");
        }

        const userSockets = await getBattleNamespace().in(socketId).fetchSockets();
        if (!userSockets.some((socket) => socket.id === socketId)) {
            throw new ApiError(409, "The battle socket is no longer connected.");
        }

        const queueKey = BATTLE_KEYS.queue(subjectCode, chapter);
        const battleId = `battle-${randomUUID()}`;
        const [activeBattle, existingQueue] = await Promise.all([
            redis.get(BATTLE_KEYS.inBattle(userId)),
            redis.get(BATTLE_KEYS.waiting(userId))
        ]);
        if (activeBattle) throw new ApiError(409, "You are already in a battle.");
        if (existingQueue) {
            if (!existingQueue.startsWith(`${queueKey}|`)) {
                const activeRequestId = await redis.get(BATTLE_KEYS.searchRequest(userId));
                await cancelMatchmaking(
                    userId,
                    activeRequestId || `orphaned-search-${battleId}`
                );
            }
            if (existingQueue.startsWith(`${queueKey}|`)) {
                const [claimStatus] = await redisCall(
                    CLAIM_WAITING_REQUEST_SCRIPT,
                    [
                        BATTLE_KEYS.waiting(userId),
                        BATTLE_KEYS.cancelRequest(userId, matchmakingRequestId),
                        BATTLE_KEYS.searchRequest(userId)
                    ],
                    [
                        existingQueue,
                        matchmakingRequestId,
                        String(BATTLE_TTL_SECONDS.BATTLE_OPPONENT)
                    ]
                );
                if (claimStatus === "CANCELLED") {
                    throw new ApiError(409, "This matchmaking request was cancelled.");
                }
                if (claimStatus !== "CLAIMED") {
                    throw new ApiError(409, "Matchmaking changed; please retry.");
                }
                const scheduled = await queueBotMatchJob(
                    userId,
                    queueKey,
                    existingQueue,
                    subjectCode,
                    chapter
                );
                if (!scheduled) {
                    const battleId = await redis.get(BATTLE_KEYS.inBattle(userId));
                    if (battleId) {
                        return {
                            statusCode: 200,
                            data: { status: "matched", battleId },
                            message: "Opponent found. Battle is starting."
                        };
                    }
                    throw new ApiError(409, "Matchmaking changed; please retry.");
                }
                return waitingResponse(existingQueue);
            }
        }

        const questions = await getBattleQuestions(subjectCode, chapter);
        const marker = `${queueKey}|${battleId}`;
        const response = await redisCall(
            MATCH_OR_QUEUE_SCRIPT,
            [
                queueKey,
                BATTLE_KEYS.cancelRequest(userId, matchmakingRequestId),
                BATTLE_KEYS.searchRequest(userId)
            ],
            [
                userId,
                battleId,
                marker,
                String(BATTLE_TTL_SECONDS.BATTLE_OPPONENT),
                String(BATTLE_TTL_SECONDS.BATTLE_OPPONENT),
                USER_KEY_PREFIX,
                String(Date.now()),
                matchmakingRequestId
            ]
        );

        if (response[0] === "CANCELLED") {
            throw new ApiError(409, "This matchmaking request was cancelled.");
        }
        if (response[0] === "OFFLINE") throw new ApiError(409, "The battle socket is no longer connected.");
        if (response[0] === "IN_BATTLE") throw new ApiError(409, "You are already in a battle.");
        if (response[0] === "PROFILE_MISSING") throw new ApiError(409, "Battle socket profile is unavailable. Reconnect and try again.");
        if (response[0] === "WAITING" || response[0] === "QUEUED") {
            const waitingMarker = response[1] || marker;
            if (!waitingMarker.startsWith(`${queueKey}|`)) {
                throw new ApiError(409, "You are already searching in another battle queue.");
            }
            const scheduled = await queueBotMatchJob(
                userId,
                queueKey,
                waitingMarker,
                subjectCode,
                chapter
            );
            if (!scheduled) {
                const activeBattle = await redis.get(BATTLE_KEYS.inBattle(userId));
                if (activeBattle) {
                    return {
                        statusCode: 200,
                        data: { status: "matched", battleId: activeBattle },
                        message: "Opponent found. Battle is starting."
                    };
                }
                throw new ApiError(409, "Matchmaking changed; please retry.");
            }
            return waitingResponse(waitingMarker);
        }
        if (response[0] !== "MATCH") {
            throw new Error(`Unexpected matchmaking result: ${response[0]}`);
        }

        const [, matchedBattleId, opponentId, , opponentNoOpponentJob, opponentBotJob,
            requesterProfile, opponentProfile, requesterMatchRequestId, opponentMatchRequestId] = response;
        const players = [];
        try {
            players.push(
                { ...JSON.parse(requesterProfile), socketId },
                { ...JSON.parse(opponentProfile), socketId: response[3] }
            );
            await Promise.all([
                removeJob(opponentNoOpponentJob),
                removeJob(opponentBotJob)
            ]);
            const started = await emitBattleStarted(
                matchedBattleId,
                players,
                subjectCode,
                chapter,
                questions,
                {
                    matchRequestIds: {
                        [userId]: requesterMatchRequestId || matchmakingRequestId,
                        [opponentId]: opponentMatchRequestId || ""
                    }
                }
            );
            if (!started) {
                return {
                    statusCode: 200,
                    data: { status: "cancelled", battleId: matchedBattleId },
                    message: "Matchmaking was cancelled."
                };
            }
        } catch (error) {
            await redisCall(
                ROLLBACK_MATCH_SCRIPT,
                [
                    BATTLE_KEYS.payload(matchedBattleId),
                    BATTLE_KEYS.inBattle(userId),
                    BATTLE_KEYS.inBattle(opponentId)
                ],
                [matchedBattleId]
            );
            throw error;
        }

        return {
            statusCode: 200,
            data: { status: "matched", battleId: matchedBattleId },
            message: "Opponent found. Battle is starting."
        };
    },
    async cancelSearch({ user, requestId }) {
        const userId = user?._id?.toString();
        if (!userId) throw new ApiError(401, "Authentication required.");
        if (!requestId) throw new ApiError(400, "A matchmaking request ID is required.");

        const result = await cancelMatchmaking(userId, requestId);

        if (result.status === "MATCHED") {
            return {
                statusCode: 200,
                data: { status: "matched", battleId: result.battleId },
                message: "A match was found before matchmaking could be cancelled."
            };
        }
        if (result.status === "MATCH_CANCELLED") {
            if (!result.isBot && result.opponentId) {
                getBattleNamespace().to(result.opponentId).emit(BATTLE_EVENTS.MATCHMAKING_CANCELLED, {
                    battleId: result.battleId,
                    requestId: result.opponentRequestId
                });
            }
            return {
                statusCode: 200,
                data: { status: "cancelled", battleId: result.battleId },
                message: "Matchmaking was cancelled."
            };
        }
        if (result.status === "STALE") {
            return {
                statusCode: 200,
                data: { status: "stale" },
                message: "This matchmaking request is no longer active."
            };
        }
        return {
            statusCode: 200,
            data: { status: "cancelled" },
            message: "Matchmaking was cancelled."
        };
    },
    async startFriend({ requesterId, opponentId, subjectCode, chapter }) {
        if (String(requesterId) === String(opponentId)) throw new ApiError(400, "A player cannot challenge themselves.");
        const [requester, opponent] = await Promise.all([
            User.findById(requesterId).select("_id username tier avatar profile"),
            User.findById(opponentId).select("_id username tier avatar profile")
        ]);
        if (!requester || !opponent) throw new ApiError(404, "Battle player not found.");
        const [requesterSocket, opponentSocket, requesterBattle, opponentBattle] = await Promise.all([
            redis.get(BATTLE_KEYS.socket(requesterId)),
            redis.get(BATTLE_KEYS.socket(opponentId)),
            redis.get(BATTLE_KEYS.inBattle(requesterId)),
            redis.get(BATTLE_KEYS.inBattle(opponentId))
        ]);
        if (!requesterSocket || !opponentSocket) throw new ApiError(409, "Both players must be connected to the battle socket.");
        if (requesterBattle || opponentBattle) throw new ApiError(409, "A player is already in a battle.");
        const questions = await getBattleQuestions(subjectCode, chapter);
        const battleId = `battle-${randomUUID()}`;
        const claimed = await redisCall(
            CLAIM_FRIEND_MATCH_SCRIPT,
            [BATTLE_KEYS.inBattle(requesterId), BATTLE_KEYS.inBattle(opponentId)],
            [battleId, String(BATTLE_TTL_SECONDS.BATTLE_STATE)]
        );
        if (!claimed) throw new ApiError(409, "A player is already in a battle.");
        const started = await emitBattleStarted(battleId, [
            { _id: requester._id.toString(), username: requester.username, tier: requester.tier, avatar_url: requester.avatar?.url, socketId: requesterSocket },
            { _id: opponent._id.toString(), username: opponent.username, tier: opponent.tier, avatar_url: opponent.avatar?.url, socketId: opponentSocket }
        ], subjectCode, chapter, questions, { isFriendBattle: true });
        if (!started) throw new ApiError(409, "Friend battle could not be started.");
        return { battleId };
    }
};

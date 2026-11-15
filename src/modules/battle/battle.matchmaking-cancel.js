import { mainQueue } from "../../queues/main.queue.js";
import { AppLogger } from "../../utils/logger.js";
import { BATTLE_BOT_POOL_KEY, BATTLE_TTL_SECONDS } from "./battle.constants.js";
import { BATTLE_KEYS, CANCEL_MATCHMAKING_SCRIPT, redisCall } from "./battle.redis.js";

const removeJob = async (jobId) => {
    const job = await mainQueue.getJob(jobId);
    if (!job) return;

    const state = await job.getState();
    if (state === "delayed" || state === "waiting" || state === "waiting-children") {
        await job.remove();
    }
};

const removeJobs = async (jobIds, userId, requestId) => {
    await Promise.all(jobIds.filter(Boolean).map(async (jobId) => {
        try {
            await removeJob(jobId);
        } catch (error) {
            AppLogger.error("Could not remove a cancelled matchmaking job", error, {
                component: "battle-matchmaking",
                userId,
                requestId,
                jobId
            });
        }
    }));
};

export async function cancelMatchmaking(userId, requestId, retryStale = true) {
    const result = await redisCall(
        CANCEL_MATCHMAKING_SCRIPT,
        [
            BATTLE_KEYS.waiting(userId),
            BATTLE_KEYS.inBattle(userId),
            BATTLE_KEYS.noOpponentJob(userId),
            BATTLE_KEYS.matchupWithBotJob(userId),
            BATTLE_KEYS.cancelRequest(userId, requestId),
            BATTLE_KEYS.searchRequest(userId),
            BATTLE_KEYS.matchRequest(userId),
            BATTLE_KEYS.matchOpponent(userId),
            BATTLE_KEYS.matchIsBot(userId),
            BATTLE_BOT_POOL_KEY
        ],
        [userId, requestId, String(BATTLE_TTL_SECONDS.MATCHMAKING_CANCEL)]
    );
    const [status, ...details] = result;

    if (status === "MATCHED") {
        return { status, battleId: details[0] };
    }
    if (status === "MATCH_CANCELLED") {
        const [battleId, opponentId, opponentRequestId, isBot] = details;
        await removeJobs([`battle-next-${battleId}-0`], userId, requestId);
        return {
            status,
            battleId,
            opponentId,
            opponentRequestId,
            isBot: isBot === "1"
        };
    }
    if (status === "STALE") {
        const activeRequestId = details[0];
        if (
            retryStale &&
            activeRequestId &&
            activeRequestId !== requestId
        ) {
            return cancelMatchmaking(userId, activeRequestId, false);
        }
        return { status, activeRequestId };
    }
    if (status !== "CANCELLED" && status !== "IDLE") {
        throw new Error(`Unexpected matchmaking cancellation result: ${status}`);
    }

    await removeJobs(details, userId, requestId);
    return { status };
}

import mongoose from "mongoose";
import { redis } from "../../../config/redis.js";
import { mainQueue } from "../../../queues/main.queue.js";
import { AppLogger } from "../../../utils/logger.js";
import { BattleHistory } from "../../../models/battleHistory.model.js";
import { BattleReport } from "../../../models/battleReport.model.js";
import { compressBotReport } from "./bot-report.js";
import {
    BATTLE_BOT_POOL_KEY,
    BATTLE_EVENTS,
    BATTLE_FORFEIT,
    BATTLE_TTL_SECONDS,
    BATTLE_TIMEZONE
} from "../../../modules/battle/battle.constants.js";
import {
    BATTLE_KEYS,
    FINALIZE_BATTLE_CLEANUP_SCRIPT,
    FORFEIT_BATTLE_SCRIPT,
    redisCall
} from "../../../modules/battle/battle.redis.js";
import { calculateBattleResult } from "../../../modules/battle/battle.scoring.js";
import { scheduleBattleFinalization } from "../../../modules/battle/battle.jobs.js";
import { emitBattlePlayers } from "./socketEmitter.js";
import { calculateStreak } from "../../../utils/streak.js";

const updateReport = async ({ userId, result, date, isBot }, session) => {
    let report = await BattleReport.findOne({ user_id: userId }).session(session);
    if (!report) report = new BattleReport({ user_id: userId });
    if (!report.battle_count) report.battle_count = {};
    for (const count of ["total", "draw", "losses", "win"]) {
        report.battle_count[count] = Number.isFinite(Number(report.battle_count[count]))
            ? Number(report.battle_count[count])
            : 0;
    }
    if (!report.streak) {
        report.streak = {
            currentStreak: 0,
            longest_streak: 0,
            lastMatchDate: null,
            timezone: BATTLE_TIMEZONE
        };
    }
    if (!report.performance) report.performance = {};
    for (const metric of [
        "answered_questions",
        "correct_answers",
        "wrong_answers",
        "timed_out_answers",
        "total_answer_time",
        "accuracy"
    ]) {
        if (!Number.isFinite(Number(report.performance[metric]))) report.performance[metric] = 0;
    }

    report.battle_count.total += 1;
    report.battle_count[result.outcome === "win"
        ? "win"
        : result.outcome === "draw" ? "draw" : "losses"] += 1;
    const currentPoints = Number.isFinite(Number(report.battle_points))
        ? Number(report.battle_points)
        : 0;
    report.battle_points = Math.max(
        0,
        Math.round((currentPoints + result.matchPoints - (result.forfeitPenalty || 0)) * 100) / 100
    );
    const performance = report.performance;
    performance.answered_questions += result.answeredQuestions;
    performance.correct_answers += result.correctAnswers;
    performance.wrong_answers += result.wrongAnswers - result.timedOutAnswers;
    performance.timed_out_answers += result.timedOutAnswers;
    performance.total_answer_time = Math.round(
        (performance.total_answer_time + result.answerTimeUsed) * 100
    ) / 100;
    performance.accuracy = performance.answered_questions
        ? Math.round((performance.correct_answers / performance.answered_questions) * 10000) / 100
        : 0;
    Object.assign(report.streak, calculateStreak(report.streak, date, BATTLE_TIMEZONE));
    if (isBot) compressBotReport(report);
    await report.save({ session });
};

const persistBattle = async (state) => {
    const finalizedAt = new Date();
    const forcedWinner = state.isForfeit
        ? state.players.find((userId) => userId !== state.forfeitedUserId)
        : null;
    const result = calculateBattleResult(state, forcedWinner);
    if (state.isFriendBattle && result.winner !== "DRAW") {
        const hasZeroScore = state.players.some((userId) => Number(state.scores[userId]) === 0);
        if (hasZeroScore && result.playerResults[result.winner]) {
            result.playerResults[result.winner].matchPoints = Math.round(result.playerResults[result.winner].matchPoints / 2);
        }
    }
    if (state.isForfeit && result.playerResults[state.forfeitedUserId]) {
        result.playerResults[state.forfeitedUserId].forfeitPenalty = BATTLE_FORFEIT.POINT_PENALTY;
    }
    const document = {
        battleId: state.battleId,
        subject_code: state.subject_code,
        chapter: state.chapter,
        questions: state.questions,
        players: state.players,
        scores: result.scores,
        players_answers: state.players_answers,
        winner: result.winner,
        players_answers_durations: state.players_answered_durations,
        player_results: result.playerResults,
        botuserid: state.botuserid,
        isBot: state.isBot,
        isForfeit: state.isForfeit,
        forfeitedUserId: state.forfeitedUserId,
        finalizedAt
    };
    const session = await mongoose.startSession();
    let inserted = false;
    try {
        await session.withTransaction(async () => {
            const existing = await BattleHistory.findOne({ battleId: state.battleId })
                .session(session)
                .select("_id");
            if (existing) return;

            await BattleHistory.create([document], { session });
            for (const userId of state.players) {
                await updateReport({
                    userId,
                    result: result.playerResults[userId],
                    date: finalizedAt,
                    isBot: state.isBot && userId === state.botuserid
                }, session);
            }
            inserted = true;
        });
    } catch (error) {
        if (error?.code !== 11000) throw error;
        const existing = await BattleHistory.findOne({ battleId: state.battleId }).select("_id");
        if (!existing) throw error;
    } finally {
        await session.endSession();
    }

    return { result, inserted };
};

const removePendingJob = async (jobId) => {
    const job = await mainQueue.getJob(jobId);
    if (!job) return;
    if (["delayed", "waiting", "waiting-children"].includes(await job.getState())) {
        await job.remove();
    }
};

const cleanupBattleJobs = async (state) => {
    const jobs = [];
    for (let index = 0; index < state.total_questions; index += 1) {
        jobs.push(
            removePendingJob(`battle-timeout-${state.battleId}-${index}`),
            removePendingJob(`battle-bot-answer-${state.battleId}-${index}`)
        );
    }
    for (let index = 0; index <= state.total_questions; index += 1) {
        jobs.push(removePendingJob(`battle-next-${state.battleId}-${index}`));
    }
    for (const userId of state.players) {
        jobs.push(removePendingJob(`battle-forfeit-${state.battleId}-${userId}`));
    }
    await Promise.all(jobs);
};

export const forfeitBattle = async ({
    battleId,
    forfeitedUserId,
    expectedSocketId,
    isVoluntary = false
} = {}) => {
    if (typeof battleId !== "string" || typeof forfeitedUserId !== "string") {
        throw new TypeError("Forfeit job payload is invalid.");
    }
    const result = await redisCall(
        FORFEIT_BATTLE_SCRIPT,
        [
            BATTLE_KEYS.payload(battleId),
            BATTLE_KEYS.socket(forfeitedUserId),
            BATTLE_KEYS.socketLock(forfeitedUserId),
            BATTLE_KEYS.forfeitCount(forfeitedUserId),
            BATTLE_KEYS.forfeitBlocked(forfeitedUserId)
        ],
        [
            forfeitedUserId,
            expectedSocketId || "",
            isVoluntary ? "1" : "0",
            String(BATTLE_TTL_SECONDS.BATTLE_STATE),
            String(BATTLE_FORFEIT.WINDOW_SECONDS),
            String(BATTLE_FORFEIT.LIMIT),
            String(BATTLE_FORFEIT.RESTRICTION_SECONDS)
        ]
    );
    if (["MISSING", "RECONNECTED", "NOT_PLAYER", "NOT_ACTIVE"].includes(result[0])) return;
    if (result[0] === "CORRUPT") throw new Error(`Battle ${battleId} state is corrupted.`);

    const state = result[0] === "OK"
        ? JSON.parse(result[1])
        : result[0] === "DONE"
            ? JSON.parse(await redis.get(BATTLE_KEYS.payload(battleId)) || "null")
            : null;
    if (!state || state.phase !== "finalizing") return;
    emitBattlePlayers(state, BATTLE_EVENTS.FORFEITING_BATTLE, {
        battleId,
        forfeitedUserId
    });
    await scheduleBattleFinalization(battleId);
};

export const finalizeBattle = async ({ battleId } = {}) => {
    if (typeof battleId !== "string") throw new TypeError("Finalization job payload is invalid.");
    const raw = await redis.get(BATTLE_KEYS.payload(battleId));
    if (!raw) return;

    let state;
    try {
        state = JSON.parse(raw);
    } catch (error) {
        AppLogger.error("Battle finalization found corrupt state", error, {
            component: "battle-finalization",
            battleId
        });
        throw error;
    }
    if (state.phase !== "finalizing" && state.phase !== "finalized") return;

    const { result, inserted } = await persistBattle(state);
    await cleanupBattleJobs(state);
    const cleanup = await redisCall(
        FINALIZE_BATTLE_CLEANUP_SCRIPT,
        [
            BATTLE_KEYS.payload(battleId),
            ...state.players.map((userId) => BATTLE_KEYS.inBattle(userId)),
            ...state.players.map((userId) => BATTLE_KEYS.forfeitJob(userId)),
            BATTLE_BOT_POOL_KEY,
            BATTLE_KEYS.chat(battleId),
            BATTLE_KEYS.botChatState(battleId),
            BATTLE_KEYS.botChatPending(battleId),
            BATTLE_KEYS.botChatTurns(battleId)
        ],
        [
            battleId,
            String(BATTLE_TTL_SECONDS.BATTLE_STATE),
            `battle-forfeit-${battleId}-`
        ]
    );
    if (cleanup[0] !== "OK") {
        throw new Error(`Battle ${battleId} could not be cleaned after persistence.`);
    }

    if (state.isBot && state.botuserid) {
        emitBattlePlayers(state, BATTLE_EVENTS.DISPLAY_TYPING, {
            userId: state.botuserid,
            isTyping: false
        });
    }
    emitBattlePlayers(state, BATTLE_EVENTS.FINALIZE_BATTLE, {
        battleId,
        winner: result.winner,
        scores: result.scores,
        playerResults: result.playerResults,
        isForfeit: state.isForfeit
    });
    AppLogger.info("Battle finalized and persisted", {
        component: "battle-finalization",
        battleId,
        inserted
    });
};

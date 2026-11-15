import { randomUUID } from "node:crypto";
import { createBotAnswerPlan } from "../../../modules/battle/battle.bot.js";
import { createBotChatProfile } from "../../../modules/battle/battle.bot-chat.dialogues.js";
import mongoose from "mongoose";
import { User } from "../../../models/user.model.js";
import { redis } from "../../../config/redis.js";
import { AppLogger } from "../../../utils/logger.js";
import {
    BATTLE_EVENTS,
    BATTLE_BOT_POOL_KEY,
    BATTLE_TTL_SECONDS
} from "../../../modules/battle/battle.constants.js";
import { getBattleQuestions } from "../../../modules/battle/battle.questions.js";
import { createBattleState } from "../../../modules/battle/battle.state.js";
import {
    scheduleNextQuestion
} from "../../../modules/battle/battle.jobs.js";
import {
    BATTLE_KEYS,
    ACTIVATE_MATCH_SCRIPT,
    CLEAN_WAITING_SCRIPT,
    FINISH_NO_OPPONENT_SCRIPT,
    MATCH_WITH_BOT_SCRIPT,
    RESTORE_BOT_MATCH_SCRIPT,
    ROLLBACK_MATCH_SCRIPT,
    redisCall
} from "../../../modules/battle/battle.redis.js";
import { emitBattlePlayers, emitBattleRoomEvent } from "./socketEmitter.js";

const USER_KEY_PREFIX = "battle:user:";

const notifyNoOpponent = (userId, marker) => {
    emitBattleRoomEvent(userId, BATTLE_EVENTS.NO_OPPONENT_FOUND, {
        searchId: marker.slice(marker.lastIndexOf("|") + 1)
    });
};

export const matchWithBot = async (
    { userId, queueKey, marker, subjectCode, chapter } = {},
    job
) => {
    if (
        typeof userId !== "string" ||
        typeof queueKey !== "string" ||
        typeof marker !== "string" ||
        typeof subjectCode !== "string" ||
        !Number.isSafeInteger(chapter) ||
        queueKey !== BATTLE_KEYS.queue(subjectCode, chapter) ||
        !marker.startsWith(`${queueKey}|`)
    ) {
        throw new TypeError("Bot matchmaking job payload is invalid.");
    }

    const battleId = `battle-${randomUUID()}`;
    const result = await redisCall(
        MATCH_WITH_BOT_SCRIPT,
        [
            BATTLE_KEYS.waiting(userId),
            BATTLE_KEYS.matchupWithBotJob(userId),
            BATTLE_BOT_POOL_KEY
        ],
        [
            marker,
            userId,
            battleId,
            USER_KEY_PREFIX,
            String(BATTLE_TTL_SECONDS.BATTLE_OPPONENT)
        ]
    );

    if (result[0] === "STALE" || result[0] === "IN_BATTLE") return;
    if (result[0] === "OFFLINE") return;
    if (result[0] === "NO_BOT") {
        notifyNoOpponent(userId, marker);
        AppLogger.info("No battle opponent or available bot was found", {
            component: "battle-matchmaking",
            userId
        });
        return;
    }
    if (result[0] === "PROFILE_MISSING") {
        await redisCall(
            CLEAN_WAITING_SCRIPT,
            [BATTLE_KEYS.waiting(userId), BATTLE_KEYS.matchupWithBotJob(userId)],
            [userId, marker, job?.id || ""]
        );
        notifyNoOpponent(userId, marker);
        return;
    }
    if (result[0] !== "MATCH") {
        throw new Error(`Unexpected bot matchmaking result: ${result[0]}`);
    }

    const [, botUserId, socketId, requesterProfileJson] = result;
    let restoreOnFailure = true;
    try {
        if (!mongoose.isValidObjectId(botUserId)) {
            await redis.srem(BATTLE_BOT_POOL_KEY, botUserId);
            await redisCall(
                ROLLBACK_MATCH_SCRIPT,
                [
                    BATTLE_KEYS.payload(battleId),
                    BATTLE_KEYS.inBattle(userId),
                    BATTLE_KEYS.inBattle(botUserId)
                ],
                [battleId]
            );
            restoreOnFailure = false;
            notifyNoOpponent(userId, marker);
            AppLogger.error("Configured battle bot ID is invalid", new Error("Invalid bot pool entry."), {
                component: "battle-matchmaking",
                botUserId
            });
            return;
        }

        const bot = await User.findOne({
            _id: botUserId,
            status: "ACTIVE"
        }).select("_id username tier avatar");
        if (!bot) {
            await redis.srem(BATTLE_BOT_POOL_KEY, botUserId);
            await redisCall(
                ROLLBACK_MATCH_SCRIPT,
                [
                    BATTLE_KEYS.payload(battleId),
                    BATTLE_KEYS.inBattle(userId),
                    BATTLE_KEYS.inBattle(botUserId)
                ],
                [battleId]
            );
            restoreOnFailure = false;
            notifyNoOpponent(userId, marker);
            AppLogger.error("Configured battle bot is missing or inactive", new Error("Invalid bot pool entry."), {
                component: "battle-matchmaking",
                botUserId
            });
            return;
        }

        const [questions, requesterProfile] = await Promise.all([
            getBattleQuestions(subjectCode, chapter),
            Promise.resolve(JSON.parse(requesterProfileJson))
        ]);
        const botProfile = {
            _id: bot._id.toString(),
            username: bot.username,
            tier: bot.tier,
            avatar_url: bot.avatar?.url || null
        };

        const players = [requesterProfile, botProfile];
        const state = createBattleState({
            battleId,
            subjectCode,
            chapter,
            questions,
            players,
            botUserId: botProfile._id,
            botCorrectQuestionIndexes: createBotAnswerPlan(questions.length),
            botChatProfile: createBotChatProfile()
        });
        await redis.set(
            BATTLE_KEYS.payload(battleId),
            JSON.stringify(state),
            "EX",
            BATTLE_TTL_SECONDS.BATTLE_STATE
        );
        const activated = await redisCall(
            ACTIVATE_MATCH_SCRIPT,
            [
                BATTLE_KEYS.inBattle(userId),
                BATTLE_KEYS.inBattle(botUserId),
                BATTLE_KEYS.cancelledBattle(battleId)
            ],
            [battleId, String(BATTLE_TTL_SECONDS.BATTLE_STATE)]
        );
        if (!activated) {
            throw new ApiError(409, "Bot battle reservation expired before it could start.");
        }
        await scheduleNextQuestion(
            battleId,
            -1,
            BATTLE_TTL_SECONDS.BATTLE_START_DELAY * 1000
        );
        if (await redis.exists(BATTLE_KEYS.cancelledBattle(battleId))) return;

        emitBattlePlayers(state, BATTLE_EVENTS.STARTING_BATTLE, (yourUserId) => ({
            battleId,
            yourUserId,
            requestId: yourUserId === userId ? result[4] || null : null,
            players: players.map((player) => ({
                userId: player._id,
                username: player.username,
                tier: player.tier,
                avatar_url: player.avatar_url,
                isBot: player._id === botProfile._id
            })),
            total_questions: state.total_questions
        }));
        restoreOnFailure = false;
        AppLogger.info("Battle matched with a configured bot", {
            component: "battle-matchmaking",
            userId,
            botUserId,
            battleId
        });
    } catch (error) {
        if (error.statusCode && error.statusCode < 500) {
            const wasCancelled = await redis.exists(BATTLE_KEYS.cancelledBattle(battleId));
            await redis.del(BATTLE_KEYS.payload(battleId));
            await redisCall(
                ROLLBACK_BOT_MATCH_SCRIPT,
                [
                    BATTLE_KEYS.inBattle(userId),
                    BATTLE_KEYS.inBattle(botUserId),
                    BATTLE_BOT_POOL_KEY
                ],
                [battleId, botUserId]
            );
            restoreOnFailure = false;
            if (!wasCancelled) {
                emitBattleRoomEvent(userId, BATTLE_EVENTS.BATTLE_ERROR, {
                    message: "Battle could not be started. Please try again."
                });
            }
            return;
        }
        if (restoreOnFailure) {
            await redis.del(BATTLE_KEYS.payload(battleId));
            const jobId = job?.id
                || `battle-bot-match-${userId}-${marker.slice(-36)}`;
            await redisCall(
                RESTORE_BOT_MATCH_SCRIPT,
                [
                    BATTLE_KEYS.inBattle(userId),
                    BATTLE_KEYS.inBattle(botUserId),
                    BATTLE_BOT_POOL_KEY,
                    BATTLE_KEYS.waiting(userId),
                    queueKey,
                    BATTLE_KEYS.matchupWithBotJob(userId),
                    BATTLE_KEYS.cancelRequest(userId, result[4] || ""),
                    BATTLE_KEYS.searchRequest(userId)
                ],
                [
                    battleId,
                    botUserId,
                    marker,
                    String(BATTLE_TTL_SECONDS.BATTLE_OPPONENT),
                    String(Date.now()),
                    userId,
                    jobId,
                    String(BATTLE_TTL_SECONDS.JOB_ID),
                    result[4] || ""
                ]
            );
            const attempts = Number(job?.opts?.attempts || 1);
            if (job && job.attemptsMade + 1 >= attempts) {
                const cleaned = await redisCall(
                    CLEAN_WAITING_SCRIPT,
                    [BATTLE_KEYS.waiting(userId), BATTLE_KEYS.matchupWithBotJob(userId)],
                    [userId, marker, jobId]
                );
                if (cleaned) {
                    emitBattleRoomEvent(userId, BATTLE_EVENTS.BATTLE_ERROR, {
                        message: "Matchmaking is temporarily unavailable. Please try again."
                    });
                }
                AppLogger.error("Bot matchmaking exhausted its retry attempts", error, {
                    component: "battle-matchmaking",
                    userId,
                    battleId,
                    attempts
                });
                return;
            }
        }
        throw error;
    }
};

export const finishNoOpponentSearch = async ({ userId, queueKey, marker } = {}) => {
    if (typeof userId !== "string" || typeof queueKey !== "string" || typeof marker !== "string") {
        throw new TypeError("Legacy no-opponent job payload is invalid.");
    }
    const finished = await redisCall(
        FINISH_NO_OPPONENT_SCRIPT,
        [
            BATTLE_KEYS.waiting(userId),
            BATTLE_KEYS.noOpponentJob(userId),
            queueKey
        ],
        [marker, userId]
    );
    if (finished) notifyNoOpponent(userId, marker);
};

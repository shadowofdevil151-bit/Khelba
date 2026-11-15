import { randomInt } from "node:crypto";
import { mainQueue } from "../../../queues/main.queue.js";
import { redis } from "../../../config/redis.js";
import { AppLogger } from "../../../utils/logger.js";
import {
    BATTLE_ANSWER_KEYS,
    BATTLE_EVENTS,
    BATTLE_TTL_SECONDS
} from "../../../modules/battle/battle.constants.js";
import { sanitizeQuestion } from "../../../modules/battle/battle.questions.js";
import {
    ADVANCE_BATTLE_ROUND_SCRIPT,
    BATTLE_KEYS,
    SUBMIT_BATTLE_ANSWER_SCRIPT,
    TIMEOUT_BATTLE_ROUND_SCRIPT,
    redisCall
} from "../../../modules/battle/battle.redis.js";
import {
    scheduleBattleFinalization,
    scheduleBotAnswer,
    scheduleBotProactiveChat,
    scheduleNextQuestion,
    scheduleRoundTimeout
} from "../../../modules/battle/battle.jobs.js";
import { recordBattleAnswer } from "../../../modules/battle/battle.answers.js";
import { emitBattlePlayers } from "./socketEmitter.js";

const getState = async (battleId) => {
    const raw = await redis.get(BATTLE_KEYS.payload(battleId));
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (error) {
        AppLogger.error("Battle worker found corrupt Redis state", error, {
            component: "battle-rounds",
            battleId
        });
        throw error;
    }
};

const removeRoundTimeout = async (battleId, questionIndex) => {
    const jobId = `battle-timeout-${battleId}-${questionIndex}`;
    const job = await mainQueue.getJob(jobId);
    if (!job) return;
    const jobState = await job.getState();
    if (["delayed", "waiting", "waiting-children"].includes(jobState)) {
        await job.remove();
    }
};

export const advanceBattleQuestion = async ({ battleId, expectedIndex } = {}) => {
    if (typeof battleId !== "string" || !Number.isInteger(expectedIndex)) {
        throw new TypeError("Next-question job payload is invalid.");
    }

    const result = await redisCall(
        ADVANCE_BATTLE_ROUND_SCRIPT,
        [BATTLE_KEYS.payload(battleId)],
        [
            String(expectedIndex),
            String(BATTLE_TTL_SECONDS.BATTLE_STATE),
            String(BATTLE_TTL_SECONDS.ROUND_TIMEOUT)
        ]
    );
    if (result[0] === "MISSING" || result[0] === "STALE" || result[0] === "NOT_ACTIVE") return;
    if (result[0] === "CORRUPT") throw new Error(`Battle ${battleId} state is corrupted.`);
    if (result[0] === "WAITING") return;
    if (result[0] === "DONE") {
        await scheduleBattleFinalization(battleId);
        return;
    }
    if (!["OK", "REPLAY"].includes(result[0])) {
        throw new Error(`Unexpected next-question result: ${result[0]}`);
    }

    const state = JSON.parse(result[1]);
    const index = state.current_index;
    const question = state.questions[index];
    if (!question) throw new Error(`Question ${index} is missing from battle ${battleId}.`);

    await removeRoundTimeout(battleId, index - 1);
    await scheduleRoundTimeout(
        battleId,
        index,
        result[0] === "REPLAY"
            ? Math.max(0, Number(result[2]))
            : BATTLE_TTL_SECONDS.ROUND_TIMEOUT * 1000
    );
    if (state.isBot) {
        const delay = randomInt(
            BATTLE_TTL_SECONDS.BOT_ANSWER_MIN_DELAY,
            BATTLE_TTL_SECONDS.BOT_ANSWER_MAX_DELAY + 1
        );
        await scheduleBotAnswer(battleId, index, delay * 1000);
        if (state.bot_can_proactively_chat && index > 0) {
            const completedRound = index - 1;
            await scheduleBotProactiveChat(
                battleId,
                `round-result-${completedRound}`,
                "round_result",
                completedRound
            ).catch((error) => {
                AppLogger.error("Could not schedule bot round-result chat", error, {
                    component: "battle-bot-chat",
                    battleId,
                    roundIndex: completedRound
                });
            });
        }
        if (state.bot_can_proactively_chat && index === 0) {
            await scheduleBotProactiveChat(battleId, "opening", "greeting").catch((error) => {
                AppLogger.error("Could not schedule bot opening chat", error, {
                    component: "battle-bot-chat",
                    battleId
                });
            });
        } else if (state.bot_can_proactively_chat && index === 4) {
            await scheduleBotProactiveChat(battleId, "mid-game", "game_state").catch((error) => {
                AppLogger.error("Could not schedule bot mid-game chat", error, {
                    component: "battle-bot-chat",
                    battleId
                });
            });
        } else if (state.bot_can_proactively_chat && index === 8) {
            await scheduleBotProactiveChat(battleId, "final-question", "close_call").catch((error) => {
                AppLogger.error("Could not schedule bot final-question chat", error, {
                    component: "battle-bot-chat",
                    battleId
                });
            });
        }
    }
    emitBattlePlayers(state, BATTLE_EVENTS.NEXT_QUESTION, {
        battleId,
        index,
        question: sanitizeQuestion(question),
        timeout_seconds: BATTLE_TTL_SECONDS.ROUND_TIMEOUT
    });
};

export const timeoutBattleRound = async ({ battleId, questionIndex } = {}) => {
    if (typeof battleId !== "string" || !Number.isInteger(questionIndex)) {
        throw new TypeError("Round-timeout job payload is invalid.");
    }
    const result = await redisCall(
        TIMEOUT_BATTLE_ROUND_SCRIPT,
        [BATTLE_KEYS.payload(battleId)],
        [
            String(questionIndex),
            String(BATTLE_TTL_SECONDS.ROUND_TIMEOUT),
            String(BATTLE_TTL_SECONDS.BATTLE_STATE)
        ]
    );
    if (["MISSING", "STALE"].includes(result[0])) return;
    if (result[0] === "CORRUPT") throw new Error(`Battle ${battleId} state is corrupted.`);
    const state = await getState(battleId);
    if (!state) return;

    if (result[0] === "OK") {
        emitBattlePlayers(state, BATTLE_EVENTS.ROUND_TIMEOUT, {
            battleId,
            question_index: questionIndex,
            unanswered: JSON.parse(result[1])
        });
    } else if (result[0] !== "RESOLVED") {
        throw new Error(`Unexpected round-timeout result: ${result[0]}`);
    }
    await scheduleNextQuestion(
        battleId,
        questionIndex,
        result[0] === "RESOLVED"
            ? BATTLE_TTL_SECONDS.ROUND_TURN_DELAY * 1000
            : 0
    );
};

export const submitBotAnswer = async ({ battleId, questionIndex } = {}) => {
    if (typeof battleId !== "string" || !Number.isInteger(questionIndex)) {
        throw new TypeError("Bot-answer job payload is invalid.");
    }
    const state = await getState(battleId);
    if (!state?.isBot || state.current_index !== questionIndex || state.phase !== "active") return;
    const botUserId = state.botuserid;
    const question = state.questions[questionIndex];
    const validOptions = BATTLE_ANSWER_KEYS.slice(0, question?.options?.length || 0);
    if (validOptions.length !== BATTLE_ANSWER_KEYS.length) {
        throw new Error(`Bot question ${questionIndex} does not have four valid options.`);
    }
    const shouldAnswerCorrectly =
        state.bot_correct_question_indexes?.includes(questionIndex) === true;
    const wrongAnswers = validOptions.filter((option) => option !== question.answer);
    if (!shouldAnswerCorrectly && !wrongAnswers.length) {
        throw new Error(`Bot question ${questionIndex} has no incorrect option.`);
    }
    const answer = shouldAnswerCorrectly
        ? question.answer
        : wrongAnswers[randomInt(wrongAnswers.length)];

    let result;
    try {
        result = await recordBattleAnswer({
            battleId,
            userId: botUserId,
            questionIndex,
            answer
        });
    } catch (error) {
        if (error.statusCode === 409 || error.statusCode === 404) return;
        throw error;
    }
    if (result.answeredCount === result.playerCount) {
        await scheduleNextQuestion(
            battleId,
            questionIndex,
            BATTLE_TTL_SECONDS.ROUND_TURN_DELAY * 1000
        );
    }
    emitBattlePlayers(state, BATTLE_EVENTS.PLAYER_ANSWERED, (playerId) => ({
        userId: botUserId,
        question_index: questionIndex,
        correct: playerId !== botUserId ? result.correct : undefined
    }));
};

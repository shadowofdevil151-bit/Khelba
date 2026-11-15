import { redis } from "../../config/redis.js";
import { getBattleNamespace } from "../../socket/index.js";
import { AppLogger } from "../../utils/logger.js";
import { BATTLE_EVENTS, BATTLE_TTL_SECONDS } from "./battle.constants.js";
import { BATTLE_KEYS } from "./battle.redis.js";
import { scheduleNextQuestion } from "./battle.jobs.js";
import { recordBattleAnswer } from "./battle.answers.js";

export const submitBattleAnswer = async (submission) => {
    const result = await recordBattleAnswer(submission);
    const { battleId, userId, questionIndex } = submission;
    if (!result.duplicate && result.answeredCount === result.playerCount) {
        try {
            await scheduleNextQuestion(
                battleId,
                questionIndex,
                BATTLE_TTL_SECONDS.ROUND_TURN_DELAY * 1000
            );
        } catch (error) {
            AppLogger.error("Could not schedule next battle question; round timeout will recover", error, {
                component: "battle-rounds",
                battleId,
                questionIndex
            });
        }
    }

    try {
        const rawState = await redis.get(BATTLE_KEYS.payload(battleId));
        if (!rawState) return { accepted: true, correct: result.correct };
        const state = JSON.parse(rawState);
        const namespace = getBattleNamespace();
        for (const playerId of state.players) {
            namespace.to(playerId).emit(BATTLE_EVENTS.PLAYER_ANSWERED, {
                userId,
                question_index: questionIndex,
                ...(playerId !== userId ? { correct: result.correct } : {})
            });
        }
    } catch (error) {
        AppLogger.error("Answer was recorded but its acknowledgement event failed", error, {
            component: "battle-rounds",
            battleId,
            userId,
            questionIndex
        });
    }

    return { accepted: true, correct: result.correct };
};

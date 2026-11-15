import { ApiError } from "../../utils/ApiError.js";
import { BATTLE_TTL_SECONDS } from "./battle.constants.js";
import { BATTLE_KEYS, SUBMIT_BATTLE_ANSWER_SCRIPT, redisCall } from "./battle.redis.js";

const ERROR_MESSAGES = Object.freeze({
    MISSING: [404, "Battle is no longer available."],
    CORRUPT: [500, "Battle state is corrupted."],
    NOT_ACTIVE: [409, "Battle is not accepting answers."],
    STALE: [409, "That question is no longer active."],
    NOT_PLAYER: [403, "You are not a participant in this battle."],
    BAD_QUESTION: [500, "Battle question state is invalid."],
    BAD_ANSWER: [400, "Answer is not a valid option."],
    TIME_EXPIRED: [409, "The time to answer this question has expired."],
    DUPLICATE: [409, "You have already answered this question."]
});

export const recordBattleAnswer = async ({ battleId, userId, questionIndex, answer }) => {
    const result = await redisCall(
        SUBMIT_BATTLE_ANSWER_SCRIPT,
        [BATTLE_KEYS.payload(battleId)],
        [
            userId,
            String(questionIndex),
            answer,
            String(BATTLE_TTL_SECONDS.ROUND_TIMEOUT),
            String(BATTLE_TTL_SECONDS.BATTLE_STATE)
        ]
    );

    if (result[0] !== "OK" && result[0] !== "DUPLICATE") {
        const [statusCode, message] = ERROR_MESSAGES[result[0]] || [500, "Answer submission failed."];
        throw new ApiError(statusCode, message);
    }

    return {
        answeredCount: Number(result[1]),
        playerCount: Number(result[2]),
        correct: result[3] === "1",
        correctAnswer: result[4],
        duplicate: result[0] === "DUPLICATE"
    };
};

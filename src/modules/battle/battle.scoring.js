import { BATTLE_TTL_SECONDS } from "./battle.constants.js";
import { calculateBattlePoints } from "../../utils/calculateBattlePoints.js";

export const calculateBattleResult = (state, forcedWinnerId = null) => {
    const [firstPlayer, secondPlayer] = state.players;
    const rawScores = state.scores;
    const winner = forcedWinnerId
        || (rawScores[firstPlayer] === rawScores[secondPlayer]
            ? "DRAW"
            : rawScores[firstPlayer] > rawScores[secondPlayer] ? firstPlayer : secondPlayer);
    const result = {};

    for (const userId of state.players) {
        const answers = state.players_answers[userId] || {};
        const durations = state.players_answered_durations[userId] || {};
        let correctAnswers = 0;
        let wrongAnswers = 0;
        let timedOutAnswers = 0;
        let answeredQuestions = 0;
        let fastestAnswer = null;
        let answerTimeUsed = 0;
        let timeUsed = 0;
        let completedRounds = 0;

        for (let index = 0; index < state.total_questions; index += 1) {
            const answer = answers[index];
            if (answer === undefined) continue;
            completedRounds += 1;

            if (answer === null) {
                wrongAnswers += 1;
                timedOutAnswers += 1;
            } else {
                answeredQuestions += 1;
                if (answer === state.questions[index].answer) correctAnswers += 1;
                else wrongAnswers += 1;
            }

            const duration = Number(durations[index]);
            if (Number.isFinite(duration)) {
                timeUsed += duration;
                if (answer !== null) fastestAnswer = fastestAnswer === null
                    ? duration
                    : Math.min(fastestAnswer, duration);
                if (answer !== null) answerTimeUsed += duration;
            }
        }

        const outcome = winner === "DRAW"
            ? "draw"
            : winner === userId ? "win" : "loss";
        const totalTime = completedRounds * BATTLE_ROUND_TIMEOUT_SECONDS;
        const timeLeft = Math.max(0, totalTime - timeUsed);
        const accuracy = answeredQuestions
            ? Math.round((correctAnswers / answeredQuestions) * 10000) / 100
            : 0;
        result[userId] = {
            correctAnswers,
            wrongAnswers,
            timedOutAnswers,
            answeredQuestions,
            totalQuestions: state.total_questions,
            accuracy,
            completionRate: state.total_questions
                ? Math.round((completedRounds / state.total_questions) * 10000) / 100
                : 0,
            averageAnswerTime: answeredQuestions
                ? Math.round((answerTimeUsed / answeredQuestions) * 100) / 100
                : 0,
            fastestAnswerTime: fastestAnswer === null
                ? null
                : Math.round(fastestAnswer * 100) / 100,
            timeLeft: Math.round(timeLeft * 100) / 100,
            timeUsed: Math.round(timeUsed * 100) / 100,
            answerTimeUsed: Math.round(answerTimeUsed * 100) / 100,
            matchPoints: calculateBattlePoints(
                outcome,
                correctAnswers,
                wrongAnswers,
                timeUsed,
                totalTime
            ),
            outcome
        };
    }

    return {
        winner,
        scores: rawScores,
        playerResults: result
    };
};

const BATTLE_ROUND_TIMEOUT_SECONDS = BATTLE_TTL_SECONDS.ROUND_TIMEOUT;

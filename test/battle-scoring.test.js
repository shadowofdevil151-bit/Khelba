import test from "node:test";
import assert from "node:assert/strict";
import { calculateBattlePoints } from "../src/utils/calculateBattlePoints.js";
import { calculateBattleResult } from "../src/modules/battle/battle.scoring.js";

const state = {
    players: ["player-1", "player-2"],
    total_questions: 2,
    questions: [{ answer: "ক" }, { answer: "খ" }],
    scores: { "player-1": 1, "player-2": 0 },
    players_answers: {
        "player-1": { 0: "ক", 1: "ঘ" },
        "player-2": { 0: "খ", 1: null }
    },
    players_answered_durations: {
        "player-1": { 0: 10, 1: 45 },
        "player-2": { 0: 20, 1: 45 }
    }
};

test("battle result delegates point calculation using time spent within played rounds", () => {
    const result = calculateBattleResult(state);

    assert.equal(result.winner, "player-1");
    assert.deepEqual(result.playerResults["player-1"], {
        correctAnswers: 1,
        wrongAnswers: 1,
        timedOutAnswers: 0,
        answeredQuestions: 2,
        totalQuestions: 2,
        accuracy: 50,
        completionRate: 100,
        averageAnswerTime: 27.5,
        fastestAnswerTime: 10,
        timeLeft: 35,
        timeUsed: 55,
        answerTimeUsed: 55,
        matchPoints: calculateBattlePoints("win", 1, 1, 55, 90),
        outcome: "win"
    });
    assert.equal(result.playerResults["player-1"].matchPoints, 18);
    assert.deepEqual(result.playerResults["player-2"], {
        correctAnswers: 0,
        wrongAnswers: 2,
        timedOutAnswers: 1,
        answeredQuestions: 1,
        totalQuestions: 2,
        accuracy: 0,
        completionRate: 100,
        averageAnswerTime: 20,
        fastestAnswerTime: 20,
        timeLeft: 25,
        timeUsed: 65,
        answerTimeUsed: 20,
        matchPoints: calculateBattlePoints("loss", 0, 2, 65, 90),
        outcome: "loss"
    });
    assert.equal(result.playerResults["player-2"].matchPoints, 0);
});

test("point helper applies predefined outcome, accuracy, and speed formula", () => {
    assert.equal(calculateBattlePoints("win", 2, 1, 30, 90), 21);
    assert.ok(calculateBattlePoints("win", 1, 0, 10, 45) > 1);
    assert.equal(calculateBattlePoints("draw", 0, 0, 90, 90), 5);
    assert.equal(calculateBattlePoints("loss", 0, 2, 90, 90), 0);
    assert.equal(calculateBattlePoints("loss", 0, 100, 90, 90), 0);
    assert.throws(() => calculateBattlePoints("unknown", 0, 0, 0), TypeError);
});

test("between-round delay is not counted as answer time and unplayed forfeited rounds are omitted", () => {
    const partialState = {
        ...state,
        total_questions: 10,
        questions: [...state.questions, ...Array.from({ length: 8 }, () => ({ answer: "ক" }))],
        players_answers: {
            "player-1": { 0: "ক" },
            "player-2": { 0: "খ" }
        },
        players_answered_durations: {
            "player-1": { 0: 8 },
            "player-2": { 0: 12 }
        },
        isForfeit: true,
        forfeitedUserId: "player-2"
    };
    const result = calculateBattleResult(partialState, "player-1");

    assert.equal(result.playerResults["player-1"].timeUsed, 8);
    assert.equal(result.playerResults["player-1"].timeLeft, 37);
    assert.equal(result.playerResults["player-2"].wrongAnswers, 1);
    assert.equal(result.playerResults["player-1"].accuracy, 100);
    assert.equal(result.playerResults["player-2"].accuracy, 0);
    assert.equal(result.playerResults["player-2"].timeLeft, 33);
});

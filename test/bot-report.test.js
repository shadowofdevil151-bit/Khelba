import test from "node:test";
import assert from "node:assert/strict";
import { BOT_REPORT_MAX_POINTS, compressBotReport } from "../src/workers/handlers/battle/bot-report.js";

const makeReport = (points) => ({
    battle_points: points,
    battle_count: { total: 1000, win: 600, draw: 100, losses: 300 },
    performance: {
        answered_questions: 9000,
        correct_answers: 6000,
        wrong_answers: 3000,
        timed_out_answers: 1000,
        total_answer_time: 180000,
        accuracy: 66.67
    },
    streak: { currentStreak: 120, longest_streak: 180 }
});

test("bot report counters compress consistently above the points cap", () => {
    const report = makeReport(BOT_REPORT_MAX_POINTS + 1);
    assert.equal(compressBotReport(report), true);
    assert.ok(report.battle_points >= 1000 && report.battle_points <= 2000);
    assert.equal(report.battle_count.total, report.battle_count.win + report.battle_count.draw + report.battle_count.losses);
    assert.equal(report.performance.answered_questions, report.performance.correct_answers + report.performance.wrong_answers);
    assert.equal(
        report.performance.accuracy,
        Math.round((report.performance.correct_answers / report.performance.answered_questions) * 10000) / 100
    );
    assert.ok(report.battle_count.total < 1000);
    assert.ok(report.performance.total_answer_time < 180000);
});

test("bot report below the points cap is unchanged", () => {
    const report = makeReport(BOT_REPORT_MAX_POINTS);
    const snapshot = structuredClone(report);
    assert.equal(compressBotReport(report), false);
    assert.deepEqual(report, snapshot);
});

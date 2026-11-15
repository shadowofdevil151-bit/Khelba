import { randomInt } from "node:crypto";

export const BOT_REPORT_MAX_POINTS = 5000;

export const compressBotReport = (report) => {
    const points = Number(report.battle_points) || 0;
    if (points <= BOT_REPORT_MAX_POINTS) return false;

    const scaledPoints = randomInt(1000, 2001);
    const scale = scaledPoints / points;
    const counts = report.battle_count;
    const totalBattles = Math.max(0, Math.round(counts.total * scale));
    const wins = Math.min(totalBattles, Math.round(counts.win * scale));
    const draws = Math.min(totalBattles - wins, Math.round(counts.draw * scale));
    counts.total = totalBattles;
    counts.win = wins;
    counts.draw = draws;
    counts.losses = totalBattles - wins - draws;

    const performance = report.performance;
    performance.answered_questions = Math.max(0, Math.round(performance.answered_questions * scale));
    performance.correct_answers = Math.min(
        performance.answered_questions,
        Math.max(0, Math.round(performance.correct_answers * scale))
    );
    performance.wrong_answers = Math.max(
        0,
        performance.answered_questions - performance.correct_answers
    );
    performance.timed_out_answers = Math.max(0, Math.round(performance.timed_out_answers * scale));
    performance.total_answer_time = Math.round(performance.total_answer_time * scale * 100) / 100;
    performance.accuracy = performance.answered_questions
        ? Math.round((performance.correct_answers / performance.answered_questions) * 10000) / 100
        : 0;

    report.streak.currentStreak = Math.max(0, Math.round(report.streak.currentStreak * scale));
    report.streak.longest_streak = Math.max(
        report.streak.currentStreak,
        Math.round(report.streak.longest_streak * scale)
    );
    report.battle_points = scaledPoints;
    return true;
};

import test from "node:test";
import assert from "node:assert/strict";
import { calculateStreak, dateInTimezone, isStreakActive } from "../src/utils/streak.js";

const timezone = "Asia/Dhaka";

test("streak date is calculated in the configured timezone", () => {
    assert.equal(dateInTimezone(new Date("2026-10-28T18:30:00.000Z"), timezone), "2026-10-29");
});

test("same-day activity preserves the current streak", () => {
    const result = calculateStreak({
        currentStreak: 4,
        longest_streak: 7,
        lastMatchDate: "2026-10-29"
    }, new Date("2026-10-29T04:00:00.000Z"), timezone);

    assert.deepEqual(result, {
        currentStreak: 4,
        longest_streak: 7,
        lastMatchDate: "2026-10-29",
        timezone
    });
});

test("activity on the next calendar day increments the streak", () => {
    const result = calculateStreak({
        currentStreak: 4,
        longest_streak: 4,
        lastMatchDate: "2026-10-29"
    }, new Date("2026-10-29T18:30:00.000Z"), timezone);

    assert.equal(result.currentStreak, 5);
    assert.equal(result.longest_streak, 5);
    assert.equal(result.lastMatchDate, "2026-10-30");
});

test("activity after a missed day starts a new streak", () => {
    const result = calculateStreak({
        currentStreak: 4,
        longest_streak: 4,
        lastMatchDate: "2026-10-27"
    }, new Date("2026-10-29T18:30:00.000Z"), timezone);

    assert.equal(result.currentStreak, 1);
    assert.equal(result.longest_streak, 4);
});

test("late older activity does not rewind the current streak", () => {
    const result = calculateStreak({
        currentStreak: 5,
        longest_streak: 8,
        lastMatchDate: "2026-10-30"
    }, new Date("2026-10-29T10:00:00.000Z"), timezone);

    assert.equal(result.currentStreak, 5);
    assert.equal(result.longest_streak, 8);
    assert.equal(result.lastMatchDate, "2026-10-30");
});

test("a streak is active today or the previous local day only", () => {
    const now = new Date("2026-10-29T18:30:00.000Z");
    assert.equal(isStreakActive({ lastMatchDate: "2026-10-30" }, now, timezone), true);
    assert.equal(isStreakActive({ lastMatchDate: "2026-10-29" }, now, timezone), true);
    assert.equal(isStreakActive({ lastMatchDate: "2026-10-28" }, now, timezone), false);
});

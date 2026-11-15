import test from "node:test";
import assert from "node:assert/strict";
import { createBotAnswerPlan } from "../src/modules/battle/battle.bot.js";

test("bot answer plan assigns 60-95% accuracy across ten questions", () => {
    let firstCall = true;
    const indexes = createBotAnswerPlan(10, (min, max) => {
        if (firstCall) {
            firstCall = false;
            return min;
        }
        return min;
    });

    assert.equal(indexes.length, 6);
    assert.equal(new Set(indexes).size, 6);
    assert.ok(indexes.every((index) => index >= 0 && index < 10));
});

test("bot answer plan can select the upper accuracy target", () => {
    let firstCall = true;
    const indexes = createBotAnswerPlan(10, (min, max) => {
        if (firstCall) {
            firstCall = false;
            return max - 1;
        }
        return min;
    });

    assert.equal(indexes.length, 9);
});

test("bot answer plan rejects unsupported question counts", () => {
    assert.throws(() => createBotAnswerPlan(0), TypeError);
    assert.throws(() => createBotAnswerPlan(1), RangeError);
});

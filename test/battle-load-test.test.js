import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getAnswerDelayMs, runBattle } = require("../dev/load-test/processor.cjs");

class TestSocket extends EventEmitter {
    connected = true;
    submissions = [];

    timeout() {
        return this;
    }

    emit(event, ...args) {
        if (event === "SUBMIT_ANSWER") {
            this.submissions.push({ event, payload: args[0], emittedAt: Date.now() });
            args[1](null, { success: true });
            return true;
        }
        return super.emit(event, ...args);
    }

    disconnect() {
        this.connected = false;
    }
}

test("Artillery VU schedules answers after a random 5–20 seconds and exits after ten rounds", async (t) => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const originalTarget = process.env.TARGET_URL;
    let matchmakingRequest;
    const answerDelays = [];
    process.env.TARGET_URL = "http://load-test.local";
    globalThis.setTimeout = (callback, delay, ...args) => {
        if (delay >= 5000 && delay <= 20000) {
            answerDelays.push(delay);
            return originalSetTimeout(callback, 0, ...args);
        }
        return originalSetTimeout(callback, delay, ...args);
    };
    globalThis.fetch = async (url, options) => {
        matchmakingRequest = { url, options };
        return { ok: true };
    };
    t.after(() => {
        globalThis.fetch = originalFetch;
        globalThis.setTimeout = originalSetTimeout;
        if (originalTarget === undefined) delete process.env.TARGET_URL;
        else process.env.TARGET_URL = originalTarget;
    });

    const socket = new TestSocket();
    const context = {
        vars: { userId: "load-user", accessToken: "test-token" },
        battleSocket: socket
    };
    const completed = new Promise((resolve, reject) => {
        runBattle(context, null, (error) => error ? reject(error) : resolve());
    });

    for (let index = 0; index < 10; index += 1) {
        socket.emit("NEXT_QUESTION", { index, question: { options: ["a", "b", "c", "d"] } });
    }
    const opponentAnsweredAt = Date.now();
    socket.emit("PLAYER_ANSWERED", { userId: "opponent", question_index: 0 });
    await new Promise((resolve, reject) => {
        const deadline = originalSetTimeout(() => reject(new Error("VU did not submit its answer.")), 1000);
        const check = () => {
            if (socket.submissions.length) {
                clearTimeout(deadline);
                resolve();
            } else {
                originalSetTimeout(check, 20);
            }
        };
        check();
    });

    assert.equal(answerDelays.length, 1);
    assert.ok(answerDelays[0] >= 5000 && answerDelays[0] <= 20000);
    assert.ok(socket.submissions[0].emittedAt >= opponentAnsweredAt);
    assert.equal(socket.submissions[0].payload.question_index, 0);
    assert.ok(["ক", "খ", "গ", "ঘ"].includes(socket.submissions[0].payload.answer));
    assert.equal(matchmakingRequest.options.body, JSON.stringify({ subject_code: "275", chapter: 5 }));
    const generatedDelay = getAnswerDelayMs();
    assert.ok(generatedDelay >= 5000 && generatedDelay <= 20000);

    socket.emit("FINALIZE_BATTLE", {});
    await completed;
    assert.equal(socket.connected, false);
    assert.equal(context.battleSocket, undefined);
});

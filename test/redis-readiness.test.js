import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRedisCommand } from "../src/utils/createRedisCommand.js";

test("Redis commands wait for the connection to become ready", async () => {
    const client = new EventEmitter();
    client.status = "connecting";
    client.call = (...args) => Promise.resolve(args);
    const command = createRedisCommand(client, 100);
    const pending = command("SCRIPT", "LOAD", "script");

    client.status = "ready";
    client.emit("ready");
    assert.deepEqual(await pending, ["SCRIPT", "LOAD", "script"]);
    assert.equal(client.listenerCount("ready"), 0);
    assert.equal(client.listenerCount("end"), 0);
});

test("Redis command fails clearly if the connection never becomes ready", async () => {
    const client = new EventEmitter();
    client.status = "connecting";
    client.call = () => assert.fail("Redis command must not run before readiness.");

    await assert.rejects(createRedisCommand(client, 5)("PING"), /did not become ready/);
    assert.equal(client.listenerCount("ready"), 0);
    assert.equal(client.listenerCount("end"), 0);
});

import { waitForRedisReady } from "./waitForRedisReady.js";

export const createRedisCommand = (client, timeoutMs = 10000) =>
    async (...args) => {
        await waitForRedisReady(client, timeoutMs);
        return client.call(...args);
    };

import { dbConfig } from "./env.js";

const redisUrl = new URL(dbConfig.redis.url);
if (!["redis:", "rediss:"].includes(redisUrl.protocol)) {
    throw new Error("REDIS_URL must use the redis:// or rediss:// protocol.");
}

const database = redisUrl.pathname.length > 1 ? Number(redisUrl.pathname.slice(1)) : undefined;
if (database !== undefined && (!Number.isSafeInteger(database) || database < 0)) {
    throw new Error("REDIS_URL database path must be a non-negative integer.");
}
const port = Number(redisUrl.port || 6379);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("REDIS_URL port must be between 1 and 65535.");
}

export const QUEUE_NAME = "core-tasks";
export const redisConnectionOptions = {
    host: redisUrl.hostname,
    port,
    username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
    password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
    db: database,
    ...(redisUrl.protocol === "rediss:" ? { tls: { servername: redisUrl.hostname } } : {}),
    maxRetriesPerRequest: null,
};

import Redis from "ioredis";
import { AppLogger } from "../utils/logger.js";
import { dbConfig } from "./env.js";

const redisUrl = dbConfig.redis.url;

export const redis = new Redis(redisUrl, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  connectTimeout: 5000,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});


redis.on("ready", () => {
  AppLogger.info("Redis node connection handshake completed", { component: "redis" });
});

redis.on("error", (error) => {
  AppLogger.error("Connectivity fault encountered on Redis driver", error, { component: "redis" });
});

redis.on("close", () => {
  AppLogger.warn("Redis memory storage connection socket link closed", { component: "redis" });
});

export const closeRedis = async () => {
  AppLogger.info("Initiating graceful disconnection sequence on redis engine", { component: "redis" });
  await redis.quit();
};

import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "./redis.js";
import { createRedisCommand } from "../utils/createRedisCommand.js";

export const globalLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: createRedisCommand(redis),
    }),
    windowMs: 15 * 60 * 1000, 
    limit: 50000,
    delayMs: 0,
    maxDelayMs: 0,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        status: 429,
        message: "Too many requests originating from this IP address. Please try again later."
    },
});

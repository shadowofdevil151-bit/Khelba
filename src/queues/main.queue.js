import { Queue } from "bullmq";
import { serverConfig } from "../config/env.js";
import { QUEUE_NAME, redisConnectionOptions } from "../config/queue.js";
import { AppLogger } from "../utils/logger.js";

export const mainQueue = new Queue(QUEUE_NAME, {
    connection: redisConnectionOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600,
            count: 5000,
        },
    }
});

// 3. Mount structural lifecycle event hooks and track readiness
mainQueue.waitUntilReady()
    .then(() => {
        AppLogger.info("Redis BullMQ connection initialized and queue cluster ready", {
            component: "main-queue",
            service: serverConfig.serviceName,
            queueName: mainQueue.name
        });
    })
    .catch((err) => {
        AppLogger.error("BullMQ infrastructure bootstrapping initialization failed", err, {
            component: "main-queue"
        });
    });

export const closeMainQueue = () => mainQueue.close();

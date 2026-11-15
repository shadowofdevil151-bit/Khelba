import { Worker } from "bullmq";
import { serverConfig } from "../config/env.js";
import { AppLogger } from "../utils/logger.js";
import { connectDB, closeDB } from "../config/db.js";
import { QUEUE_NAME, redisConnectionOptions } from "../config/queue.js";
import { JobRegistry } from "./jobRegistry.js";
import { decryptQueuePayload } from "../utils/queuePayload.js";
import { closeBattleEmitter, initializeBattleEmitter } from "./handlers/battle/socketEmitter.js";
import { shutdownTelemetry } from "../observability.js";

let worker = null;
let isShuttingDown = false;

const startWorkerEnvironment = async () => {
    await connectDB();
    await initializeBattleEmitter();

    worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            // job.name is the action route; job.data is strictly the payload
            const { name, data } = job;

            if (!name) {
                throw new Error(`Job ID ${job.id} rejected: Missing required job name.`);
            }

            try {
                const processJob = JobRegistry.getProcessor(name);
                const payload = data?.encryptedPayload
                    ? await decryptQueuePayload(data.encryptedPayload)
                    : data;
                await processJob(payload, job);
            } catch (error) {
                AppLogger.error("Task execution pipeline failure", error, {
                    jobId: job.id,
                    jobName: name
                });
                throw error; // Let BullMQ handle native retries
            }
        },
        {
            connection: redisConnectionOptions,
            concurrency: serverConfig.worker.concurrency || 1,
            lockDuration: serverConfig.worker.lockDurationMS || 30000,
            limiter: serverConfig.worker.limitMax ? {
                max: serverConfig.worker.limitMax,
                duration: serverConfig.worker.limitDurationMS || 1000
            } : undefined
        }
    );
    // Operational Telemetry
    worker.on("active", (job) => {
        AppLogger.info("Job processing started", { jobId: job.id, jobName: job.name });
    });

    worker.on("completed", (job) => {
        AppLogger.info("Job execution completed successfully", { jobId: job.id, jobName: job.name });
    });

    worker.on("failed", (job, err) => {
        AppLogger.error("Job execution pipeline hard fault", err, {
            jobId: job?.id,
            jobName: job?.name,
            attemptsMade: job?.attemptsMade
        });
    });

    worker.on("stalled", (jobId, prev) => {
        AppLogger.warn("Job has stalled and will be re-processed", { jobId, previousState: prev });
    });

    worker.on("error", (err) => {
        AppLogger.error("BullMQ internal connection or operational failure", err);
    });

    await worker.waitUntilReady();
    AppLogger.info("Infrastructure worker process context fully online", {
        service: serverConfig.serviceName,
        queueName: QUEUE_NAME
    });
};

// Double shutdown protection guard
const initiateGracefulShutdown = async (signal) => {
    if (isShuttingDown) {
        AppLogger.warn(`Shutdown already in progress. Ignoring duplicate signal: ${signal}`);
        return;
    }

    isShuttingDown = true;
    AppLogger.info(`System termination instruction caught via ${signal}. Safe closure initiated...`);
    const forceKillTimeout = setTimeout(() => {
        AppLogger.fatal("Worker graceful shutdown exceeded its hard limit.", new Error("Worker shutdown timed out."));
        process.exit(1);
    }, 25000);

    try {
        if (worker) {
            await worker.close(); // Waits for active jobs to finish
            AppLogger.info("BullMQ worker instance closed cleanly.");
        }
        await closeBattleEmitter();
        await closeDB();
        clearTimeout(forceKillTimeout);
        await shutdownTelemetry();
        process.exit(0);
    } catch (error) {
        clearTimeout(forceKillTimeout);
        AppLogger.error("Error occurred during graceful worker shutdown sequence", error);
        await shutdownTelemetry().catch((telemetryError) => {
            AppLogger.error("OpenTelemetry shutdown failed", telemetryError);
        });
        process.exit(1);
    }
};

process.on("SIGTERM", () => initiateGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => initiateGracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
    AppLogger.fatal("Unhandled worker promise rejection", reason, { component: "worker" });
    initiateGracefulShutdown("UNHANDLED_REJECTION");
});
process.on("uncaughtException", (error) => {
    AppLogger.fatal("Uncaught worker exception", error, { component: "worker" });
    initiateGracefulShutdown("UNCAUGHT_EXCEPTION");
});

startWorkerEnvironment().catch((err) => {
    AppLogger.error("Bootstrap sequence hard crash during worker initialization", err);
    shutdownTelemetry()
        .catch((telemetryError) => {
            AppLogger.error("OpenTelemetry shutdown failed", telemetryError);
        })
        .finally(() => process.exit(1));
});

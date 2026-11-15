import { createServer } from "node:http";
import { redis, closeRedis } from "./src/config/redis.js";
import { connectDB, closeDB } from "./src/config/db.js";
import { AppLogger } from "./src/utils/logger.js";
import { mainQueue, closeMainQueue } from "./src/queues/main.queue.js";
import { createSocketServer } from "./src/socket/index.js";
import { shutdownState } from "./shutdownState.js";
import { serverConfig } from "./src/config/env.js";
import { waitForRedisReady } from "./src/utils/waitForRedisReady.js";
import { shutdownTelemetry } from "./src/observability.js";


let server;
let socketRuntime;

const startServer = async () => {
    try {
        await connectDB();
        AppLogger.info("Database cluster driver verified successfully", { component: "api-server-bootstrap" });

        await waitForRedisReady(redis);
        const pong = await redis.ping();
        AppLogger.info("Cache broker verification completed successfully", { pingResponse: pong, component: "api-server-bootstrap" });

        await mainQueue.waitUntilReady();
        AppLogger.info("Background queue connection verified successfully", { component: "api-server-bootstrap" });

        const { app } = await import("./app.js");
        server = createServer(app);
        socketRuntime = await createSocketServer(server);

        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(serverConfig.port, () => {
                server.removeListener("error", reject);
                AppLogger.info("HTTP and Socket.IO servers are listening", {
                    port: serverConfig.port,
                    env: serverConfig.env,
                    component: "api-server-bootstrap"
                });
                resolve();
            });
        });
    } catch (error) {
        AppLogger.fatal("Application infrastructure startup sequence rejected by node cluster", error, { component: "api-server-bootstrap" });
        await shutdownTelemetry().catch((telemetryError) => {
            AppLogger.error("OpenTelemetry shutdown failed", telemetryError, { component: "api-server-bootstrap" });
        });
        process.exit(1);
    }
};

let shuttingDown = false;
const shutdownServer = async (signal) => {
    if (shuttingDown) return;
    AppLogger.warn("Graceful termination signal intercepted. Evacuating API server traffic...", { signalCaught: signal, component: "api-server-bootstrap" });
    shuttingDown = true;
    shutdownState.isShuttingDown = true;

    const forceKillTimeout = setTimeout(() => {
        AppLogger.fatal("Graceful shutdown exceeded hard limit. Forcefully terminating Node process.", new Error("Graceful shutdown hard limit exceeded."), { component: "api-server-bootstrap" });
        process.exit(1);
    }, 10000);

    try {
        const closeHttpServer = () => new Promise((resolve, reject) => {
            if (!server?.listening) return resolve();
            server.close((error) => error ? reject(error) : resolve());
        });

        const shutdownTasks = [
            socketRuntime ? socketRuntime.close() : closeHttpServer(),
            closeMainQueue(),
            closeDB(),
            closeRedis()
        ];
        const shutdownResults = await Promise.allSettled(shutdownTasks);
        const shutdownErrors = shutdownResults
            .filter((result) => result.status === "rejected")
            .map((result) => result.reason);
        if (shutdownErrors.length) {
            throw new AggregateError(shutdownErrors, "One or more services failed to close cleanly.");
        }
        clearTimeout(forceKillTimeout);
        AppLogger.info("HTTP, Socket.IO, database, cache, and queue connections closed cleanly.", { component: "api-server-bootstrap" });
        await shutdownTelemetry();
        process.exit(0);
    } catch (error) {
        AppLogger.fatal("Critical exception encountered during graceful termination processing sequence", error, { component: "api-server-bootstrap" });
        await shutdownTelemetry().catch((telemetryError) => {
            AppLogger.error("OpenTelemetry shutdown failed", telemetryError, { component: "api-server-bootstrap" });
        });
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdownServer("SIGINT"));
process.on("SIGTERM", () => shutdownServer("SIGTERM"));
process.on("unhandledRejection", (reason, promise) => {
    AppLogger.fatal("Asynchronous promise loop threw an unhandled execution rejection", new Error("Unhandled Rejection."), { err: reason, rejectedPromise: promise });
    shutdownServer("UNHANDLED_REJECTION");
});
process.on("uncaughtException", (error) => {
    AppLogger.fatal("Runtime process loop intercepted an uncaught execution boundary exception", error, { component: "api-server-bootstrap" });
    shutdownServer("UNCAUGHT_EXCEPTION");
});

startServer();

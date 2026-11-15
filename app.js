import "./src/config/env.js";
import crypto from "crypto";
import pinoHttp from "pino-http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";

import { serverConfig } from "./src/config/env.js";
import { logger } from "./src/config/logger.js";
import { globalLimiter } from "./src/config/ratelimiter.js";
import { mainRouter } from "./src/routes/index.js";
import { globalErrorHandler } from "./src/middlewares/error.middleware.js";
import { ApiError } from "./src/utils/ApiError.js";
import { ApiResponse } from "./src/utils/ApiResponse.js";
import { shutdownState } from "./shutdownState.js";
import { contextMiddleware } from "./src/middlewares/context.middleware.js";

import "./src/config/passport.js";

const safeRequestUrl = (url) => String(url || "")
    .split("?")[0]
    .replace(/\/(reset-password|verify-email)\/[^/]+/g, "/\$1/[REDACTED]");

export const app = express();

// 1. FAST SECURITY HEADERS
app.set('trust proxy', 1);
app.use(helmet());

// 2. IDENTIFICATION LAYER & LOGGING
app.use(
    pinoHttp({
        logger,
        genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
        customLogLevel: (req, res, err) => {
            if (res.statusCode >= 500 || err) return "error";
            if (res.statusCode >= 400) return "warn";
            return "info";
        },
        customSuccessMessage: (req, res, responseTime) => `HTTP ${req.method} ${safeRequestUrl(req.url)} completed with status ${res.statusCode} in ${responseTime}ms`,
        customErrorMessage: (req, res, err) => `HTTP ${req.method} ${safeRequestUrl(req.url)} failed with status code ${res.statusCode}`,
        serializers: {
            req: (req) => ({ id: req.id, method: req.method, url: safeRequestUrl(req.url) }),
            res: (res) => ({ statusCode: res.statusCode })
        }
    })
);
app.use(contextMiddleware);

// 3. GLOBAL NETWORK & SHUTDOWN SENTINELS
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || serverConfig.allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new ApiError(403, "Blocked by CORS policy security mechanisms."));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use((req, res, next) => {
    if (!shutdownState.isShuttingDown) return next();
    return res
        .set("Connection", "close")
        .status(503)
        .json(new ApiResponse(503, {}, "Server is gracefully shutting down."));
});

// 4. GLOBAL RATE LIMITING
app.use("/api", globalLimiter);

// 5. DATA PARSING & SANITIZATION (Moved above routes)
app.use((req, res, next) => {
    if (req.query) {
        Object.defineProperty(req, "query", {
            value: { ...req.query },
            writable: true,
            configurable: true,
            enumerable: true,
        });
    }
    next();
});

app.use(express.json()); // Essential to parse incoming JSON payloads before routing
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());

// 6. APPLICATION BUSINESS LOGIC
app.use("/api/v1", mainRouter);

// 7. FAIL-SAFE CATCH LAYER
app.use(globalErrorHandler);

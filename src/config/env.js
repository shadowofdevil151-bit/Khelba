import "dotenv/config";
import { cleanEnv, str, port, url, email, makeValidator } from "envalid";

// 1. CORE STRICT STRUCTURAL VALIDATORS
const hex64 = makeValidator((value) => {
    const hexRegex = new RegExp("^[a-f0-9]{64}\$", "i");
    if (!hexRegex.test(value)) {
        throw new Error("Must be a valid 64-character hexadecimal security hash string.");
    }
    return value;
});

const originArray = makeValidator((value) => {
    if (!value || typeof value !== "string") {
        throw new Error("ALLOWED_ORIGINS must be a defined comma-separated string.");
    }
    const origins = value.split(",").map(origin => origin.trim());
    const urlRegex = new RegExp("^https?:\\/\\/[^\\s\\/.?#].[^\\s]*\$", "i");

    for (const origin of origins) {
        if (!urlRegex.test(origin)) {
            throw new Error(`Invalid CORS origin URL structure found: "${origin}"`);
        }
    }
    return origins;
});

const gmailAppPassword = makeValidator((value) => {
    const appPassRegex = new RegExp("^[a-z]{4}\\s[a-z]{4}\\s[a-z]{4}\\s[a-z]{4}\$");
    if (!appPassRegex.test(value)) {
        throw new Error("Must be a 16-character structured Google App Password (e.g., 'xxxx xxxx xxxx xxxx').");
    }
    return value;
});

const positiveInteger = makeValidator((value) => {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        throw new Error("Must be a positive integer.");
    }
    return parsed;
});

const nonNegativeInteger = makeValidator((value) => {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
        throw new Error("Must be a non-negative integer.");
    }
    return parsed;
});

// 2. CENTRALIZED UPFRONT VALIDATION
const validatedEnv = cleanEnv(process.env, {
    NODE_ENV: str({ choices: ["development", "production", "test"], default: "development" }),
    PROCESS_TYPE: str({ choices: ["api_server", "job_worker", "system_worker", "queue_sync"], default: "api_server" }),
    PORT: port({ default: 3000 }),

    WORKER_CONCURRENCY: positiveInteger({ default: 5 }),
    WORKER_LOCK_DURATION_MS: positiveInteger({ default: 30000 }),
    WORKER_LIMIT_MAX: nonNegativeInteger({ default: 50 }),
    WORKER_LIMIT_DURATION_MS: positiveInteger({ default: 10000 }),

    SERVICE_NAME: str({ default: "Khelba" }),
    ACCESS_TOKEN_SECRET: hex64(),
    REFRESH_TOKEN_SECRET: hex64(),
    ACCESS_TOKEN_EXPIRY: positiveInteger({ default: 900 }),
    REFRESH_TOKEN_EXPIRY: positiveInteger({ default: 604800 }),
    SYSTEM_INTERNAL_SECRET: hex64(),
    MAX_ALLOWED_SESSIONS: positiveInteger({ default: 1 }),

    ALLOWED_ORIGINS: originArray(),
    FRONTEND_URL: url(),

    GOOGLE_CLIENT_ID: str(),
    GOOGLE_CLIENT_SECRET: str(),
    GOOGLE_CALLBACK_URL: url(),

    MONGODB_URI: url(),
    REDIS_URL: url(),

    CLOUDINARY_CLOUD_NAME: str(),
    CLOUDINARY_API_KEY: str(),
    CLOUDINARY_API_SECRET: str(),

    EMAIL_USER: email(),
    EMAIL_PASS: gmailAppPassword(),

    LOG_LEVEL: str({ choices: ["fatal", "error", "warn", "info", "debug", "trace"], default: "info" })
});

// 3. STRUCTURED READ-ONLY DOMAIN CONFIGS
export const serverConfig = Object.freeze({
    env: validatedEnv.NODE_ENV,
    processType: validatedEnv.PROCESS_TYPE,
    port: validatedEnv.PORT,
    serviceName: validatedEnv.SERVICE_NAME,
    logLevel: validatedEnv.LOG_LEVEL,
    frontendUrl: validatedEnv.FRONTEND_URL,
    allowedOrigins: validatedEnv.ALLOWED_ORIGINS,
    worker: {
        concurrency: validatedEnv.WORKER_CONCURRENCY,
        lockDurationMS: validatedEnv.WORKER_LOCK_DURATION_MS,
        limitMax: validatedEnv.WORKER_LIMIT_MAX,
        limitDurationMS: validatedEnv.WORKER_LIMIT_DURATION_MS,
    },
});

export const securityConfig = Object.freeze({
    tokens: {
        // Natively converts standard hex strings into 32-byte binary buffers
        accessTokenSecret: Buffer.from(validatedEnv.ACCESS_TOKEN_SECRET, "hex"),
        refreshTokenSecret: Buffer.from(validatedEnv.REFRESH_TOKEN_SECRET, "hex"),
        accessTokenExpiry: validatedEnv.ACCESS_TOKEN_EXPIRY,
        refreshTokenExpiry: validatedEnv.REFRESH_TOKEN_EXPIRY,
    },
    systemSecret: validatedEnv.SYSTEM_INTERNAL_SECRET,
    maxSessions: validatedEnv.MAX_ALLOWED_SESSIONS,
});

export const oauthConfig = Object.freeze({ google: { clientId: validatedEnv.GOOGLE_CLIENT_ID, clientSecret: validatedEnv.GOOGLE_CLIENT_SECRET, callbackUrl: validatedEnv.GOOGLE_CALLBACK_URL } });
export const dbConfig = Object.freeze({ mongo: { uri: validatedEnv.MONGODB_URI }, redis: { url: validatedEnv.REDIS_URL } });
export const storageConfig = Object.freeze({ cloudinary: { cloudName: validatedEnv.CLOUDINARY_CLOUD_NAME, apiKey: validatedEnv.CLOUDINARY_API_KEY, apiSecret: validatedEnv.CLOUDINARY_API_SECRET } });
export const mailConfig = Object.freeze({ smtp: { user: validatedEnv.EMAIL_USER, pass: validatedEnv.EMAIL_PASS } });

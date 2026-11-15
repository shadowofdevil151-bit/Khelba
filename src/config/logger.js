import pino from "pino";
import { serverConfig } from "./env.js";

export const logger = pino({
    level: serverConfig.logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "password",
            "*.password",
            "token",
            "*.token",
            "accessToken",
            "*.accessToken",
            "refreshToken",
            "*.refreshToken",
            "verificationUrl",
            "*.verificationUrl",
            "resetUrl",
            "*.resetUrl",
            "encryptedPayload",
            "*.encryptedPayload",
            "clientSecret",
            "email_pass"
        ],
        censor: "[REDACTED]"
    }
});

import crypto from "crypto";
import { securityConfig } from "../config/env.js";

// FIXED: Removed the ms() wrapper completely. The variable is already a clean number of seconds!
export const CACHE_KEYS = {

    BLACKLIST_TOKEN: (token) =>
        `blacklist:${crypto.createHash("sha256").update(token).digest("hex")}`,

    PASSWORD_RESET_TOKEN: (hashedToken) =>
        `auth:reset-token:${hashedToken}`,

    PASSWORD_RESET_RATE_LIMIT: (userId) =>
        `auth:password-reset-limit:${userId}`,

    EMAIL_VERIFICATION_RATE_LIMIT: (email) =>
        `auth:email-verification-limit:${email}`,

    EMAIL_VERIFICATION_TOKEN: (hashedToken) =>
        `auth:email-verification:${hashedToken}`,

};

export const CACHE_TTL = {

    BLACKLIST_TOKEN: securityConfig.tokens.accessTokenExpiry,

    PASSWORD_RESET_TOKEN: 60 * 15,

    PASSWORD_RESET_RATE_LIMIT: 60,

    EMAIL_VERIFICATION_RATE_LIMIT: 60,

    EMAIL_VERIFICATION_TOKEN: 60 * 15,

};

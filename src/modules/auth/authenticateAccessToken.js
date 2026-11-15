import mongoose from "mongoose";
import { jwtDecrypt } from "jose";
import { ApiError } from "../../utils/ApiError.js";
import { CacheService } from "../../services/cache.service.js";
import { CACHE_KEYS } from "../../constants/cache.constants.js";
import { securityConfig } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Session } from "../../models/session.model.js";

export const authenticateAccessToken = async (accessToken) => {
    if (typeof accessToken !== "string" || accessToken.length === 0) {
        throw new ApiError(401, "Authentication token is missing.").asWarn();
    }

    if (await CacheService.get(CACHE_KEYS.BLACKLIST_TOKEN(accessToken))) {
        throw new ApiError(401, "Session expired. Please log in again.").asWarn();
    }

    let payload;
    try {
        ({ payload } = await jwtDecrypt(accessToken, securityConfig.tokens.accessTokenSecret));
    } catch (error) {
        const message = error.code === "ERR_JWT_EXPIRED" || error.message?.includes("expired")
            ? "Access token has expired."
            : "Access token is invalid.";
        throw new ApiError(401, message).asWarn();
    }

    const { userId, sessionId, tokenVersion } = payload;
    if (
        typeof userId !== "string" ||
        !mongoose.isValidObjectId(userId) ||
        typeof sessionId !== "string" ||
        !mongoose.isValidObjectId(sessionId) ||
        !Number.isSafeInteger(tokenVersion)
    ) {
        throw new ApiError(401, "Access token is invalid.").asWarn();
    }

    const [user, session] = await Promise.all([
        User.findById(userId).select("_id username avatar role tier tokenVersion status"),
        Session.findOne({
            _id: sessionId,
            user: userId,
            isValid: true,
            expiresAt: { $gt: new Date() }
        }).select("_id")
    ]);

    if (!user || user.status !== "ACTIVE" || user.tokenVersion !== tokenVersion || !session) {
        throw new ApiError(401, "Session has expired or been revoked.").asWarn();
    }

    return {
        token: accessToken,
        user: {
            _id: user._id.toString(),
            username: user.username,
            avatar_url: user.avatar?.url || null,
            role: user.role,
            tier: user.tier,
            tokenVersion: user.tokenVersion
        }
    };
};



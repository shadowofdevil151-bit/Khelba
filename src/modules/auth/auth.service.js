import mongoose from "mongoose";
import { User } from "../../models/user.model.js";
import { Session } from "../../models/session.model.js";
import { ApiError } from "../../utils/ApiError.js";
import crypto from "crypto";
import { CACHE_KEYS, CACHE_TTL } from "../../constants/cache.constants.js";
import { isValidRefreshToken } from "../../utils/isValidRefreshToken.js";
import { runInTransaction } from "../../utils/transaction.js";
import { AppLogger } from "../../utils/logger.js";
import { serverConfig, securityConfig } from "../../config/env.js";
import { CacheService } from "../../services/cache.service.js";
import { GET_USER_PROVIDER } from "../../constants/user.constants.js";
import { GET_JOB_NAME } from "../../constants/jobs.constants.js";
import { mainQueue } from "../../queues/main.queue.js";
import { jwtDecrypt } from "jose";
import { encryptQueuePayload } from "../../utils/queuePayload.js";

const MAX_ALLOWED_SESSIONS = securityConfig.maxSessions;

const enforceSessionCap = async (userId) => {
    const activeSessions = await Session.find({
        user: userId,
        expiresAt: { $gt: new Date() },
        isValid: true
    }).sort({ createdAt: 1 });

    if (activeSessions.length >= MAX_ALLOWED_SESSIONS) {
        const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - MAX_ALLOWED_SESSIONS + 1);
        await Session.updateMany(
            { _id: { $in: sessionsToRevoke.map(({ _id }) => _id) } },
            { $set: { isValid: false } }
        );
    }
};

const hashRefreshToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const educationProfile = (user) => ({
    education_level: user.profile?.education_level || "HSC",
    education_year: user.profile?.education_year || 1,
    education_stream: user.profile?.education_stream || "SCIENCE"
});
const authUserProfile = (user) => ({
    _id: user._id,
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    tier: user.tier,
    avatar: user.avatar,
    profile: educationProfile(user)
});

export const AuthService = {

    async register({ username, email, password, uploadContext }) {
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedUsername = username.toLowerCase().trim();

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { username: normalizedUsername }
            ]
        }).select("_id");

        if (existingUser) {
            throw new ApiError(
                400,
                "An account with this username or email already exists."
            );
        }

        const newUser = await User.create({
            username: normalizedUsername,
            email: normalizedEmail,
            password,
            provider: GET_USER_PROVIDER.LOCAL,
            isEmailVerified: false,
            avatar: {
                publicId: uploadContext.publicId,
                url: uploadContext.url,
                mimeType: uploadContext.mimeType
            }
        });

        const rawVerificationToken = crypto.randomBytes(32).toString("hex");

        const hashedToken = crypto
            .createHash("sha256")
            .update(rawVerificationToken)
            .digest("hex");

        await CacheService.set(CACHE_KEYS.EMAIL_VERIFICATION_TOKEN(hashedToken), newUser._id.toString(), CACHE_TTL.EMAIL_VERIFICATION_TOKEN);

        const verificationUrl = `${serverConfig.frontendUrl}/verify-email?token=${rawVerificationToken}`;

        await mainQueue.add(
            GET_JOB_NAME.sendVerificationEmail,
            { encryptedPayload: await encryptQueuePayload({ email: normalizedEmail, verificationUrl }) }
        );

        return {
            userProfile: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                avatar: newUser.avatar.url,
                isEmailVerified: false,
                profile: educationProfile(newUser)
            }
        };
    },



    async login({ email, password, userAgent, ipAddress }) {
        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail }).select("+password");

        if (!user) {
            throw new ApiError(401, "Invalid email or password credentials provided.");
        }

        if (user.status !== "ACTIVE") {
            throw new ApiError(403, "This account is not active.");
        }

        if (!user.isEmailVerified) {
            throw new ApiError(403, "Your email address is not verified. Please verify your email first.");
        }

        if (user.provider !== GET_USER_PROVIDER.LOCAL) {
            throw new ApiError(400, `This account is linked via ${user.provider}. Please log in using social authentication.`);
        }

        const isPasswordMatch = await user.isPasswordCorrect(password);
        if (!isPasswordMatch) {
            throw new ApiError(401, "Invalid email or password credentials provided.");
        }

        await enforceSessionCap(user._id);

        const sessionObjectId = new mongoose.Types.ObjectId();
        const sessionIdString = sessionObjectId.toString();

        const accessToken = await user.generateAccessToken(sessionIdString);
        const rawRefreshToken = await user.generateRefreshToken(sessionIdString);

        const expiryMs = securityConfig.tokens.refreshTokenExpiry * 1000;
        const expiresAt = new Date(Date.now() + expiryMs);

        await Session.create({
            _id: sessionObjectId,
            user: user._id,
            hashedRefreshToken: rawRefreshToken,
            userAgent: userAgent || "unknown",
            ipAddress: ipAddress || "unknown",
            expiresAt: expiresAt
        });

        return {
            accessToken,
            rawRefreshToken,
            userProfile: authUserProfile(user)
        };
    },


    async handleGoogleSession(user, { userAgent, ipAddress }) {
        if (user.status !== "ACTIVE") {
            throw new ApiError(403, "This account is not active.");
        }

        await enforceSessionCap(user._id);

        const sessionObjectId = new mongoose.Types.ObjectId();
        const sessionIdString = sessionObjectId.toString();

        const accessToken = await user.generateAccessToken(sessionIdString);
        const rawRefreshToken = await user.generateRefreshToken(sessionIdString);

        const expiryMs = securityConfig.tokens.refreshTokenExpiry * 1000;
        const expiresAt = new Date(Date.now() + expiryMs);

        await Session.create({
            _id: sessionObjectId,
            user: user._id,
            hashedRefreshToken: rawRefreshToken,
            userAgent: userAgent || "unknown",
            ipAddress: ipAddress || "unknown",
            expiresAt: expiresAt
        });

        return {
            accessToken,
            rawRefreshToken,
            userProfile: authUserProfile(user)
        };
    },


    async rotateTokens(rawRefreshToken) {
        const decodedToken = await isValidRefreshToken(rawRefreshToken);
        const { userId, sessionId } = decodedToken;
        const user = await User.findById(userId).select("_id username email role tier tokenVersion status avatar profile.education_level profile.education_year profile.education_stream");
        if (!user || user.status !== "ACTIVE") {
            throw new ApiError(401, "User account is no longer active.");
        }

        const newAccessToken = await user.generateAccessToken(sessionId);
        const newRawRefreshToken = await user.generateRefreshToken(sessionId);
        const rotated = await Session.findOneAndUpdate(
            {
                _id: sessionId,
                user: userId,
                isValid: true,
                expiresAt: { $gt: new Date() },
                hashedRefreshToken: hashRefreshToken(rawRefreshToken)
            },
            { $set: { hashedRefreshToken: hashRefreshToken(newRawRefreshToken) } },
            { new: true }
        );
        if (!rotated) {
            throw new ApiError(409, "Refresh token was already used. Please retry with the latest session token.").asInfo();
        }

        return {
            newAccessToken,
            newRawRefreshToken,
            userProfile: authUserProfile(user)
        };
    },

    async logout(refreshToken, accessToken) {
        if (refreshToken) {
            try {
                const decodedRefresh = await isValidRefreshToken(refreshToken);
                await Session.updateOne(
                    { _id: decodedRefresh.sessionId, user: decodedRefresh.userId },
                    { $set: { isValid: false } }
                );
            } catch (error) {
                if (!(error instanceof ApiError) || error.statusCode >= 500) {
                    throw error;
                }
                if (error.statusCode === 409) {
                    const { payload } = await jwtDecrypt(refreshToken, securityConfig.tokens.refreshTokenSecret);
                    await Session.updateOne(
                        { _id: payload.sessionId, user: payload.userId },
                        { $set: { isValid: false } }
                    );
                }
                AppLogger.warn("Ignoring invalid or expired refresh token during logout", { component: "auth-service", service: "logout" });
            }
        }

        if (accessToken) {
            let decodedAccess;
            try {
                ({ payload: decodedAccess } = await jwtDecrypt(accessToken, securityConfig.tokens.accessTokenSecret));
            } catch {
                decodedAccess = null;
            }

            if (
                typeof decodedAccess?.userId === "string" &&
                mongoose.isValidObjectId(decodedAccess.userId) &&
                typeof decodedAccess?.sessionId === "string" &&
                mongoose.isValidObjectId(decodedAccess.sessionId)
            ) {
                await Session.updateOne(
                    { _id: decodedAccess.sessionId, user: decodedAccess.userId },
                    { $set: { isValid: false } }
                );
            }

            const remainingSeconds = Number(decodedAccess?.exp) - Math.floor(Date.now() / 1000);
            if (remainingSeconds > 0) {
                await CacheService.set(
                    CACHE_KEYS.BLACKLIST_TOKEN(accessToken),
                    "true",
                    Math.ceil(remainingSeconds)
                );
            }
        }
    },

    async logoutAll(userId) {
        if (!userId) {
            throw new ApiError(400, "User context identifier is required for global logout request.").asWarn();
        }

        const userIdString = userId.toString();

        await runInTransaction(async (dbSession) => {
            const user = await User.findById(userIdString).session(dbSession);
            if (!user) {
                throw new ApiError(404, "User account no longer exists.");
            }

            user.tokenVersion += 1;
            await user.save({ session: dbSession });
            await Session.updateMany({ user: userIdString }, { $set: { isValid: false } }).session(dbSession);
        });
    },


    async generatePasswordResetToken(email) {
        if (!email || typeof email !== 'string') return null;

        const normalizedEmail = email.toLocaleLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select("_id provider");

        if (!user || user.provider !== GET_USER_PROVIDER.LOCAL) {
            return null;
        }

        const userIdString = user._id.toString();
        const rateLimitKey = CACHE_KEYS.PASSWORD_RESET_RATE_LIMIT(userIdString);
        const accepted = await CacheService.setIfAbsent(
            rateLimitKey,
            "1",
            CACHE_TTL.PASSWORD_RESET_RATE_LIMIT
        );
        if (!accepted) {
            throw new ApiError(429, "Too many password reset attempts. Please wait a minute before requesting another link.").asWarn();
        }

        const rawResetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawResetToken).digest("hex");

        await CacheService.set(CACHE_KEYS.PASSWORD_RESET_TOKEN(hashedToken), userIdString, CACHE_TTL.PASSWORD_RESET_TOKEN);

        return rawResetToken;
    },

    async resetPassword(rawToken, newPassword) {
        if (!rawToken || typeof rawToken !== 'string') {
            throw new ApiError(400, "Invalid token format.").asWarn();
        }

        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
        const tokenKey = CACHE_KEYS.PASSWORD_RESET_TOKEN(hashedToken);

        const userId = await CacheService.get(tokenKey);
        if (!userId) {
            throw new ApiError(400, "Password reset token is invalid or has expired.").asWarn();
        }

        const OldTTL = await CacheService.getTTL(tokenKey);
        const claimedUserId = await CacheService.getDel(tokenKey);
        if (!claimedUserId || claimedUserId !== userId) {
            throw new ApiError(400, "Password reset token is invalid or has expired.").asWarn();
        }

        try {
            await runInTransaction(async (dbSession) => {
                const user = await User.findById(userId).select("+password").session(dbSession);
                if (!user) {
                    throw new ApiError(404, "User account no longer exists.");
                }

                user.password = newPassword;
                user.tokenVersion += 1;
                await user.save({ session: dbSession });

                await Session.updateMany({ user: userId }, { isValid: false }).session(dbSession);

            });

        } catch (error) {
            if (OldTTL !== null) {
                await CacheService.set(tokenKey, userId, Math.max(1, OldTTL));
            }

            if (error instanceof ApiError) throw error;

            const dbFault = new ApiError(500, "Failed to update user's credentials due to an internal server issue.");
            dbFault.cause = error;
            throw dbFault;
        }
    },


    async changePassword(userId, currentPassword, newPassword) {
        if (!userId || !currentPassword || !newPassword) {
            throw new ApiError(400, "All fields are required.").asWarn();
        }

        const userIdString = userId.toString();

        const userPreCheck = await User.findById(userIdString).select("+password");
        if (!userPreCheck) {
            throw new ApiError(404, "User account not found.");
        }

        const isMatch = await userPreCheck.isPasswordCorrect(currentPassword);
        if (!isMatch) {
            throw new ApiError(401, "The current password provided is incorrect.").asWarn();
        }

        const isSamePassword = await userPreCheck.isPasswordCorrect(newPassword);
        if (isSamePassword) {
            throw new ApiError(400, "New password cannot be the same as your current password.").asWarn();
        }

        await runInTransaction(async (dbSession) => {
            const user = await User.findById(userIdString).session(dbSession);
            if (!user) {
                throw new ApiError(404, "User account no longer exists.");
            }

            user.password = newPassword;
            user.tokenVersion += 1;
            await user.save({ session: dbSession });

            await Session.updateMany({ user: user._id }, { isValid: false }).session(dbSession);

        });

    },

    async verifyEmail(rawToken, userAgent, ipAddress) {
        if (!rawToken || typeof rawToken !== "string") {
            throw new ApiError(400, "Invalid or missing verification token.").asWarn();
        }

        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
        const tokenKey = CACHE_KEYS.EMAIL_VERIFICATION_TOKEN(hashedToken);

        const userId = await CacheService.getDel(tokenKey);
        if (!userId) {
            throw new ApiError(400, "Verification token is invalid or has expired.").asWarn();
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User account no longer exists.").asError();
        }

        if (user.isEmailVerified) {
            throw new ApiError(400, "This email address has already been verified.").asWarn();
        }

        user.isEmailVerified = true;
        await user.save();

        await enforceSessionCap(user._id);
        const preGeneratedSessionId = new mongoose.Types.ObjectId();
        const accessToken = await user.generateAccessToken(preGeneratedSessionId);
        const rawRefreshToken = await user.generateRefreshToken(preGeneratedSessionId);

        const expiryMs = securityConfig.tokens.refreshTokenExpiry * 1000;
        const expiresAt = new Date(Date.now() + expiryMs);

        await Session.create({
            _id: preGeneratedSessionId,
            user: user._id,
            hashedRefreshToken: rawRefreshToken,
            userAgent: userAgent || "unknown",
            ipAddress: ipAddress || "unknown",
            expiresAt: expiresAt
        });

        return {
            accessToken,
            rawRefreshToken,
            userProfile: authUserProfile(user)
        };
    },

    async sendEmailVerificationToken(email) {
        if (!email || typeof email !== 'string') {
            throw new ApiError(400, "Invalid email address.").asWarn();
        }

        const normalizedEmail = email.toLocaleLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select("_id provider isEmailVerified");

        if (!user) {
            throw new ApiError(404, "User account with email no longer exist.");
        }
        if (user.provider !== GET_USER_PROVIDER.LOCAL || user.isEmailVerified) {
            throw new ApiError(403, "User email is already verified.").asWarn();
        }

        const rateLimitKey = CACHE_KEYS.EMAIL_VERIFICATION_RATE_LIMIT(normalizedEmail);
        const accepted = await CacheService.setIfAbsent(
            rateLimitKey,
            "1",
            CACHE_TTL.EMAIL_VERIFICATION_RATE_LIMIT
        );
        if (!accepted) {
            throw new ApiError(429, "Too many email verification attempts. Please wait a minute before requesting another link.").asWarn();
        }

        const userIdString = user._id.toString();
        const rawVerificationToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");

        await CacheService.set(CACHE_KEYS.EMAIL_VERIFICATION_TOKEN(hashedToken), userIdString, CACHE_TTL.EMAIL_VERIFICATION_TOKEN);

        const verificationUrl = `${serverConfig.frontendUrl}/verify-email?token=${rawVerificationToken}`;

        await mainQueue.add(
            GET_JOB_NAME.sendVerificationEmail,
            { encryptedPayload: await encryptQueuePayload({ email: normalizedEmail, verificationUrl }) }
        );
        return null;
    },



};

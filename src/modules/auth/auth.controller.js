import { AuthService } from "./auth.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.middleware.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { cookieOptions, clearCookieOptions } from "../../utils/cookieOptions.js";
import { isValidRefreshToken } from "../../utils/isValidRefreshToken.js"
import { Session } from "../../models/session.model.js";
import { serverConfig } from "../../config/env.js";
import { GET_JOB_NAME } from "../../constants/jobs.constants.js";
import { mainQueue } from "../../queues/main.queue.js";
import { encryptQueuePayload } from "../../utils/queuePayload.js";

const clearAuthCookies = (res) => {
    res.clearCookie("refreshToken", clearCookieOptions);
    res.clearCookie("accessToken", clearCookieOptions);
};

export const AuthController = {

    register: asyncHandler(async (req, res) => {
        const { username, email, password } = req.body;

        const userAgent = req.headers["user-agent"] || "unknown";

        const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

        const { userProfile } = await AuthService.register({
            username,
            email,
            password,
            userAgent,
            ipAddress,
            uploadContext: req.avatar
        });

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    userProfile,
                    "Registration successful. Please verify your email. Verification code has been sent."
                )
            );
    }),

    googleLoginCallback: asyncHandler(async (req, res) => {
        const user = req.user;
        if (!user) {
            // return res.redirect(`${serverConfig.frontendUrl}/login?error=Unauthorized`);
            return res.redirect(`${serverConfig.frontendUrl}/login?error=Unauthorized`);
            
        }

        const sessionDetails = {
            userAgent: req.headers["user-agent"] || "unknown",
            ipAddress: req.ip || req.socket.remoteAddress || "unknown"
        };

        const { accessToken, rawRefreshToken } = await AuthService.handleGoogleSession(user, sessionDetails);

        res.clearCookie("accessToken", clearCookieOptions);
        res.cookie("refreshToken", rawRefreshToken, cookieOptions);

        // The refresh token remains HTTP-only; the short-lived access token is
        // handed to the browser only in the fragment, which is not sent to the server.
        res.redirect(`${serverConfig.frontendUrl}/auth/google/callback#token=${encodeURIComponent(accessToken)}`);
    }),

    login: asyncHandler(async (req, res) => {
        const existingCookieToken = req.cookies?.refreshToken;

        clearAuthCookies(res);

        const { email, password } = req.body;
        const userAgent = req.headers["user-agent"] || "unknown";
        const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
        const data = await AuthService.login({ email, password, userAgent, ipAddress });

        if (existingCookieToken) {
            try {
                const decoded = await isValidRefreshToken(existingCookieToken);
                if (decoded?.sessionId) {
                    await Session.updateOne(
                        { _id: decoded.sessionId, user: decoded.userId },
                        { $set: { isValid: false } }
                    );
                }
            } catch (error) {
                if (!(error instanceof ApiError) || error.statusCode >= 500) throw error;
            }
        }

        res.cookie("refreshToken", data.rawRefreshToken, cookieOptions);

        return res
            .status(200)
            .json(new ApiResponse(200, {
                accessToken: data.accessToken,
                userProfile: data.userProfile
            }, "User logged in successfully."));
    }),


    refreshSession: asyncHandler(async (req, res) => {
        res.clearCookie("accessToken", clearCookieOptions);
        const incomingRefreshToken = req.cookies?.refreshToken;
        if (!incomingRefreshToken) {
            clearAuthCookies(res);
            throw new ApiError(401, "Session renewal failed. Refresh token cookie missing.").asWarn();
        }

        let tokens;
        try {
            tokens = await AuthService.rotateTokens(incomingRefreshToken);
        } catch (error) {
            if (error instanceof ApiError && error.statusCode === 401) {
                clearAuthCookies(res);
            }
            throw error;
        }

        const { newAccessToken, newRawRefreshToken, userProfile } = tokens;
        res.clearCookie("accessToken", clearCookieOptions);
        res.cookie("refreshToken", newRawRefreshToken, cookieOptions);

        return res.json(
            new ApiResponse(
                200,
                { user: userProfile, accessToken: newAccessToken },
                "Session tokens rotated successfully!"
            )
        );
    }),

    logout: asyncHandler(async (req, res) => {
        const incomingRefreshToken = req.cookies?.refreshToken;
        const authHeader = req.headers.authorization;
        const bearerMatch = typeof authHeader === "string" && /^Bearer\s+(\S+)$/i.exec(authHeader);
        const currentAccessToken = bearerMatch ? bearerMatch[1] : authHeader?.trim() || req.cookies?.accessToken;

        clearAuthCookies(res);
        await AuthService.logout(incomingRefreshToken, currentAccessToken);

        return res
            .status(200)
            .json(new ApiResponse(200, null, "User logged out successfully. Access terminated instantly."));
    }),


    logoutAll: asyncHandler(async (req, res) => {
        const userId = req.user?._id;
        if (!userId) {
            throw new ApiError(401, "Authentication required.");
        }

        clearAuthCookies(res);
        await AuthService.logoutAll(userId);
        return res
            .status(200)
            .json(new ApiResponse(200, null, "Global forced logout successful. All terminal access keys revoked instantly."));
    }),


    forgotPassword: asyncHandler(async (req, res) => {
        const { email } = req.body;

        const rawResetToken = await AuthService.generatePasswordResetToken(email);

        if (rawResetToken) {
            const resetUrl = `${serverConfig.frontendUrl}/reset-password?token=${rawResetToken}`;

            await mainQueue.add(
                GET_JOB_NAME.sendPasswordResetEmail,
                { encryptedPayload: await encryptQueuePayload({ email: email.toLowerCase().trim(), resetUrl }) }
            );
        }

        return res
            .status(200)
            .json(new ApiResponse(200, null, "If an account matches that email and if user registered locally, a secure reset link has been dispatched."));
    }),

    resetPassword: asyncHandler(async (req, res) => {
        const { token } = req.params;
        const { password } = req.body;

        await AuthService.resetPassword(token, password);

        return res
            .status(200)
            .json(new ApiResponse(200, null, "Password updated successfully. All multi-device tokens invalidated."));
    }),

    changePassword: asyncHandler(async (req, res) => {
        const userId = req.user?._id;
        const { currentPassword, newPassword } = req.body;

        await AuthService.changePassword(userId, currentPassword, newPassword);

        return res
            .status(200)
            .json(new ApiResponse(200, null, "Password modified successfully. Other terminal sessions terminated."));
    }),

    verifyEmail: asyncHandler(async (req, res) => {
        const { token } = req.params;
        const userAgent = req.headers["user-agent"] || "unknown";
        const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

        const data = await AuthService.verifyEmail(token, userAgent, ipAddress);

        res.cookie("refreshToken", data.rawRefreshToken, cookieOptions);

        return res
            .status(200)
            .json(new ApiResponse(200, {
                accessToken: data.accessToken,
                userProfile: data.userProfile
            }, "User logged in successfully."));
    }),

    sendEmailVerificationToken: asyncHandler(async (req, res) => {
        const { email } = req.body;

        await AuthService.sendEmailVerificationToken(email);

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    null,
                    "Email dispatched to your email address."
                )
            );
    }),

};

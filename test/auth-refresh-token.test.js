import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { EncryptJWT, jwtDecrypt } from "jose";
import { User } from "../src/models/user.model.js";
import { Session } from "../src/models/session.model.js";
import { isValidRefreshToken } from "../src/utils/isValidRefreshToken.js";
import { securityConfig } from "../src/config/env.js";
import { cookieOptions } from "../src/utils/cookieOptions.js";

test("refresh token validation uses the configured refresh secret and session", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const sessionId = new mongoose.Types.ObjectId().toString();
    const tokenVersion = 1;
    const token = await new EncryptJWT({ userId, sessionId, tokenVersion })
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setExpirationTime("5m")
        .encrypt(securityConfig.tokens.refreshTokenSecret);

    const originalFindOne = Session.findOne;
    const originalFindById = User.findById;
    Session.findOne = () => Promise.resolve({
        isRefreshTokenCorrect: async (candidate) => candidate === token
    });

    test("refresh token expiry and cookie lifetime follow the configured value", async () => {
        const user = new User({
            _id: new mongoose.Types.ObjectId(),
            tokenVersion: 1
        });
        const token = await user.generateRefreshToken(new mongoose.Types.ObjectId().toString());
        const { payload } = await jwtDecrypt(token, securityConfig.tokens.refreshTokenSecret);
        const remainingSeconds = payload.exp - Math.floor(Date.now() / 1000);

        assert.ok(remainingSeconds <= securityConfig.tokens.refreshTokenExpiry);
        assert.ok(remainingSeconds >= securityConfig.tokens.refreshTokenExpiry - 1);
        assert.equal(cookieOptions.maxAge, securityConfig.tokens.refreshTokenExpiry * 1000);
    });
    User.findById = () => ({
        select: async () => ({ _id: userId, tokenVersion, status: "ACTIVE" })
    });

    try {
        const payload = await isValidRefreshToken(token);
        assert.equal(payload.userId, userId);
        assert.equal(payload.sessionId, sessionId);
        assert.equal(payload.tokenVersion, tokenVersion);
    } finally {
        Session.findOne = originalFindOne;
        User.findById = originalFindById;
    }
});

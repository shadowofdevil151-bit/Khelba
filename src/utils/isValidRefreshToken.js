import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";
import { ApiError } from "./ApiError.js";
import { securityConfig } from "../config/env.js";
import mongoose from "mongoose";
import { jwtDecrypt } from "jose";

const isValidRefreshToken = async (userRefreshToken) => {
  if (!userRefreshToken) {
    throw new ApiError(401, "Refresh token is missing.");
  }

  let decodedPayload;
  try {
    const { payload } = await jwtDecrypt(
      userRefreshToken,
      securityConfig.tokens.refreshTokenSecret
    );
    decodedPayload = payload;
  } catch {
    throw new ApiError(401, "Refresh token is invalid or expired.");
  }

  if (
    typeof decodedPayload?.sessionId !== "string" ||
    !mongoose.isValidObjectId(decodedPayload.sessionId) ||
    typeof decodedPayload?.userId !== "string" ||
    !mongoose.isValidObjectId(decodedPayload.userId) ||
    !Number.isSafeInteger(decodedPayload.tokenVersion)
  ) {
    throw new ApiError(401, "Malformed token structure payload.");
  }

  const [session, user] = await Promise.all([
    Session.findOne({
      _id: decodedPayload.sessionId,
      user: decodedPayload.userId,
      isValid: true,
      expiresAt: { $gt: new Date() }
    }),
    User.findById(decodedPayload.userId).select("_id tokenVersion status")
  ]);

  if (!session) {
    throw new ApiError(401, "Session has expired or been revoked.");
  }

  if (!user || user.status !== "ACTIVE" || decodedPayload.tokenVersion !== user.tokenVersion) {
    throw new ApiError(401, "The user account or session is no longer active.");
  }

  const isMatched = await session.isRefreshTokenCorrect(userRefreshToken);
  if (!isMatched) {
    throw new ApiError(409, "Refresh token has already been rotated. Retry with the latest token.").asInfo();
  }

  return decodedPayload;
};

export { isValidRefreshToken };

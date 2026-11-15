import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "./asyncHandler.middleware.js";
import { authenticateAccessToken } from "../modules/auth/authenticateAccessToken.js";

export const authenticateUser = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let accessToken = null;

    if (authHeader) {
        const bearerMatch = /^Bearer\s+(\S+)$/i.exec(authHeader);
        accessToken = bearerMatch ? bearerMatch[1] : authHeader.trim();
    } else if (typeof req.cookies?.accessToken === "string") {
        accessToken = req.cookies.accessToken;
    }

    const authenticated = await authenticateAccessToken(accessToken);
    req.token = authenticated.token;
    req.user = authenticated.user;
    return next();
});

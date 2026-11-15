import { serverConfig } from "../config/env.js";
import { securityConfig } from "../config/env.js";

const expiryMs = securityConfig.tokens.refreshTokenExpiry * 1000;

export const cookieOptions = {
    httpOnly: true, // Prevents XSS script read access
    secure: serverConfig.env === "production", // HTTPS only in production
    sameSite: "Lax",
    maxAge: expiryMs,
    path: "/" // Crucial: Explicitly defines the routing scope root
};

// FIXED: Clean export configuration built specifically for clearing actions safely
export const clearCookieOptions = {
    httpOnly: true,
    secure: serverConfig.env === "production",
    sameSite: "Lax",
    path: "/"
};

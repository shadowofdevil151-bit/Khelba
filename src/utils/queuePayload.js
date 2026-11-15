import { EncryptJWT, jwtDecrypt } from "jose";
import { securityConfig } from "../config/env.js";

const SYSTEM_SECRET = Buffer.from(securityConfig.systemSecret, "hex");

export const encryptQueuePayload = (payload) =>
    new EncryptJWT(payload)
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .encrypt(SYSTEM_SECRET);

export const decryptQueuePayload = async (encryptedPayload) => {
    const { payload } = await jwtDecrypt(encryptedPayload, SYSTEM_SECRET);
    return payload;
};

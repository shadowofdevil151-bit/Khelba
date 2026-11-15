"use client";
import { io } from "socket.io-client";
import { API_ORIGIN, tokenStore } from "./api";
export const connectSocket = (namespace, options = {}) => io(`${API_ORIGIN}${namespace}`, {
    ...options,
    auth: (callback) => {
        const extraAuth = typeof options.auth === "function" ? options.auth() : options.auth;
        callback({ accessToken: tokenStore.get(), ...(extraAuth || {}) });
    },
    transports: ["websocket", "polling"],
});

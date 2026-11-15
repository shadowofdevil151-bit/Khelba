import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { dbConfig, serverConfig } from "../config/env.js";
import { AppLogger } from "../utils/logger.js";
import { authenticateAccessToken } from "../modules/auth/authenticateAccessToken.js";
import { claimBattleSocket } from "../modules/battle/battle.socket.js";
import { registerBattleSocketHandlers } from "../modules/battle/battle.socket.js";
import { NotificationService } from "../modules/notification/notification.service.js";
import { ChatService } from "../modules/chat/chat.service.js";
import { CHAT_CONFIG } from "../modules/chat/chat.constants.js";
import { shutdownState } from "../../shutdownState.js";

let battleNamespace;
let notificationNamespace;
let chatNamespace;

const socketHandshakeError = (message, code, retryable) => {
    const error = new Error(message);
    error.data = { code, retryable };
    return error;
};

export const getBattleNamespace = () => {
    if (!battleNamespace) {
        throw new Error("Battle Socket.IO namespace has not been initialized.");
    }
    return battleNamespace;
};
export const getNotificationNamespace = () => {
    if (!notificationNamespace) throw new Error("Notification namespace has not been initialized.");
    return notificationNamespace;
};
export const getChatNamespace = () => {
    if (!chatNamespace) throw new Error("Chat Socket.IO namespace has not been initialized.");
    return chatNamespace;
};

const createRedisClient = (name) => {
    const client = new Redis(dbConfig.redis.url, {
        connectionName: `khelba-socket-${name}`,
        connectTimeout: 5000,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 100, 2000)
    });
    client.on("error", (error) => {
        AppLogger.error("Socket.IO Redis adapter connection error", error, {
            component: "socket-redis-adapter",
            client: name
        });
    });
    return client;
};

export const createSocketServer = async (httpServer) => {
    const pubClient = createRedisClient("publisher");
    const subClient = createRedisClient("subscriber");

    try {
        let readinessTimeout;
        try {
            await Promise.race([
                Promise.all([pubClient.ping(), subClient.ping()]),
                new Promise((_, reject) => {
                    readinessTimeout = setTimeout(
                        () => reject(new Error("Socket.IO Redis adapter readiness timed out.")),
                        10000
                    );
                })
            ]);
        } finally {
            clearTimeout(readinessTimeout);
        }

        const io = new Server(httpServer, {
            cors: {
                origin: serverConfig.allowedOrigins,
                credentials: true,
                methods: ["GET", "POST"]
            },
            allowRequest: (request, callback) => {
                const origin = request.headers.origin;
                const allowed = !origin || serverConfig.allowedOrigins.includes(origin);
                callback(allowed ? null : "Origin is not allowed.", allowed);
            },
            pingInterval: 25000,
            pingTimeout: 20000,
            connectTimeout: 10000,
            maxHttpBufferSize: 1_000_000
        });

        io.adapter(createAdapter(pubClient, subClient));

        const battle = io.of("/battle");
        battleNamespace = battle;
        const authenticateSocket = async (socket, next) => {
            if (shutdownState.isShuttingDown) {
                return next(new Error("Server is shutting down."));
            }

            try {
                const authorization = socket.handshake.headers?.authorization;
                const bearerToken = typeof authorization === "string"
                    ? /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
                    : undefined;
                const token = socket.handshake.auth?.accessToken || bearerToken;

                if (!token) {
                    return next(new Error("Authentication failed: Missing token."));
                }

                const authenticated = await authenticateAccessToken(token);
                socket.data.user = authenticated.user;
                await socket.join(authenticated.user._id);
                if (socket.nsp.name === "/battle") {
                    try {
                        await claimBattleSocket(socket, battle);
                    } catch (error) {
                        await socket.leave(authenticated.user._id);
                        throw error;
                    }
                }
                return next();
            } catch (error) {
                if (error.code === "BATTLE_SOCKET_IN_USE") {
                    return next(error);
                }
                if (!(error instanceof Error) || !("statusCode" in error) || error.statusCode >= 500) {
                    AppLogger.error("Battle socket authentication dependency failed", error, {
                        component: "battle-socket-auth"
                    });
                    return next(socketHandshakeError(
                        "Authentication is temporarily unavailable.",
                        "SOCKET_AUTH_TEMPORARY",
                        true
                    ));
                }
                return next(socketHandshakeError("Authentication failed.", "AUTHENTICATION_FAILED", false));
            }
        };

        battle.use(authenticateSocket);
        registerBattleSocketHandlers(battle);

        const notifications = io.of("/notifications");
        notificationNamespace = notifications;
        notifications.use(authenticateSocket);
        notifications.on("connection", (socket) => {
            const userId = String(socket.data.user._id);
            socket.join(userId);
            NotificationService.list(userId)
                .then((items) => socket.emit("notification:snapshot", items))
                .catch((error) => AppLogger.error("Notification snapshot failed", error, {
                    component: "notification-socket", userId
                }));
            socket.on("notification:seen", (ids, acknowledge) => {
                NotificationService.markSeen(userId, Array.isArray(ids) ? ids : null)
                    .then((result) => typeof acknowledge === "function" && acknowledge({ success: true, ...result }))
                    .catch((error) => typeof acknowledge === "function" && acknowledge({ success: false, message: error.message }));
            });
        });

        const chat = io.of("/chat");
        chatNamespace = chat;
        chat.use(authenticateSocket);
        chat.on("connection", (socket) => {
            const userId = String(socket.data.user._id);
            socket.emit("chat:config", {
                maxMessageLength: CHAT_CONFIG.MAX_MESSAGE_LENGTH,
                messagesPerMinute: CHAT_CONFIG.RATE_LIMIT,
                historyLimit: CHAT_CONFIG.HISTORY_LIMIT
            });

            const sendError = (acknowledge, error) => {
                const response = {
                    success: false,
                    statusCode: error.statusCode || 500,
                    message: error.statusCode && error.statusCode < 500
                        ? error.message
                        : "Chat request could not be processed."
                };
                if (typeof acknowledge === "function") acknowledge(response);
                else socket.emit("chat:error", response);
            };

            socket.on("chat:open", async (payload, acknowledge) => {
                const otherUserId = String(payload?.userId || "");
                try {
                    if (socket.data.chatUserId && socket.data.chatUserId !== String(otherUserId)) {
                        await ChatService.clearPresence(userId, socket.data.chatUserId);
                    }
                    await ChatService.setPresence(userId, otherUserId);
                    socket.data.chatUserId = otherUserId;
                    const messages = await ChatService.snapshot(userId, otherUserId);
                    socket.emit("chat:snapshot", { userId: otherUserId, messages });
                    if (typeof acknowledge === "function") acknowledge({ success: true });
                } catch (error) {
                    if (socket.data.chatUserId === otherUserId) {
                        await ChatService.clearPresence(userId, otherUserId);
                        socket.data.chatUserId = undefined;
                    }
                    sendError(acknowledge, error);
                }
            });

            socket.on("chat:close", async (payload) => {
                await ChatService.clearPresence(userId, payload?.userId);
                if (!payload?.userId || socket.data.chatUserId === String(payload.userId)) {
                    socket.data.chatUserId = undefined;
                }
            });

            socket.on("chat:presence", async (payload) => {
                try {
                    const otherUserId = payload?.userId;
                    await ChatService.setPresence(userId, otherUserId);
                    socket.data.chatUserId = String(otherUserId);
                } catch (error) {
                    AppLogger.warn("Chat presence refresh failed", {
                        component: "chat-socket",
                        userId,
                        error: error.message
                    });
                }
            });

            socket.on("disconnect", () => {
                ChatService.clearPresence(userId, socket.data.chatUserId).catch(() => {});
            });

            socket.on("chat:send", async (payload, acknowledge) => {
                try {
                    const recipientId = payload?.recipientId;
                    const message = await ChatService.send(userId, recipientId, payload?.text);
                    const event = {
                        conversationUserId: userId,
                        ...message,
                        sender: String(message.sender)
                    };
                    chat.to(userId).to(String(recipientId)).emit("chat:message", event);
                    if (typeof acknowledge === "function") acknowledge({ success: true, message: event });
                } catch (error) {
                    sendError(acknowledge, error);
                }
            });

            socket.on("chat:typing", async (payload) => {
                try {
                    const recipientId = String(payload?.recipientId || "");
                    if (!recipientId || !(await ChatService.isFriend?.(userId, recipientId))) return;
                    chat.to(recipientId).emit("chat:typing", {
                        userId,
                        isTyping: payload?.isTyping === true
                    });
                } catch (error) {
                    AppLogger.warn("Chat typing relay failed", {
                        component: "chat-socket",
                        userId,
                        error: error.message
                    });
                }
            });
        });

        AppLogger.info("Socket.IO Redis adapter is ready", {
            component: "socket-server",
            namespace: battle.name
        });

        return {
            io,
            battle,
            close: async () => {
                await new Promise((resolve) => io.close(resolve));
                battleNamespace = undefined;
                notificationNamespace = undefined;
                chatNamespace = undefined;
                const results = await Promise.allSettled([pubClient.quit(), subClient.quit()]);
                const errors = results
                    .filter((result) => result.status === "rejected")
                    .map((result) => result.reason);
                if (errors.length) {
                    throw new AggregateError(errors, "Socket.IO Redis adapter clients failed to close cleanly.");
                }
            }
        };
    } catch (error) {
        battleNamespace = undefined;
        chatNamespace = undefined;
        pubClient.disconnect();
        subClient.disconnect();
        throw error;
    }
};

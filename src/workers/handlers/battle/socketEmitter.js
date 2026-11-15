import { Emitter } from "@socket.io/redis-emitter";
import Redis from "ioredis";
import { dbConfig } from "../../../config/env.js";
import { AppLogger } from "../../../utils/logger.js";

const ADAPTER_KEY = "socket.io";
const NAMESPACE = "/battle";
let redisClient;
let battleEmitter;

export const createBattleEmitter = (client) =>
    new Emitter(client, { key: ADAPTER_KEY }).of(NAMESPACE);

export const initializeBattleEmitter = async () => {
    if (battleEmitter) return;

    const client = new Redis(dbConfig.redis.url, {
        connectionName: "khelba-battle-emitter",
        connectTimeout: 5000,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 100, 2000)
    });
    client.on("error", (error) => {
        AppLogger.error("Battle worker Socket.IO emitter Redis error", error, {
            component: "battle-socket-emitter"
        });
    });

    let timeout;
    try {
        await Promise.race([
            client.ping(),
            new Promise((_, reject) => {
                timeout = setTimeout(
                    () => reject(new Error("Battle worker Socket.IO emitter readiness timed out.")),
                    10000
                );
            })
        ]);
        redisClient = client;
        battleEmitter = createBattleEmitter(client);
    } catch (error) {
        client.disconnect();
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

export const emitBattleRoomEvent = (roomId, eventName, payload) => {
    if (!battleEmitter) {
        throw new Error("Battle worker Socket.IO emitter is not initialized.");
    }
    if (typeof roomId !== "string" || roomId.length === 0) {
        throw new TypeError("A battle room ID is required.");
    }
    if (typeof eventName !== "string" || eventName.length === 0) {
        throw new TypeError("A battle event name is required.");
    }

    return battleEmitter.to(roomId).emit(eventName, payload);
};

export const emitBattlePlayers = (state, eventName, payload) => {
    if (!state || !Array.isArray(state.players)) {
        throw new TypeError("Battle player list is missing.");
    }

    const recipients = state.players.filter((userId) =>
        !state.isBot || userId !== state.botuserid
    );
    for (const userId of recipients) {
        const recipientPayload = typeof payload === "function"
            ? payload(userId)
            : payload;
        emitBattleRoomEvent(userId, eventName, recipientPayload);
    }
};

export const closeBattleEmitter = async () => {
    const client = redisClient;
    redisClient = undefined;
    battleEmitter = undefined;
    if (client) await client.quit();
};

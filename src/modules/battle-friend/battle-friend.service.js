/*
 * Invite notification type: "friend_battle_request".
 * Stored payload: { requestId, matchId, senderId, senderUsername, senderAvatar, subjectCode, chapter, online, expiresIn, expiresAt }.
 * Accept endpoint: POST /api/v1/friend-battles/:requestId/accept; no socket accept event.
 * Expiry timing: Redis EX 120s (120,000ms); no separate cancel job.
 * Notification click URL: /battle?battleRequestId=<payload.requestId>.
 * "Expired" fires when the Redis invite key, whose TTL starts at create-time SET, no longer exists when accept/reject runs.
 */

import { randomUUID } from "node:crypto";
import { redis } from "../../config/redis.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../models/user.model.js";
import { UserService } from "../user/user.service.js";
import { NotificationService } from "../notification/notification.service.js";
import { BATTLE_KEYS } from "../battle/battle.redis.js";
import { BattleService } from "../battle/battle.service.js";
import { getBattleNamespace } from "../../socket/index.js";

const key = (id) => `battle:friend-request:${id}`;
const acceptedKey = (id) => `battle:friend-request-result:${id}`;
const ttl = 120;

export const FriendBattleService = {
    async create(userId, targetId, subjectCode, chapter) {
        if (!(await UserService.isFriend(userId, targetId))) throw new ApiError(403, "You can challenge only friends.");
        if (await redis.exists(BATTLE_KEYS.inBattle(userId)) || await redis.exists(BATTLE_KEYS.inBattle(targetId))) throw new ApiError(409, "A player is already in a battle.");
        const requestId = randomUUID();
        const sender = await User.findById(userId).select("_id username avatar").lean();
        if (!sender) throw new ApiError(404, "Battle requester not found.");
        const online = Boolean(await redis.get(BATTLE_KEYS.socket(targetId)));
        const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
        await redis.set(key(requestId), JSON.stringify({ requestId, from: String(userId), to: String(targetId), subjectCode, chapter }), "EX", ttl, "NX");
        await NotificationService.create({
            recipient: targetId,
            actor: userId,
            type: "friend_battle_request",
            payload: {
                requestId,
                matchId: requestId,
                senderId: String(sender._id),
                senderUsername: sender.username,
                senderAvatar: sender.avatar?.url || null,
                subjectCode,
                chapter,
                online,
                expiresIn: ttl,
                expiresAt
            }
        });
        return { requestId, matchId: requestId, online, expiresIn: ttl, expiresAt };
    },
    async cancel(userId, requestId) {
        const raw = await redis.get(key(requestId));
        if (!raw) return { requestId, status: "expired" };
        const request = JSON.parse(raw);
        if (request.from !== String(userId)) {
            throw new ApiError(403, "Only the requester can cancel this request.");
        }
        await redis.del(key(requestId));
        await NotificationService.create({ recipient: request.to, actor: userId, type: "friend_battle_abandoned", payload: { requestId } });
        return { requestId, status: "cancelled" };
    },
    async accept(userId, requestId) {
        const acceptedRaw = await redis.get(acceptedKey(requestId));
        if (acceptedRaw) return JSON.parse(acceptedRaw);
        const raw = await redis.getdel(key(requestId));
        if (!raw) {
            const completedRaw = await redis.get(acceptedKey(requestId));
            if (completedRaw) return JSON.parse(completedRaw);
            throw new ApiError(410, "Battle request expired.");
        }
        const request = JSON.parse(raw);
        if (request.to !== String(userId)) {
            await redis.set(key(requestId), raw, "EX", ttl, "NX");
            throw new ApiError(403, "This battle request is not for you.");
        }
        if (!(await UserService.isFriend(userId, request.from))) {
            await redis.set(key(requestId), raw, "EX", ttl, "NX");
            throw new ApiError(409, "Friendship is no longer active.");
        }
        let result;
        try {
            result = await BattleService.startFriend({
                requesterId: request.from,
                opponentId: request.to,
                subjectCode: request.subjectCode,
                chapter: request.chapter
            });
        } catch (error) {
            await redis.set(key(requestId), raw, "EX", ttl, "NX");
            throw error;
        }
        const response = {
            matchId: result.battleId,
            battleId: result.battleId,
            roomId: result.battleId,
            opponent: { userId: String(request.from) },
            subject: { code: request.subjectCode, chapter: request.chapter },
            expiresAt: null
        };
        await redis.set(acceptedKey(requestId), JSON.stringify(response), "EX", 300);
        await NotificationService.create({
            recipient: request.from,
            actor: userId,
            type: "friend_battle_accepted",
            payload: { requestId, matchId: result.battleId, battleId: result.battleId }
        });
        return response;
    },
    async reject(userId, requestId) {
        const raw = await redis.getdel(key(requestId));
        if (!raw) throw new ApiError(410, "Battle request expired.");
        const request = JSON.parse(raw);
        if (request.to !== String(userId)) {
            await redis.set(key(requestId), raw, "EX", ttl, "NX");
            throw new ApiError(403, "This battle request is not for you.");
        }
        getBattleNamespace()?.to(request.from).emit("FRIEND_BATTLE_REJECTED", { requestId });
        await NotificationService.create({
            recipient: request.from,
            actor: userId,
            type: "friend_battle_rejected",
            payload: { requestId, reason: "rejected" }
        });
        return { rejected: true, requestId };
    }
};

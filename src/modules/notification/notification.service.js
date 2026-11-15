import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { Notification } from "../../models/notification.model.js";
import { User } from "../../models/user.model.js";
import { getNotificationNamespace } from "../../socket/index.js";
import { redis } from "../../config/redis.js";

const trimSeen = async (recipient) => {
    const seen = await Notification.find({ recipient, seen: true })
        .sort({ createdAt: -1 }).select("_id").skip(15).lean();
    if (seen.length) await Notification.deleteMany({ _id: { $in: seen.map((item) => item._id) } });
};

const chatNotificationId = (recipient, sender) => new mongoose.Types.ObjectId(
    createHash("sha256").update(`${recipient}:${sender}`).digest("hex").slice(0, 24)
);

const enrichChatPayload = async (payload) => {
    if (!payload?.senderId) return payload;
    if (payload.senderName && payload.senderAvatar !== undefined) return payload;
    const sender = await User.findById(payload.senderId).select("username avatar").lean();
    return {
        ...payload,
        senderName: payload.senderName ?? sender?.username ?? null,
        senderAvatar: payload.senderAvatar !== undefined
            ? payload.senderAvatar
            : (sender?.avatar?.url ?? null)
    };
};

export const NotificationService = {
    async create({ recipient, actor = null, type, payload = {} }) {
        if (type === "friend_chat" && payload.senderId) {
            const existing = await Notification.findOne({
                recipient,
                type,
                "payload.senderId": String(payload.senderId)
            }).sort({ createdAt: -1 });
            
            if (existing) {
            if (existing.seen || existing.seenAt) {
                let senderName = payload.senderName;
                let senderAvatar = payload.senderAvatar;
                if (!senderName || senderAvatar === undefined) {
                    const sender = await User.findById(payload.senderId).select("username avatar").lean();
                    if (sender) {
                        senderName = senderName || sender.username || null;
                        senderAvatar = senderAvatar !== undefined ? senderAvatar : (sender.avatar?.url || null);
                    }
                }
                const enrichedPayload = { ...payload, senderName, senderAvatar };
                existing.seen = false;
                existing.seenAt = null;
                existing.createdAt = new Date();   // bubble to top of list
                existing.payload = { ...existing.payload, ...enrichedPayload };
                await existing.save();
                try {
                    getNotificationNamespace()
                        .to(String(recipient))
                        .emit("notification:new", existing.toObject());
                } catch { /* best effort */ }
            }
            return existing;
        }

            const _id = chatNotificationId(recipient, payload.senderId);
            let result;
            try {
                result = await Notification.updateOne(
                    { _id },
                    { $setOnInsert: { _id, recipient, actor, type, payload: await enrichChatPayload(payload) } },
                    { upsert: true }
                );
            } catch (error) {
                if (error?.code !== 11000) throw error;
            }
            const notification = await Notification.findById(_id);
            if (!notification) throw new Error("Chat notification could not be persisted.");
            if (!result?.upsertedCount) return notification;
            await trimSeen(recipient);
            try {
                getNotificationNamespace().to(String(recipient)).emit("notification:new", notification.toObject());
            } catch { /* socket delivery is best effort; MongoDB is the source of truth */ }
            return notification;
        }
        const notification = await Notification.create({ recipient, actor, type, payload });
        await trimSeen(recipient);
        try {
            getNotificationNamespace().to(String(recipient)).emit("notification:new", notification.toObject());
        } catch { /* socket delivery is best effort; MongoDB is the source of truth */ }
        return notification;
    },
    async removeFriendRequest(recipient, actor) {
        const notifications = await Notification.find({
            recipient,
            actor,
            type: "friend_request"
        }).select("_id").lean();
        if (!notifications.length) return;
        await Notification.deleteMany({ _id: { $in: notifications.map(({ _id }) => _id) } });
        try {
            const namespace = getNotificationNamespace();
            for (const { _id } of notifications) {
                namespace.to(String(recipient)).emit("notification:deleted", String(_id));
            }
        } catch { /* socket delivery is best effort; MongoDB is the source of truth */ }
    },
    async list(recipient) {
        const items = await Notification.find({ recipient }).sort({ createdAt: -1 }).limit(100).lean();
        const chatSenders = new Set();
        const deduplicated = items.filter((item) => {
            if (item.type !== "friend_chat") return true;
            const senderId = String(item.payload?.senderId || item.actor || "");
            if (!senderId || chatSenders.has(senderId)) return false;
            chatSenders.add(senderId);
            return true;
        });
        return Promise.all(deduplicated.map(async (item) => {
            if (item.type !== "friend_battle_request" || !item.payload?.requestId) return item;
            const active = await redis.exists(`battle:friend-request:${item.payload.requestId}`);
            if (active) return item;
            await Notification.updateOne({ _id: item._id, type: item.type }, {
                $set: { type: "friend_battle_abandoned", "payload.abandoned": true }
            });
            return { ...item, type: "friend_battle_abandoned", payload: { ...item.payload, abandoned: true } };
        }));
    },
    async markSeen(recipient, ids = null) {
        const filter = { recipient };
        if (Array.isArray(ids) && ids.length) filter._id = { $in: ids };
        await Notification.updateMany(filter, { $set: { seen: true, seenAt: new Date() } });
        await trimSeen(recipient);
        return { marked: true };
    },
    async clearChat(recipient, otherUserId) {
        await Notification.deleteMany({
            recipient,
            type: "friend_chat",
            "payload.senderId": String(otherUserId)
        });
    }
};

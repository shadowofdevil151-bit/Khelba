import { Chat } from "../../models/chat.model.js";
import mongoose from "mongoose";
import { UserService } from "../user/user.service.js";
import { User } from "../../models/user.model.js";
import { redis } from "../../config/redis.js";
import { ApiError } from "../../utils/ApiError.js";
import { NotificationService } from "../notification/notification.service.js";
import { CHAT_CONFIG } from "./chat.constants.js";

const pair = (a, b) => [String(a), String(b)].sort();
const chatKey = (a, b) => pair(a, b).join(":");
const rateKey = (a) => `chat:rate:${a}`;
const presenceKey = (userId, otherUserId) => `chat:active:${userId}:${otherUserId}`;
const cleanText = (text) => typeof text === "string" && text.trim().length > 0 && text.length <= CHAT_CONFIG.MAX_MESSAGE_LENGTH && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text);
const validateUserId = (id) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Chat user id is invalid.");
    return String(id);
};
const normalizeMessages = (messages) => messages.map((message) => ({
    ...message,
    _id: String(message._id),
    sender: String(message.sender),
    createdAt: message.createdAt
}));

export const ChatService = {
    async setPresence(userId, otherUserId) {
        validateUserId(userId);
        validateUserId(otherUserId);
        if (!(await UserService.isFriend(userId, otherUserId))) {
            throw new ApiError(403, "You can chat only with friends.");
        }
        await redis.set(presenceKey(userId, otherUserId), "1", "EX", 120);
    },
    async clearPresence(userId, otherUserId) {
        if (mongoose.isValidObjectId(userId) && mongoose.isValidObjectId(otherUserId)) {
            await redis.del(presenceKey(userId, otherUserId));
        }
    },
    async isViewingConversation(userId, otherUserId) {
        validateUserId(userId);
        validateUserId(otherUserId);
        return (await redis.exists(presenceKey(userId, otherUserId))) === 1;
    },
    async isFriend(userId, otherId) {
        return UserService.isFriend(userId, otherId);
    },
    async snapshot(userId, otherId) {
        validateUserId(userId);
        validateUserId(otherId);
        if (!(await UserService.isFriend(userId, otherId))) throw new ApiError(403, "You can chat only with friends.");
        const chat = await Chat.findOne({ chatKey: chatKey(userId, otherId) }).lean()
            || await Chat.findOne({ participants: pair(userId, otherId) }).lean();
        await NotificationService.clearChat(userId, otherId);
        return normalizeMessages(chat?.messages || []);
    },
    async send(senderId, recipientId, text) {
        validateUserId(senderId);
        validateUserId(recipientId);
        if (!cleanText(text)) throw new ApiError(400, "Message must be 1 to 500 text or emoji characters.");
        if (!(await UserService.isFriend(senderId, recipientId))) throw new ApiError(403, "You can chat only with friends.");
        const count = await redis.incr(rateKey(senderId));
        if (count === 1) await redis.expire(rateKey(senderId), CHAT_CONFIG.RATE_WINDOW_SECONDS);
        if (count > CHAT_CONFIG.RATE_LIMIT) throw new ApiError(429, "Chat rate limit reached.");
        const participants = pair(senderId, recipientId);
        const key = chatKey(senderId, recipientId);
        const message = { sender: senderId, text: text.trim() };
        const existingChat = await Chat.findOne({
            $or: [{ chatKey: key }, { participants }]
        }).select("_id").lean();
        const chat = await Chat.findOneAndUpdate(
            existingChat ? { _id: existingChat._id } : { chatKey: key },
            { $set: { chatKey: key }, $setOnInsert: { participants }, $push: { messages: { $each: [message], $slice: -CHAT_CONFIG.HISTORY_LIMIT } } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();
        const actor = await User.findById(senderId).select("username").lean();
        if (!(await this.isViewingConversation(recipientId, senderId))) {
            await NotificationService.create({
                recipient: recipientId,
                actor: senderId,
                type: "friend_chat",
                payload: { senderId: String(senderId), username: actor?.username || "" }
            });
        }
        return normalizeMessages([chat.messages.at(-1)])[0];
    },
    list(userId, otherId) { return this.snapshot(userId, otherId); },
    async remove(userId, otherId) {
        await Chat.deleteOne({ $or: [{ chatKey: chatKey(userId, otherId) }, { participants: pair(userId, otherId) }] });
    }
};

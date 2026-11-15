import mongoose from "mongoose";
import { serverConfig } from "../config/env.js";

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    type: { type: String, required: true, maxlength: 48 },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    seen: { type: Boolean, default: false, index: true },
    seenAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, index: true }
}, { versionKey: false, autoIndex: serverConfig.env !== "production" });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, seen: 1, createdAt: -1 });
notificationSchema.index({ seenAt: 1 }, { expireAfterSeconds: 3600, partialFilterExpression: { seenAt: { $type: "date" } } });

export const Notification = mongoose.model("Notification", notificationSchema);

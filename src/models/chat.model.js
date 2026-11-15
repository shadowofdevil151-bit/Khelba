import mongoose from "mongoose";
import { serverConfig } from "../config/env.js";

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const chatSchema = new mongoose.Schema({
    participants: { type: [mongoose.Schema.Types.ObjectId], required: true },
    chatKey: { type: String, required: false, index: false },
    messages: { type: [messageSchema], default: [] }
}, { timestamps: true, autoIndex: serverConfig.env !== "production" });

chatSchema.index({ participants: 1 });
chatSchema.index({ chatKey: 1 }, { unique: true, sparse: true });

export const Chat = mongoose.model("Chat", chatSchema);

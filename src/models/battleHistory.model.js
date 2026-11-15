import mongoose from "mongoose";
import { serverConfig } from "../config/env.js";

const battleHistorySchema = new mongoose.Schema(
    {
        battleId: { type: String, required: true, unique: true },
        subject_code: { type: String, required: true },
        chapter: { type: Number, required: true },
        questions: { type: [mongoose.Schema.Types.Mixed], required: true },
        players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
        scores: { type: Map, of: Number, required: true },
        players_answers: { type: mongoose.Schema.Types.Mixed, required: true },
        winner: { type: String, required: true },
        players_answers_durations: { type: mongoose.Schema.Types.Mixed, required: true },
        player_results: { type: mongoose.Schema.Types.Mixed, required: true },
        botuserid: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        isBot: { type: Boolean, default: false },
        isForfeit: { type: Boolean, default: false },
        forfeitedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        finalizedAt: { type: Date, required: true }
    },
    {
        timestamps: true,
        autoIndex: serverConfig.env !== "production"
    }
);

export const BattleHistory = mongoose.model("BattleHistory", battleHistorySchema);

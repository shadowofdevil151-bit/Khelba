import mongoose from "mongoose";
import { serverConfig } from "../config/env.js";

const battleReportSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
        battle_count: {
            total: { type: Number, default: 0 },
            draw: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            win: { type: Number, default: 0 }
        },
        battle_points: { type: Number, default: 0 },
        performance: {
            answered_questions: { type: Number, default: 0 },
            correct_answers: { type: Number, default: 0 },
            wrong_answers: { type: Number, default: 0 },
            timed_out_answers: { type: Number, default: 0 },
            total_answer_time: { type: Number, default: 0 },
            accuracy: { type: Number, default: 0 }
        },
        streak: {
            currentStreak: { type: Number, default: 0 },
            longest_streak: { type: Number, default: 0 },
            lastMatchDate: { type: String, default: null },
            timezone: { type: String, default: "Asia/Dhaka" }
        }
    },
    {
        timestamps: true,
        autoIndex: serverConfig.env !== "production"
    }
);

battleReportSchema.index({ battle_points: -1, user_id: 1 });

export const BattleReport = mongoose.model("BattleReport", battleReportSchema);

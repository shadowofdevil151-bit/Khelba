import mongoose from "mongoose";
import { serverConfig } from "../config/env.js";

const chapterReportSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        subject_code: { type: String, required: true },
        chapter: { type: Number, required: true },
        right_pool: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Mcq" }], default: [] },
        wrong_pool: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Mcq" }], default: [] },
        wrong_answers: { type: mongoose.Schema.Types.Mixed, default: {} },
        total_right_answer: { type: Number, default: 0, min: 0 },
        total_wrong_answer: { type: Number, default: 0, min: 0 }
    },
    {
        timestamps: true,
        autoIndex: serverConfig.env !== "production"
    }
);

chapterReportSchema.index(
    { user_id: 1, subject_code: 1, chapter: 1 },
    { unique: true, name: "unique_user_subject_chapter_report" }
);

export const ChapterReport = mongoose.model("ChapterReport", chapterReportSchema);

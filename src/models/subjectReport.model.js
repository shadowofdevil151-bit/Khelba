import mongoose from "mongoose";
import { serverConfig } from "../config/env.js";

const subjectChapterSchema = new mongoose.Schema({
    chapter: { type: Number, required: true },
    chapter_report_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChapterReport",
        required: true
    }
}, { _id: false });

const subjectReportSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        subject_code: { type: String, required: true },
        chapters_data: { type: [subjectChapterSchema], default: [] }
    },
    {
        timestamps: true,
        autoIndex: serverConfig.env !== "production"
    }
);

subjectReportSchema.index(
    { user_id: 1, subject_code: 1 },
    { unique: true, name: "unique_user_subject_report" }
);

export const SubjectReport = mongoose.model("SubjectReport", subjectReportSchema);

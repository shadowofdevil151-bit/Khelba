import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
    {
        board: { type: String, default: null, uppercase: true },
        college: { type: String, default: null, uppercase: true },
        year: { type: Number, default: null },
        question_number: { type: String, required: true },
        context: { type: String, default: null },
        question: { type: String, required: true },
        options: {
            type: [String],
            required: true,
            validate: {
                validator: (v) => Array.isArray(v) && v.length > 0,
                message: "Options must contain at least one string option."
            }
        },
        sub_statements: { type: [String], default: undefined },
        sub_question: { type: String, default: null },
        has_image: { type: Boolean, default: false },
        image: {
            url: { type: String, default: null },
            public_id: { type: String, default: null }
        },
        subject_code: { type: String, required: true },
        chapter: { type: Number, required: true },
        answer: { type: String, required: true }, // Expecting: "ক", "খ", "গ", or "ঘ"

        // --- Verification tracking ---
        verification: {
            status: {
                type: String,
                enum: ["unverified", "verified", "flagged", "rejected"],
                default: "unverified"
            },
            verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
            verifiedAt: { type: Date, default: null },
            note: { type: String, default: null }
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// ==========================================
//           PERFORMANCE INDEXES             
// ==========================================

// Primary query read path for battle logic loops
questionSchema.index({ subject_code: 1, chapter: 1 });
questionSchema.index({ subject_code: 1, chapter: 1, _id: 1 });

// Sparse filters for optional classification criteria
questionSchema.index({ board: 1 }, { sparse: true });
questionSchema.index({ year: 1 }, { sparse: true });

// Admin optimization: Index only active backlog triage requests
questionSchema.index(
    { "verification.status": 1 },
    { partialFilterExpression: { "verification.status": "unverified" } }
);

// Optimized compound partial check avoiding index inflation on null fields
questionSchema.index(
    { subject_code: 1, year: 1, question_number: 1 },
    { partialFilterExpression: { year: { $exists: true } } }
);

// Weighted textual search engine profiles
questionSchema.index(
    { question: "text", sub_question: "text", context: "text", options: "text" },
    {
        weights: { question: 10, sub_question: 5, context: 3, options: 1 },
        name: "QuestionTextIndex"
    }
);

export const Mcq = mongoose.model("Mcq", questionSchema);

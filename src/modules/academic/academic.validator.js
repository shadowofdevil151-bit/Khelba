import { z } from "zod";
import {
    ACADEMIC_ANSWER_KEYS,
    ACADEMIC_LIMITS
} from "./academic.constants.js";

const subjectCode = z.string().trim().min(1).max(ACADEMIC_LIMITS.SUBJECT_CODE_MAX_LENGTH);
const subjectCodes = z.string().trim().min(1).max(2048)
    .transform((codes) => [...new Set(codes.split(",").map((code) => code.trim()))])
    .pipe(z.array(subjectCode).min(1).max(50));
const chapter = z.coerce.number().int().positive();
const questionId = z.string().regex(
    new RegExp(`^[a-f\\d]{${ACADEMIC_LIMITS.MAX_QUESTION_ID_LENGTH}}$`, "i"),
    "Question ID must be a MongoDB ObjectId."
);
const excludedQuestionIds = z.string().trim().min(1).max(4096)
    .transform((ids) => [...new Set(ids.split(",").map((id) => id.trim()))])
    .pipe(z.array(questionId).max(100));
const uniqueQuestionIds = (items) => new Set(items).size === items.length;
const pageQuery = z.object({
    subject_code: subjectCode,
    chapter,
    limit: z.coerce.number().int().positive().max(ACADEMIC_LIMITS.MAX_PAGE_SIZE)
        .default(ACADEMIC_LIMITS.DEFAULT_PAGE_SIZE),
    cursor: questionId.optional(),
    randomize: z.enum(["true", "false"]).transform((value) => value === "true").default(false),
    exclude_ids: excludedQuestionIds.optional()
}).refine(({ randomize, cursor }) => !randomize || !cursor, {
    path: ["cursor"],
    message: "Randomized question requests cannot use cursor pagination."
});
const chapterQuery = z.object({ subject_code: subjectCode, chapter });
const chapterPageQuery = chapterQuery.extend({
    limit: z.coerce.number().int().positive().max(ACADEMIC_LIMITS.MAX_CHAPTER_READ_PAGE_SIZE)
        .default(ACADEMIC_LIMITS.CHAPTER_READ_PAGE_SIZE),
    cursor: questionId.optional()
});

export const AcademicValidator = {
    summary: z.object({
        body: z.object({}),
        query: z.object({ subject_codes: subjectCodes.optional() }),
        params: z.object({})
    }),
    remaining: z.object({
        body: z.object({}),
        query: pageQuery,
        params: z.object({})
    }),
    allQuestions: z.object({
        body: z.object({}),
        query: chapterPageQuery,
        params: z.object({})
    }),
    wrong: z.object({
        body: z.object({}),
        query: pageQuery,
        params: z.object({})
    }),
    right: z.object({
        body: z.object({}),
        query: pageQuery,
        params: z.object({})
    }),
    report: z.object({
        body: z.object({}),
        query: z.object({ subject_code: subjectCode }),
        params: z.object({})
    }),
    submit: z.object({
        body: z.object({
            subject_code: subjectCode,
            chapter,
            answers: z.array(z.object({
                question_id: questionId,
                answer: z.enum(ACADEMIC_ANSWER_KEYS)
            })).min(1).max(ACADEMIC_LIMITS.MAX_BATCH_SIZE)
                .refine((answers) => uniqueQuestionIds(answers.map(({ question_id }) => question_id)), {
                    message: "A question can appear only once in an answer batch."
                })
        }),
        query: z.object({}),
        params: z.object({})
    }),
    markDone: z.object({
        body: z.object({
            subject_code: subjectCode,
            chapter,
            question_ids: z.array(questionId).min(1).max(ACADEMIC_LIMITS.MAX_BATCH_SIZE)
                .refine(uniqueQuestionIds, { message: "Question IDs must be unique." })
        }),
        query: z.object({}),
        params: z.object({})
    }),
    restart: z.object({
        body: z.object({
            subject_code: subjectCode,
            chapters: z.array(chapter).min(1).max(ACADEMIC_LIMITS.MAX_BATCH_SIZE)
                .refine(uniqueQuestionIds, { message: "Chapter numbers must be unique." })
        }),
        query: z.object({}),
        params: z.object({})
    })
};

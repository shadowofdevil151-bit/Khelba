import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { ChapterReport } from "../../models/chapterReport.model.js";
import { SubjectReport } from "../../models/subjectReport.model.js";
import { Mcq } from "../../models/mcq.model.js";
import { ACADEMIC_ELIGIBLE_QUESTION_FILTER } from "./academic.constants.js";
import { StreakService } from "../../services/streak.service.js";

const questionProjection = [
    "_id", "board", "college", "year", "question_number", "context", "question",
    "options", "sub_statements", "sub_question", "has_image", "image",
    "subject_code", "chapter"
].join(" ");
const questionProjectionObject = Object.fromEntries(
    questionProjection.split(" ").map((field) => [field, 1])
);

const roundPercent = (value) => Math.round(value * 100) / 100;
const reportFilter = (userId, subjectCode, chapter) => ({
    user_id: userId,
    subject_code: subjectCode,
    chapter
});

export const academicSummaryStats = (summary = {}) => {
    const totalQuestions = summary.total_questions || 0;
    const completedQuestions = summary.completed_questions || 0;
    const totalRightAnswer = summary.total_right_answer || 0;
    const totalWrongAnswer = summary.total_wrong_answer || 0;
    const totalAttempts = totalRightAnswer + totalWrongAnswer;

    return {
        total_questions: totalQuestions,
        completed_questions: completedQuestions,
        total_right_answer: totalRightAnswer,
        total_wrong_answer: totalWrongAnswer,
        total_attempts: totalAttempts,
        completion_percentage: totalQuestions
            ? roundPercent(Math.min(completedQuestions, totalQuestions) / totalQuestions * 100)
            : 0,
        accuracy: totalAttempts ? roundPercent(totalRightAnswer / totalAttempts * 100) : 0
    };
};

export const chapterStats = (report, totalQuestions) => {
    const right = report?.right_pool?.length || 0;
    const wrong = report?.wrong_pool?.length || 0;
    const totalRightAnswer = report?.total_right_answer || 0;
    const totalWrongAnswer = report?.total_wrong_answer || 0;
    const totalAttempts = totalRightAnswer + totalWrongAnswer;
    return {
        total_questions: totalQuestions,
        completed_questions: right,
        wrong_questions: wrong,
        remaining_questions: Math.max(0, totalQuestions - right),
        completion_percentage: totalQuestions ? roundPercent(right / totalQuestions * 100) : 0,
        total_right_answer: totalRightAnswer,
        total_wrong_answer: totalWrongAnswer,
        total_attempts: totalAttempts,
        accuracy: totalAttempts ? roundPercent(totalRightAnswer / totalAttempts * 100) : 0
    };
};

const ensureChapterReport = async (userId, subjectCode, chapter) => {
    const filter = reportFilter(userId, subjectCode, chapter);
    try {
        await ChapterReport.updateOne(filter, {
            $setOnInsert: {
                ...filter,
                right_pool: [],
                wrong_pool: [],
                wrong_answers: {},
                total_right_answer: 0,
                total_wrong_answer: 0
            }
        }, { upsert: true });
    } catch (error) {
        if (error?.code !== 11000) throw error;
        if (!await ChapterReport.exists(filter)) throw error;
    }
    const report = await ChapterReport.findOne(filter).select("_id").lean();
    if (!report) throw new Error("Chapter report upsert completed without a report document.");

    const subjectFilter = { user_id: userId, subject_code: subjectCode };
    try {
        await SubjectReport.updateOne(subjectFilter, { $setOnInsert: subjectFilter }, { upsert: true });
    } catch (error) {
        if (error?.code !== 11000) throw error;
        if (!await SubjectReport.exists(subjectFilter)) throw error;
    }
    await SubjectReport.updateOne(subjectFilter, {
        $addToSet: { chapters_data: { chapter, chapter_report_id: report._id } }
    });
    return filter;
};

const requireChapterQuestions = async (subjectCode, chapter) => {
    const filter = { subject_code: subjectCode, chapter, ...ACADEMIC_ELIGIBLE_QUESTION_FILTER };
    const totalQuestions = await Mcq.countDocuments(filter);
    if (!totalQuestions) throw new ApiError(404, "No practice questions are available for this subject and chapter.");
    return { filter, totalQuestions };
};

const getPage = async ({ userId, subjectCode, chapter, limit, cursor, pool, randomize = false, excludeIds = [] }) => {
    const { filter, totalQuestions } = await requireChapterQuestions(subjectCode, chapter);
    const report = await ChapterReport.findOne(reportFilter(userId, subjectCode, chapter))
        .select("right_pool wrong_pool wrong_answers total_right_answer total_wrong_answer").lean();
    const rightPool = report?.right_pool || [];
    const wrongPool = report?.wrong_pool || [];
    const selectedPool = pool === "right" ? rightPool : pool === "wrong" ? wrongPool : null;
    const excludedIds = excludeIds.map((id) => new mongoose.Types.ObjectId(id));
    const idFilter = selectedPool ? { $in: selectedPool } : { $nin: rightPool };
    if (randomize && excludedIds.length) {
        if (idFilter.$in) idFilter.$nin = excludedIds;
        else idFilter.$nin = [...rightPool, ...excludedIds];
    }
    if (cursor) idFilter.$gt = new mongoose.Types.ObjectId(cursor);

    const pageLimit = pool === "wrong" && randomize ? wrongPool.length : limit;
    const projection = {
        ...questionProjectionObject,
        ...(pool === "right" || pool === "wrong" ? { answer: 1 } : {})
    };
    let questions;
    if (randomize && !cursor) {
        const sample = (ids, size) => size > 0
            ? Mcq.aggregate([
                { $match: { ...filter, _id: ids } },
                { $sample: { size } },
                { $project: projection }
            ])
            : Promise.resolve([]);
        questions = await sample(idFilter, pageLimit + 1);
        if (excludedIds.length && questions.length < pageLimit + 1) {
            const sampledIds = questions.map(({ _id }) => _id);
            const fallbackIds = pool === "wrong"
                ? { $in: wrongPool, $nin: sampledIds }
                : pool === "right"
                    ? { $in: rightPool, $nin: sampledIds }
                    : { $nin: [...rightPool, ...sampledIds] };
            const fallback = await sample(fallbackIds, pageLimit + 1 - questions.length);
            questions.push(...fallback);
        }
    } else {
        questions = await Mcq.find({ ...filter, _id: idFilter })
            .select(questionProjection + (pool === "right" || pool === "wrong" ? " answer" : ""))
            .sort({ _id: 1 }).limit(pageLimit + 1).lean();
    }
    const hasMore = !randomize && questions.length > pageLimit;
    const page = questions.slice(0, pageLimit).map((question) => {
        const id = question._id.toString();
        return {
            ...question,
            _id: id,
            ...(pool === "wrong" ? {
                selected_answer: report?.wrong_answers?.[id] || null,
                correct_answer: question.answer
            } : {})
        };
    });
    return {
        questions: page,
        next_cursor: hasMore ? page.at(-1)?._id || null : null,
        has_more: hasMore,
        progress: chapterStats(report, totalQuestions)
    };
};

const getAllQuestions = async ({ subjectCode, chapter, limit, cursor }) => {
    const filter = {
        subject_code: subjectCode,
        chapter,
        ...ACADEMIC_ELIGIBLE_QUESTION_FILTER
    };
    const query = cursor
        ? { ...filter, _id: { $gt: new mongoose.Types.ObjectId(cursor) } }
        : filter;
    const questions = await Mcq.find(query)
        .select(`${questionProjection} answer`)
        .sort({ _id: 1 })
        .limit(limit + 1)
        .lean();
    if (!cursor && questions.length === 0) {
        throw new ApiError(404, "No practice questions are available for this subject and chapter.");
    }
    const hasMore = questions.length > limit;
    const page = questions.slice(0, limit);
    return {
        questions: page.map((question) => ({ ...question, _id: question._id.toString() })),
        has_more: hasMore,
        next_cursor: hasMore ? page.at(-1)?._id || null : null
    };
};

const getChapterReport = async (userId, subjectCode, chapter) => {
    const { totalQuestions } = await requireChapterQuestions(subjectCode, chapter);
    const report = await ChapterReport.findOne(reportFilter(userId, subjectCode, chapter))
        .select("right_pool wrong_pool").lean();
    return chapterStats(report, totalQuestions);
};

const safeBulkWrite = async (operations) =>
    operations.length ? ChapterReport.bulkWrite(operations, { ordered: true }) : { modifiedCount: 0 };

export const AcademicService = {
    async dashboardSummary({ userId, subjectCodes }) {
        const scopedToSubjects = Array.isArray(subjectCodes);
        const reportPipeline = [
            { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
            ...(!scopedToSubjects ? [{
                $lookup: {
                    from: Mcq.collection.name,
                    let: { reportSubject: "$subject_code", reportChapter: "$chapter" },
                    pipeline: [
                        {
                            $match: {
                                ...ACADEMIC_ELIGIBLE_QUESTION_FILTER,
                                $expr: {
                                    $and: [
                                        { $eq: ["$subject_code", "$$reportSubject"] },
                                        { $eq: ["$chapter", "$$reportChapter"] }
                                    ]
                                }
                            }
                        },
                        { $count: "total" }
                    ],
                    as: "question_count"
                }
            }] : []),
            {
                $project: {
                    ...(!scopedToSubjects ? {
                        total_questions: {
                            $ifNull: [{ $arrayElemAt: ["$question_count.total", 0] }, 0]
                        }
                    } : {}),
                    completed_questions: scopedToSubjects
                        ? {
                            $cond: [
                                { $in: ["$subject_code", subjectCodes] },
                                { $size: { $ifNull: ["$right_pool", []] } },
                                0
                            ]
                        }
                        : { $size: { $ifNull: ["$right_pool", []] } },
                    total_right_answer: { $ifNull: ["$total_right_answer", 0] },
                    total_wrong_answer: { $ifNull: ["$total_wrong_answer", 0] }
                }
            },
            {
                $group: {
                    _id: null,
                    ...(!scopedToSubjects ? { total_questions: { $sum: "$total_questions" } } : {}),
                    completed_questions: { $sum: "$completed_questions" },
                    total_right_answer: { $sum: "$total_right_answer" },
                    total_wrong_answer: { $sum: "$total_wrong_answer" }
                }
            }
        ];
        const [summary, totalQuestions] = await Promise.all([
            ChapterReport.aggregate(reportPipeline).then(([result]) => result),
            scopedToSubjects
                ? Mcq.countDocuments({
                    subject_code: { $in: subjectCodes },
                    ...ACADEMIC_ELIGIBLE_QUESTION_FILTER
                })
                : Promise.resolve(undefined)
        ]);
        return academicSummaryStats({
            ...summary,
            ...(scopedToSubjects ? { total_questions: totalQuestions } : {})
        });
    },

    remaining: ({ userId, ...query }) => getPage({ userId, ...query }),
    allQuestions: (query) => getAllQuestions(query),
    wrong: ({ userId, ...query }) => getPage({ userId, ...query, pool: "wrong" }),
    right: ({ userId, ...query }) => getPage({ userId, ...query, pool: "right" }),

    async submitAnswers({ userId, subjectCode, chapter, answers }) {
        const { filter, totalQuestions } = await requireChapterQuestions(subjectCode, chapter);
        const questionIds = answers.map(({ question_id }) => new mongoose.Types.ObjectId(question_id));
        const questions = await Mcq.find({ ...filter, _id: { $in: questionIds } }).select("_id answer").lean();
        if (questions.length !== answers.length) {
            throw new ApiError(400, "One or more question IDs do not belong to this subject and chapter.");
        }
        const questionsById = new Map(questions.map((question) => [question._id.toString(), question]));
        const reportFilterForUser = await ensureChapterReport(userId, subjectCode, chapter);
        const operations = answers.map(({ question_id, answer }) => {
            const correct = questionsById.get(question_id).answer === answer;
            const update = correct
                ? {
                    $addToSet: { right_pool: new mongoose.Types.ObjectId(question_id) },
                    $pull: { wrong_pool: new mongoose.Types.ObjectId(question_id) },
                    $unset: { [`wrong_answers.${question_id}`]: "" },
                    $inc: { total_right_answer: 1 }
                }
                : {
                    $addToSet: { wrong_pool: new mongoose.Types.ObjectId(question_id) },
                    $pull: { right_pool: new mongoose.Types.ObjectId(question_id) },
                    $set: { [`wrong_answers.${question_id}`]: answer },
                    $inc: { total_wrong_answer: 1 }
                };
            return { updateOne: { filter: reportFilterForUser, update } };
        });
        await safeBulkWrite(operations);
        if (answers.length > 0) await StreakService.recordActivity(userId);
        const report = await ChapterReport.findOne(reportFilterForUser)
            .select("right_pool wrong_pool total_right_answer total_wrong_answer").lean();
        return {
            results: answers.map(({ question_id, answer }) => ({
                question_id,
                selected_answer: answer,
                correct_answer: questionsById.get(question_id).answer,
                correct: questionsById.get(question_id).answer === answer
            })),
            progress: chapterStats(report, totalQuestions)
        };
    },

    async markDone({ userId, subjectCode, chapter, questionIds }) {
        const filter = reportFilter(userId, subjectCode, chapter);
        const report = await ChapterReport.findOne(filter).select("wrong_pool").lean();
        if (!report) return { marked_count: 0, progress: await getChapterReport(userId, subjectCode, chapter) };
        const requested = new Set(questionIds);
        const idsToMark = (report.wrong_pool || []).map(String).filter((id) => requested.has(id));
        const operations = idsToMark.map((id) => ({
            updateOne: {
                filter: { ...filter, wrong_pool: new mongoose.Types.ObjectId(id) },
                update: {
                    $pull: { wrong_pool: new mongoose.Types.ObjectId(id) },
                    $addToSet: { right_pool: new mongoose.Types.ObjectId(id) },
                    $unset: { [`wrong_answers.${id}`]: "" }
                }
            }
        }));
        const result = await safeBulkWrite(operations);
        return {
            marked_count: result.modifiedCount,
            progress: await getChapterReport(userId, subjectCode, chapter)
        };
    },

    async restart({ userId, subjectCode, chapters }) {
        const subjectFilter = { user_id: userId, subject_code: subjectCode };
        const result = await ChapterReport.deleteMany({ ...subjectFilter, chapter: { $in: chapters } });
        await SubjectReport.updateOne(subjectFilter, {
            $pull: { chapters_data: { chapter: { $in: chapters } } }
        });
        await SubjectReport.deleteMany({ ...subjectFilter, "chapters_data.0": { $exists: false } });
        return { reset_chapters: chapters, deleted_chapters: result.deletedCount };
    },

    async subjectReport({ userId, subjectCode }) {
        const [chapterTotals, reports] = await Promise.all([
            Mcq.aggregate([
                { $match: { subject_code: subjectCode, ...ACADEMIC_ELIGIBLE_QUESTION_FILTER } },
                { $group: { _id: "$chapter", total_questions: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            ChapterReport.find({ user_id: userId, subject_code: subjectCode })
                .select("chapter right_pool wrong_pool total_right_answer total_wrong_answer").lean()
        ]);
        if (!chapterTotals.length) throw new ApiError(404, "No academic questions are available for this subject.");
        const reportsByChapter = new Map(reports.map((report) => [report.chapter, report]));
        const chapters = chapterTotals.map(({ _id: chapter, total_questions: totalQuestions }) => ({
            chapter, ...chapterStats(reportsByChapter.get(chapter), totalQuestions)
        }));
        const totals = chapters.reduce((summary, item) => {
            summary.total_questions += item.total_questions;
            summary.completed_questions += item.completed_questions;
            summary.wrong_questions += item.wrong_questions;
            summary.remaining_questions += item.remaining_questions;
            summary.total_right_answer += item.total_right_answer;
            summary.total_wrong_answer += item.total_wrong_answer;
            summary.total_attempts += item.total_attempts;
            return summary;
        }, {
            total_questions: 0,
            completed_questions: 0,
            wrong_questions: 0,
            remaining_questions: 0,
            total_right_answer: 0,
            total_wrong_answer: 0,
            total_attempts: 0
        });
        totals.completion_percentage = totals.total_questions
            ? roundPercent(totals.completed_questions / totals.total_questions * 100) : 0;
        totals.accuracy = totals.total_attempts
            ? roundPercent(totals.total_right_answer / totals.total_attempts * 100) : 0;
        return { subject_code: subjectCode, chapters, totals };
    }
};

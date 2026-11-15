import { asyncHandler } from "../../middlewares/asyncHandler.middleware.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AcademicService } from "./academic.service.js";

const userIdFrom = (request) => request.user?._id?.toString();
const send = (response, data, message) => response
    .status(200)
    .json(new ApiResponse(200, data, message));

export const AcademicController = {
    dashboardSummary: asyncHandler(async (req, res) => send(res, await AcademicService.dashboardSummary({
        userId: userIdFrom(req),
        subjectCodes: req.query.subject_codes
    }), "Dashboard report retrieved.")),

    remaining: asyncHandler(async (req, res) => send(res, await AcademicService.remaining({
        userId: userIdFrom(req),
        subjectCode: req.query.subject_code,
        chapter: req.query.chapter,
        limit: req.query.limit,
        cursor: req.query.cursor,
        randomize: req.query.randomize,
        excludeIds: req.query.exclude_ids
    }), "Remaining questions retrieved.")),

    allQuestions: asyncHandler(async (req, res) => send(res, await AcademicService.allQuestions({
        subjectCode: req.query.subject_code,
        chapter: req.query.chapter,
        limit: req.query.limit,
        cursor: req.query.cursor
    }), "Chapter questions retrieved.")),

    wrong: asyncHandler(async (req, res) => send(res, await AcademicService.wrong({
        userId: userIdFrom(req),
        subjectCode: req.query.subject_code,
        chapter: req.query.chapter,
        limit: req.query.limit,
        cursor: req.query.cursor,
        randomize: req.query.randomize,
        excludeIds: req.query.exclude_ids
    }), "Wrong answers retrieved.")),

    right: asyncHandler(async (req, res) => send(res, await AcademicService.right({
        userId: userIdFrom(req),
        subjectCode: req.query.subject_code,
        chapter: req.query.chapter,
        limit: req.query.limit,
        cursor: req.query.cursor,
        randomize: req.query.randomize,
        excludeIds: req.query.exclude_ids
    }), "Correct answers retrieved.")),

    report: asyncHandler(async (req, res) => send(res, await AcademicService.subjectReport({
        userId: userIdFrom(req),
        subjectCode: req.query.subject_code
    }), "Subject analytics retrieved.")),

    submit: asyncHandler(async (req, res) => send(res, await AcademicService.submitAnswers({
        userId: userIdFrom(req),
        subjectCode: req.body.subject_code,
        chapter: req.body.chapter,
        answers: req.body.answers
    }), "Answer batch recorded.")),

    markDone: asyncHandler(async (req, res) => send(res, await AcademicService.markDone({
        userId: userIdFrom(req),
        subjectCode: req.body.subject_code,
        chapter: req.body.chapter,
        questionIds: req.body.question_ids
    }), "Wrong questions marked as complete.")),

    restart: asyncHandler(async (req, res) => send(res, await AcademicService.restart({
        userId: userIdFrom(req),
        subjectCode: req.body.subject_code,
        chapters: req.body.chapters
    }), "Practice progress reset."))
};

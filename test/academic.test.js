import test from "node:test";
import assert from "node:assert/strict";
import { AcademicValidator } from "../src/modules/academic/academic.validator.js";
import { academicSummaryStats, chapterStats } from "../src/modules/academic/academic.service.js";
import { ACADEMIC_LIMITS } from "../src/modules/academic/academic.constants.js";

const qid = "65a123456789abcdef012345";

test("academic answer batches require unique valid ObjectIds and enforce configured limits", () => {
    const valid = AcademicValidator.submit.safeParse({
        body: {
            subject_code: "BIO",
            chapter: 1,
            answers: [{ question_id: qid, answer: "খ" }]
        },
        query: {},
        params: {}
    });
    assert.equal(valid.success, true);

    const duplicate = AcademicValidator.submit.safeParse({
        body: {
            subject_code: "BIO",
            chapter: 1,
            answers: [
                { question_id: qid, answer: "খ" },
                { question_id: qid, answer: "গ" }
            ]
        },
        query: {},
        params: {}
    });
    assert.equal(duplicate.success, false);

    const tooMany = AcademicValidator.submit.safeParse({
        body: {
            subject_code: "BIO",
            chapter: 1,
            answers: Array.from({ length: ACADEMIC_LIMITS.MAX_BATCH_SIZE + 1 }, (_, index) => ({
                question_id: index.toString(16).padStart(24, "0"),
                answer: "ক"
            }))
        },
        query: {},
        params: {}
    });
    assert.equal(tooMany.success, false);
});

test("academic progress tracks only answer pools", () => {
    const stats = chapterStats({
        right_pool: [1, 2, 3],
        wrong_pool: [4],
        total_right_answer: 4,
        total_wrong_answer: 2
    }, 8);

    assert.equal(stats.completed_questions, 3);
    assert.equal(stats.wrong_questions, 1);
    assert.equal(stats.remaining_questions, 5);
    assert.equal(stats.completion_percentage, 37.5);
    assert.equal(stats.total_right_answer, 4);
    assert.equal(stats.total_wrong_answer, 2);
    assert.equal(stats.total_attempts, 6);
    assert.equal(stats.accuracy, 66.67);
    assert.equal(Object.hasOwn(stats, "analytics"), false);
});

test("academic summary reports cross-subject completion and accuracy", () => {
    assert.deepEqual(academicSummaryStats({
        total_questions: 80,
        completed_questions: 20,
        total_right_answer: 15,
        total_wrong_answer: 5
    }), {
        total_questions: 80,
        completed_questions: 20,
        total_right_answer: 15,
        total_wrong_answer: 5,
        total_attempts: 20,
        completion_percentage: 25,
        accuracy: 75
    });

    assert.equal(academicSummaryStats({}).completion_percentage, 0);
    assert.equal(academicSummaryStats({}).accuracy, 0);
});

test("academic summary accepts a bounded subject-code list for stream-scoped completion", () => {
    const valid = AcademicValidator.summary.safeParse({
        body: {},
        query: { subject_codes: "HSC-253,HSC-254" },
        params: {}
    });
    assert.equal(valid.success, true);
    assert.deepEqual(valid.data.query.subject_codes, ["HSC-253", "HSC-254"]);

    const empty = AcademicValidator.summary.safeParse({
        body: {},
        query: { subject_codes: "" },
        params: {}
    });
    assert.equal(empty.success, false);
});

test("academic restart accepts chapter batches and rejects duplicates", () => {
    const valid = AcademicValidator.restart.safeParse({
        body: { subject_code: "BIO", chapters: [1, 2] },
        query: {},
        params: {}
    });
    const duplicate = AcademicValidator.restart.safeParse({
        body: { subject_code: "BIO", chapters: [1, 1] },
        query: {},
        params: {}
    });
    assert.equal(valid.success, true);
    assert.equal(duplicate.success, false);
});

test("academic question queries validate randomization and bounded recent-question exclusions", () => {
    const valid = AcademicValidator.remaining.safeParse({
        body: {},
        query: {
            subject_code: "BIO",
            chapter: "1",
            randomize: "true",
            exclude_ids: `${qid},${qid}`
        },
        params: {}
    });

    assert.equal(valid.success, true);
    assert.equal(valid.data.query.randomize, true);
    assert.deepEqual(valid.data.query.exclude_ids, [qid]);
    assert.equal(AcademicValidator.remaining.parse({
        body: {},
        query: { subject_code: "BIO", chapter: "1" },
        params: {}
    }).query.randomize, false);

    const invalidId = AcademicValidator.remaining.safeParse({
        body: {},
        query: { subject_code: "BIO", chapter: "1", exclude_ids: "not-an-object-id" },
        params: {}
    });
    const tooManyIds = AcademicValidator.remaining.safeParse({
        body: {},
        query: {
            subject_code: "BIO",
            chapter: "1",
            exclude_ids: Array.from({ length: 101 }, (_, index) =>
                (index + 1).toString(16).padStart(24, "0")).join(",")
        },
        params: {}
    });
    const randomWithCursor = AcademicValidator.remaining.safeParse({
        body: {},
        query: { subject_code: "BIO", chapter: "1", randomize: "true", cursor: qid },
        params: {}
    });

    assert.equal(invalidId.success, false);
    assert.equal(tooManyIds.success, false);
    assert.equal(randomWithCursor.success, false);
});

test("chapter reader accepts bounded stable pagination", () => {
    const parsed = AcademicValidator.allQuestions.safeParse({
        body: {},
        query: { subject_code: "BIO", chapter: "3" },
        params: {}
    });

    assert.equal(parsed.success, true);
    assert.equal(parsed.data.query.chapter, 3);
    assert.equal(parsed.data.query.limit, ACADEMIC_LIMITS.CHAPTER_READ_PAGE_SIZE);
    const nextPage = AcademicValidator.allQuestions.safeParse({
        body: {},
        query: { subject_code: "BIO", chapter: "3", limit: "100", cursor: qid },
        params: {}
    });
    assert.equal(nextPage.success, true);
    assert.equal(nextPage.data.query.cursor, qid);
    assert.equal(AcademicValidator.allQuestions.safeParse({
        body: {},
        query: { subject_code: "BIO", chapter: "3", limit: String(ACADEMIC_LIMITS.MAX_CHAPTER_READ_PAGE_SIZE + 1) },
        params: {}
    }).success, false);
    assert.equal(AcademicValidator.allQuestions.safeParse({
        body: {},
        query: { subject_code: "BIO" },
        params: {}
    }).success, false);
});

export const ACADEMIC_LIMITS = Object.freeze({
    MAX_BATCH_SIZE: 100,
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 600,
    CHAPTER_READ_PAGE_SIZE: 50,
    MAX_CHAPTER_READ_PAGE_SIZE: 100,
    MAX_QUESTION_ID_LENGTH: 24,
    SUBJECT_CODE_MAX_LENGTH: 32
});

export const ACADEMIC_ANSWER_KEYS = Object.freeze(["ক", "খ", "গ", "ঘ"]);
export const ACADEMIC_ELIGIBLE_QUESTION_FILTER = Object.freeze({
    "verification.status": { $ne: "rejected" }
});

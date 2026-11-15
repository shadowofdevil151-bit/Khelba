import { Mcq } from "../../models/mcq.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { BATTLE_ANSWER_KEYS, BATTLE_QUESTION_COUNT } from "./battle.constants.js";

export const getBattleQuestions = async (subjectCode, chapter) => {
    const questions = await Mcq.aggregate([
        {
            $match: {
                subject_code: subjectCode,
                chapter,
                // "verification.status": "verified", // TODO: Enable this once we have a verified questions collection
                options: { $size: 4 },
                answer: { $in: BATTLE_ANSWER_KEYS }
            }
        },
        { $sample: { size: BATTLE_QUESTION_COUNT } },
        {
            $project: {
                board: 1,
                college: 1,
                year: 1,
                question_number: 1,
                context: 1,
                question: 1,
                options: 1,
                sub_statements: 1,
                sub_question: 1,
                has_image: 1,
                image: 1,
                answer: 1
            }
        }
    ]);

    if (questions.length !== BATTLE_QUESTION_COUNT) {
        throw new ApiError(409, "Not enough verified questions are available for this battle.");
    }
    return questions;
};

export const sanitizeQuestion = (question) => ({
    id: question._id.toString(),
    question_number: question.question_number,
    context: question.context,
    question: question.question,
    options: question.options,
    sub_statements: question.sub_statements,
    sub_question: question.sub_question,
    has_image: question.has_image,
    image: question.image
});

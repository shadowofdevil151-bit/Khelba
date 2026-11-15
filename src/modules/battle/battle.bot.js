import { randomInt } from "node:crypto";

export const createBotAnswerPlan = (questionCount, getRandomInt = randomInt) => {
    if (!Number.isSafeInteger(questionCount) || questionCount < 1) {
        throw new TypeError("Bot answer plan requires a positive question count.");
    }

    const minCorrect = Math.ceil(questionCount * 0.60);
    const maxCorrect = Math.floor(questionCount * 0.95);
    if (minCorrect > maxCorrect) {
        throw new RangeError("Question count cannot support the configured bot accuracy.");
    }

    const correctCount = getRandomInt(minCorrect, maxCorrect + 1);
    const questionIndexes = Array.from({ length: questionCount }, (_, index) => index);
    for (let index = questionIndexes.length - 1; index > 0; index -= 1) {
        const swapIndex = getRandomInt(0, index + 1);
        [questionIndexes[index], questionIndexes[swapIndex]] =
            [questionIndexes[swapIndex], questionIndexes[index]];
    }

    return questionIndexes.slice(0, correctCount).sort((left, right) => left - right);
};

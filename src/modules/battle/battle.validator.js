import { z } from "zod";
import { BATTLE_ANSWER_KEYS, BATTLE_CHAT, BATTLE_QUESTION_COUNT } from "./battle.constants.js";

const subjectCode = z.string().trim().min(1).max(32);
const matchmakingRequestId = z.string().regex(/^[A-Za-z0-9_-]{8,96}$/);
const answerKey = z.enum(BATTLE_ANSWER_KEYS);
const chatMessage = z.string().trim().min(1).max(BATTLE_CHAT.MAX_MESSAGE_LENGTH);

export const cancelSearchPayloadSchema = z.object({
    request_id: matchmakingRequestId
});

export const BattleValidator = {
    startSchema: z.object({
        body: z.object({
            subject_code: subjectCode,
            chapter: z.number().int().positive(),
            request_id: matchmakingRequestId.optional()
        })
    }),
    cancelSearchSchema: z.object({
        body: cancelSearchPayloadSchema
    }),
    submitAnswerSchema: z.object({
        question_index: z.number().int().min(0).max(BATTLE_QUESTION_COUNT - 1),
        answer: answerKey
    }),
    chatMessageSchema: z.object({
        message: chatMessage,
        client_message_id: z.string().trim().min(8).max(96).optional()
    })
};

import { ApiError } from "../utils/ApiError.js";
import { GET_JOB_NAME } from "../constants/jobs.constants.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./handlers/email.handler.js";
import { BATTLE_JOBS } from "../modules/battle/battle.constants.js";
import { matchWithBot } from "./handlers/battle/matchmaking.handler.js";
import {
    advanceBattleQuestion,
    submitBotAnswer,
    timeoutBattleRound
} from "./handlers/battle/round.handler.js";
import { finalizeBattle, forfeitBattle } from "./handlers/battle/terminal.handler.js";
import { finishNoOpponentSearch } from "./handlers/battle/matchmaking.handler.js";
import { sendBotChat, startBotChat } from "./handlers/battle/bot-chat.handler.js";

// Central mapping where BullMQ job names link directly to operational methods
const REGISTRY = {
    [GET_JOB_NAME.sendPasswordResetEmail]: sendPasswordResetEmail,
    [GET_JOB_NAME.sendVerificationEmail]: sendVerificationEmail,
    
    [BATTLE_JOBS.MATCHUP_WITH_BOT]: matchWithBot,
    [BATTLE_JOBS.NO_OPPONENT_FOUND]: finishNoOpponentSearch,
    [BATTLE_JOBS.NEXT_QUESTION]: advanceBattleQuestion,
    [BATTLE_JOBS.ROUND_TIMEOUT]: timeoutBattleRound,
    [BATTLE_JOBS.BOT_SUBMIT_ANSWER]: submitBotAnswer,
    [BATTLE_JOBS.BOT_CHAT]: startBotChat,
    [BATTLE_JOBS.BOT_CHAT_SEND]: sendBotChat,
    [BATTLE_JOBS.FORFEIT_BATTLE]: forfeitBattle,
    [BATTLE_JOBS.FINALIZE_BATTLE]: finalizeBattle,
};


export const JobRegistry = {
    /**
     * Resolves and extracts a processor mapping matching the incoming job.name routing key.
     * @param {string} jobName 
     * @returns {Function}
     */
    getProcessor(jobName) {
        const processor = REGISTRY[jobName];
        if (!processor) {
            throw new ApiError(400, `No job processor registered for job name: ${jobName}`);
        }
        return processor;
    }
};

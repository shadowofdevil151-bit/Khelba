import { asyncHandler } from "../../middlewares/asyncHandler.middleware.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { BattleService } from "./battle.service.js";

export const BattleController = {
    start: asyncHandler(async (req, res) => {
        const result = await BattleService.start({
            user: req.user,
            subjectCode: req.body.subject_code,
            chapter: req.body.chapter,
            requestId: req.body.request_id
        });

        return res.status(result.statusCode).json(
            new ApiResponse(result.statusCode, result.data, result.message)
        );
    }),
    cancelSearch: asyncHandler(async (req, res) => {
        const result = await BattleService.cancelSearch({
            user: req.user,
            requestId: req.body.request_id
        });

        return res.status(result.statusCode).json(
            new ApiResponse(result.statusCode, result.data, result.message)
        );
    })
};

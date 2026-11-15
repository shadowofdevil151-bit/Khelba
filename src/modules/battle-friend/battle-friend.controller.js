import { asyncHandler } from "../../middlewares/asyncHandler.middleware.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { FriendBattleService } from "./battle-friend.service.js";
export const FriendBattleController = {
    create: asyncHandler(async (req, res) => {
        const { user_id: targetId, subject_code: subjectCode, chapter } = req.body;
        if (!targetId || !subjectCode || chapter === undefined || chapter === null) {
            throw new ApiError(400, "Battle request details are required.");
        }
        return res.status(201).json(new ApiResponse(201, await FriendBattleService.create(req.user._id, targetId, subjectCode, chapter), "Battle request sent."));
    }),
    cancel: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await FriendBattleService.cancel(req.user._id, req.params.requestId), "Battle request cancelled."))),
    accept: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await FriendBattleService.accept(req.user._id, req.params.requestId), "Battle started."))),
    reject: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await FriendBattleService.reject(req.user._id, req.params.requestId), "Battle request rejected.")))
};

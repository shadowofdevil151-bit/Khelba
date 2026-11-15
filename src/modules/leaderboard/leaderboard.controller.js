import { asyncHandler } from "../../middlewares/asyncHandler.middleware.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { LeaderboardService } from "./leaderboard.service.js";
export const LeaderboardController = {
    top: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await LeaderboardService.top(), "Leaderboard loaded."))),
    me: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await LeaderboardService.me(req.user._id), "Leaderboard position loaded.")))
};

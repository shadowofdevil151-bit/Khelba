import { asyncHandler } from "../../middlewares/asyncHandler.middleware.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { NotificationService } from "./notification.service.js";

export const NotificationController = {
    list: asyncHandler(async (req, res) => res.json(new ApiResponse(200,
        await NotificationService.list(req.user._id), "Notifications loaded."))),
    markSeen: asyncHandler(async (req, res) => res.json(new ApiResponse(200,
        await NotificationService.markSeen(req.user._id, req.body?.ids), "Notifications marked as seen.")))
};

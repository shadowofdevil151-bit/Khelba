import { asyncHandler } from "../../middlewares/asyncHandler.middleware.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ChatService } from "./chat.service.js";
export const ChatController = {
    list: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await ChatService.list(req.user._id, req.params.userId), "Chat loaded."))),
    send: asyncHandler(async (req, res) => res.status(201).json(new ApiResponse(201, await ChatService.send(req.user._id, req.params.userId, req.body.text), "Message sent.")))
};

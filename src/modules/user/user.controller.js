import { asyncHandler } from "../../middlewares/asyncHandler.middleware.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { UserService } from "./user.service.js";
export const UserController = {
    me: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await UserService.profile(req.user._id), "Profile loaded."))),
    publicProfile: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await UserService.publicProfile(req.params.userId, req.user._id), "Profile loaded."))),
    friends: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await UserService.friends(req.user._id), "Friends loaded."))),
    search: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await UserService.search(req.user._id, req.body?.username), "Users found."))),
    update: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await UserService.updateProfile(req.user._id, req.body, req.avatar), "Profile updated."))),
    request: asyncHandler(async (req, res) => res.status(201).json(new ApiResponse(201, await UserService.requestFriend(req.user._id, req.params.userId), "Friend request sent."))),
    cancelRequest: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await UserService.cancelFriendRequest(req.user._id, req.params.userId), "Friend request cancelled."))),
    respond: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await UserService.respondFriend(req.user._id, req.params.userId, req.body.accept === true), "Friend request updated."))),
    remove: asyncHandler(async (req, res) => res.json(new ApiResponse(200, await UserService.unfriend(req.user._id, req.params.userId), "Friend removed.")))
};

import { Router } from "express";
import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { ChatController } from "./chat.controller.js";
export const chatRouter = Router();
chatRouter.use(authenticateUser);
chatRouter.get("/:userId", ChatController.list);
chatRouter.post("/:userId", ChatController.send);

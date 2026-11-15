import { Router } from "express";
import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { NotificationController } from "./notification.controller.js";

export const notificationRouter = Router();
notificationRouter.use(authenticateUser);
notificationRouter.get("/", NotificationController.list);
notificationRouter.post("/seen", NotificationController.markSeen);

import { Router } from "express";
import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { LeaderboardController } from "./leaderboard.controller.js";
export const leaderboardRouter = Router();
leaderboardRouter.get("/", LeaderboardController.top);
leaderboardRouter.get("/me", authenticateUser, LeaderboardController.me);

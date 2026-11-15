import express from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { battleRouter } from "../modules/battle/battle.routes.js";
import { academicRouter } from "../modules/academic/academic.routes.js";
import { notificationRouter } from "../modules/notification/notification.routes.js";
import { userRouter } from "../modules/user/user.routes.js";
import { friendBattleRouter } from "../modules/battle-friend/battle-friend.routes.js";
import { leaderboardRouter } from "../modules/leaderboard/leaderboard.routes.js";

export const mainRouter = express.Router();

mainRouter.use('/auth', authRouter);
mainRouter.use('/battle', battleRouter);
mainRouter.use('/academic', academicRouter);
mainRouter.use('/notifications', notificationRouter);
mainRouter.use('/users', userRouter);
mainRouter.use('/friend-battles', friendBattleRouter);
mainRouter.use('/leaderboard', leaderboardRouter);

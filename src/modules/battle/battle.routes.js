import { Router } from "express";
import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { BattleController } from "./battle.controller.js";
import { BattleValidator } from "./battle.validator.js";

export const battleRouter = Router();

battleRouter.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

battleRouter.post(
    "/start",
    authenticateUser,
    validate(BattleValidator.startSchema),
    BattleController.start
);
battleRouter.post(
    "/cancel-search",
    authenticateUser,
    validate(BattleValidator.cancelSearchSchema),
    BattleController.cancelSearch
);

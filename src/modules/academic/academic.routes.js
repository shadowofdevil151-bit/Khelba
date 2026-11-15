import { Router } from "express";
import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { AcademicController } from "./academic.controller.js";
import { AcademicValidator } from "./academic.validator.js";

export const academicRouter = Router();

academicRouter.use(authenticateUser);
academicRouter.get("/remaining-questions", validate(AcademicValidator.remaining), AcademicController.remaining);
academicRouter.get("/chapter-questions", validate(AcademicValidator.allQuestions), AcademicController.allQuestions);
academicRouter.post("/submit-answer", validate(AcademicValidator.submit), AcademicController.submit);
academicRouter.get("/wrong-questions", validate(AcademicValidator.wrong), AcademicController.wrong);
academicRouter.get("/right-questions", validate(AcademicValidator.right), AcademicController.right);
academicRouter.post("/mark-as-done", validate(AcademicValidator.markDone), AcademicController.markDone);
academicRouter.delete("/delete", validate(AcademicValidator.restart), AcademicController.restart);
academicRouter.post("/reset", validate(AcademicValidator.restart), AcademicController.restart);
academicRouter.get("/report/summary", validate(AcademicValidator.summary), AcademicController.dashboardSummary);
academicRouter.get("/report", validate(AcademicValidator.report), AcademicController.report);

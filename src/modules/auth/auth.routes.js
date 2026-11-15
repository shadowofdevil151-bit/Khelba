import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { AuthValidator } from "../../validators/auth.validator.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { handleImageUpload } from "../../middlewares/upload.middleware.js";
import { authenticateUser } from "../../middlewares/auth.middleware.js";
import passport from "passport";


export const authRouter = Router();

authRouter.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

authRouter.route("/register").post(handleImageUpload, validate(AuthValidator.registerSchema), AuthController.register);

authRouter.route("/login").post(validate(AuthValidator.loginSchema), AuthController.login);

authRouter.route("/refresh").post(AuthController.refreshSession);

authRouter.route("/logout").post(AuthController.logout);

authRouter.route("/logout-all").post(authenticateUser, AuthController.logoutAll);

authRouter.route("/forgot-password").post(validate(AuthValidator.forgotPasswordSchema), AuthController.forgotPassword);

authRouter.route("/reset-password/:token").post(validate(AuthValidator.resetPasswordSchema), AuthController.resetPassword);

authRouter.route("/change-password").post(authenticateUser, validate(AuthValidator.changePasswordSchema), AuthController.changePassword);

authRouter.route("/verify-email/:token").post(validate(AuthValidator.verifyEmailSchema), AuthController.verifyEmail);

authRouter.route("/send-verification-email").post(validate(AuthValidator.emailSchema), AuthController.sendEmailVerificationToken);

authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

authRouter.get("/google/callback", passport.authenticate("google", { failureRedirect: "/login", session: false }), AuthController.googleLoginCallback);

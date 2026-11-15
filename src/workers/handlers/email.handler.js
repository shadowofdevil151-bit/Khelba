import nodemailer from "nodemailer";
import { AppLogger } from "../../utils/logger.js";
import { mailConfig } from "../../config/env.js";

const emailUser = mailConfig.smtp.user;
const emailPass = mailConfig.smtp.pass;
const COMPONENT_NAME = "email-handler";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: emailUser,
        pass: emailPass,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
});

transporter.verify((error) => {
    if (error) {
        AppLogger.error("SMTP transporter connection failed to initialize", error, { component: COMPONENT_NAME });
    } else {
        AppLogger.info("SMTP transporter ready to deliver verification emails", { component: COMPONENT_NAME });
    }
});

export const sendVerificationEmail = async ({ email, verificationUrl } = {}) => {
    if (!email || !email.includes("@")) {
        throw new Error(`Invalid recipient address provided: "${email}"`);
    }
    if (!verificationUrl || !verificationUrl.startsWith("http")) {
        throw new Error("Invalid verification URL provided.");
    }

    const maskedEmail = email.replace(/(?<=.).(?=.*@)/g, "*");

    const mailOptions = {
        from: `"Khelba" <${emailUser}>`,
        to: email,
        subject: "Verify Your Email Address",
        text: `Welcome to Khelba!\n\nPlease verify your email address by copying and pasting this link into your browser:\n\n${verificationUrl}\n\nThis link expires in 15 minutes.`,
        html: `
      <div style="font-family:sans-serif;padding:20px;color:#333;max-width:600px;margin:0 auto;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#111;">Welcome to Khelba!</h2>
        <p>Please verify your email address.</p>
        <p style="margin:30px 0;">
          <a href="${verificationUrl}" target="_blank" style="background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
            Verify Email
          </a>
        </p>
        <p style="font-size:12px;color:#666;border-top:1px solid #eee;padding-top:15px;">
          This link expires in 15 minutes. If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        AppLogger.info("Verification email delivered successfully", {
            component: COMPONENT_NAME,
            messageId: info.messageId,
            recipient: maskedEmail,
        });
        return info;
    } catch (error) {
        AppLogger.error("Mailer encountered a delivery execution failure for verification", error, {
            component: COMPONENT_NAME,
            recipient: maskedEmail,
        });
        throw error;
    }
};

export const sendPasswordResetEmail = async ({ email, resetUrl } = {}) => {
    if (!email || !email.includes("@")) {
        throw new Error(`Invalid recipient address provided: "${email}"`);
    }
    if (!resetUrl || !resetUrl.startsWith("http")) {
        throw new Error("Invalid reset URL provided.");
    }

    const maskedEmail = email.replace(/(?<=.).(?=.*@)/g, "*");

    const mailOptions = {
        from: `"Khelba" <${emailUser}>`,
        to: email,
        subject: "Reset Your Password",
        text: `Reset Password: \n\nSubmit reset password verification by copying and pasting this link into your browser:\n\n${resetUrl}\n\nThis link expires in 15 minutes.`,
        html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #111;">Password Reset Request</h2>
        <p>You requested a secure password reset validation lock change. Click the button below to configure your new credentials:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;" target="_blank">Reset Password</a>
        </p>
        <p style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 15px;">This secure system tracking link expires automatically within 15 minutes. If you did not make this request, please ignore this email.</p>
      </div>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        AppLogger.info("Password reset email delivered successfully", {
            component: COMPONENT_NAME,
            messageId: info.messageId,
            recipient: maskedEmail,
        });
        return info;
    } catch (error) {
        AppLogger.error("Mailer encountered a delivery execution failure for password reset", error, {
            component: COMPONENT_NAME,
            recipient: maskedEmail,
        });
        throw error;
    }
};

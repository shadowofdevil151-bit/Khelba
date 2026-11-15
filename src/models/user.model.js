import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
    VALID_USER_ROLES,
    GET_USER_STATUS,
    VALID_USER_STATUSES,
    GET_USER_PROVIDER,
    VALID_USER_PROVIDERS,
    GET_USER_TIERS,
    VALID_USER_TIERS,
    GET_USER_ROLES
} from "../constants/user.constants.js";
import { securityConfig, serverConfig } from "../config/env.js";
import { EncryptJWT } from "jose"; // High performance token encryption factory

const ACCESS_TOKEN_EXPIRY = securityConfig.tokens.accessTokenExpiry;
const REFRESH_TOKEN_EXPIRY = securityConfig.tokens.refreshTokenExpiry;

const ACCESS_TOKEN_SECRET = securityConfig.tokens.accessTokenSecret;
const REFRESH_TOKEN_SECRET = securityConfig.tokens.refreshTokenSecret;

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            unique: true,
            required: [true, "Username is required"],
            trim: true,
            lowercase: true,
            minlength: [3, "Username must be at least 3 characters"],
        },
        usernameChangedAt: {
            type: Date,
            default: null
        },
        email: {
            type: String,
            unique: true,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true
            // Redundant Mongoose regex matching stripped! Handled cleanly upfront by Zod.
        },
        password: {
            type: String,
            minlength: [4, "Password must be at least 4 characters"],
            select: false
        },
        provider: {
            type: String,
            enum: VALID_USER_PROVIDERS,
            default: GET_USER_PROVIDER.LOCAL,
            required: true
        },
        oauthId: {
            type: String,
            unique: true,
            sparse: true
        },
        role: {
            type: String,
            enum: {
                values: VALID_USER_ROLES,
                message: "{VALUE} is not a supported role"
            },
            default: GET_USER_ROLES.MEMBER
        },
        tier: {
            type: String,
            required: true,
            enum: {
                values: VALID_USER_TIERS,
                message: "{VALUE} is not a supported role"
            },
            default: GET_USER_TIERS.FREE
        },
        avatar: {
            publicId: { type: String, required: false },
            url: { type: String, required: false },
            mimeType: { type: String, required: false }
        },
        passwordResetToken: { type: String, select: false },
        passwordResetExpires: { type: Date, select: false },
        tokenVersion: { type: Number, default: 1, required: true },
        isEmailVerified: { type: Boolean, default: false, required: true },
        status: {
            type: String,
            enum: {
                values: VALID_USER_STATUSES,
                message: "{VALUE} is not a supported account state status"
            },
            default: GET_USER_STATUS.ACTIVE
        },
        profile: {
            institution: { type: String, trim: true, maxlength: 160, default: null },
            bio: { type: String, trim: true, maxlength: 500, default: null },
            gender: { type: String, trim: true, maxlength: 32, default: null },
            education_level: { type: String, enum: ["SSC", "HSC", "SCHOOL"], default: "HSC" },
            education_year: { type: Number, min: 1, max: 8, default: 1 },
            education_stream: { type: String, enum: ["SCIENCE", "ARTS", "COMMERCE"], default: "SCIENCE" }
        },
        friends: [{
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            status: { type: String, enum: ["requested", "accepted", "rejected"], required: true },
            requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            updatedAt: { type: Date, default: Date.now }
        }]
    },
    {
        timestamps: true,
        autoIndex: serverConfig.env !== "production"
    }
);

userSchema.index({ role: 1, createdAt: -1 });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    try {
        this.password = await bcrypt.hash(this.password, 12);
    } catch (err) {
        throw err;
    }
});

userSchema.methods.isPasswordCorrect = async function (password) {
    if (!this.password) return false;
    return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function (sessionId) {
    return new EncryptJWT({
        userId: this._id.toString(),
        sessionId: sessionId.toString(),
        role: this.role,
        tokenVersion: this.tokenVersion,
        tier: this.tier
    })
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setExpirationTime(`${ACCESS_TOKEN_EXPIRY}s`)
        .encrypt(ACCESS_TOKEN_SECRET);
};

userSchema.methods.generateRefreshToken = async function (sessionIdText) {
    return new EncryptJWT({
        userId: this._id.toString(),
        sessionId: sessionIdText.toString(),
        tokenVersion: this.tokenVersion
    })
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setExpirationTime(`${REFRESH_TOKEN_EXPIRY}s`)
        .encrypt(REFRESH_TOKEN_SECRET);
};

export const User = mongoose.model("User", userSchema);

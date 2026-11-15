import mongoose from "mongoose";
import crypto from "crypto";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    hashedRefreshToken: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      required: true,
      trim: true
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true
    },
    isValid: {
      type: Boolean,
      default: true,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

sessionSchema.index({ user: 1, isValid: 1 });
sessionSchema.index({ hashedRefreshToken: 1 }, { sparse: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.pre("save", async function () {
  if (!this.isModified("hashedRefreshToken") || !this.hashedRefreshToken) {
    return;
  }

  if (this.hashedRefreshToken.length === 64 && /^[a-f0-9]{64}$/.test(this.hashedRefreshToken)) {
    return;
  }

  this.hashedRefreshToken = crypto
    .createHash("sha256")
    .update(this.hashedRefreshToken)
    .digest("hex");
});

sessionSchema.methods.isRefreshTokenCorrect = async function (plainToken) {
  if (!this.hashedRefreshToken || !plainToken) return false;

  const hashedInput = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest();
  const storedHash = Buffer.from(this.hashedRefreshToken, "hex");

  return storedHash.length === hashedInput.length && crypto.timingSafeEqual(hashedInput, storedHash);
};

export const Session = mongoose.model("Session", sessionSchema);

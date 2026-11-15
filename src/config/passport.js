import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { oauthConfig } from "./env.js";
import { GET_USER_PROVIDER, GET_USER_ROLES } from "../constants/user.constants.js";
import cloudinary from "./cloudinary.js";
import { AppLogger } from "../utils/logger.js";

const uploadGoogleAvatar = async (photoUrl) => {
    if (!photoUrl) return null;

    let parsedUrl;
    try {
        parsedUrl = new URL(photoUrl);
    } catch {
        return null;
    }

    if (parsedUrl.protocol !== "https:" ||
        !(parsedUrl.hostname === "googleusercontent.com" || parsedUrl.hostname.endsWith(".googleusercontent.com"))) {
        AppLogger.warn("Google OAuth returned a profile image URL outside the allowed host.");
        return null;
    }

    const result = await cloudinary.uploader.upload(parsedUrl.toString(), {
        folder: "user_profiles",
        resource_type: "image"
    });

    if (!result?.public_id || !result?.secure_url || !result?.format) {
        throw new Error("Cloudinary returned incomplete Google avatar metadata.");
    }

    return {
        publicId: result.public_id,
        url: result.secure_url.replace("/upload/", "/upload/f_auto,q_auto/"),
        mimeType: result.format.toLowerCase() === "jpg" ? "image/jpeg" : `image/${result.format.toLowerCase()}`
    };
};

passport.use(
    new GoogleStrategy(
        {
            clientID: oauthConfig.google.clientId,
            clientSecret: oauthConfig.google.clientSecret,
            callbackURL: oauthConfig.google.callbackUrl,
            proxy: true,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                if (!profile?.emails?.[0]?.value) {
                    return done(new Error("OAuth validation failed: No valid email address provided by Google account authority node."), null);
                }
                if (profile.emails[0].verified !== true) {
                    return done(new Error("OAuth validation failed: Google email address is not verified."), null);
                }

                const googleEmail = profile.emails[0].value.toLowerCase().trim();
                const googleUsername = profile.displayName || "User";

                const oauthProvider = GET_USER_PROVIDER.GOOGLE;
                const oauthId = profile.id;

                let user = await User.findOne({ oauthId, provider: GET_USER_PROVIDER.GOOGLE });

                if (!user) {
                    user = await User.findOne({ email: googleEmail });
                }

                if (user) {
                    if (user.provider === GET_USER_PROVIDER.LOCAL && !user.oauthId) {
                        user.provider = oauthProvider;
                        user.oauthId = oauthId;
                        if (!user.isEmailVerified) {
                            user.isEmailVerified = true;
                        }
                        await user.save();
                    }
                } else {
                    const uniqueSuffix = crypto.randomBytes(3).toString("hex");
                    const cleanUsername = googleUsername.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                    const finalizedUsername = `${cleanUsername}${uniqueSuffix}`;
                    const avatar = await uploadGoogleAvatar(profile.photos?.[0]?.value);

                    user = await User.create({
                        username: finalizedUsername,
                        email: googleEmail,
                        provider: oauthProvider,
                        oauthId: oauthId,
                        role: GET_USER_ROLES.MEMBER,
                        isEmailVerified: true,
                        avatar: avatar || { publicId: null, url: null, mimeType: null }
                    });

                }

                const currentAvatarUrl = user.avatar?.url;
                const storedGoogleAvatar = currentAvatarUrl && (() => {
                    try {
                        const url = new URL(currentAvatarUrl);
                        return url.protocol === "https:" &&
                            (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com"));
                    } catch {
                        return false;
                    }
                })();
                if (storedGoogleAvatar && profile.photos?.[0]?.value) {
                    try {
                        const avatar = await uploadGoogleAvatar(profile.photos[0].value);
                        if (avatar) {
                            user.avatar = avatar;
                            await user.save();
                        }
                    } catch (error) {
                        AppLogger.warn("Could not migrate an existing Google avatar to Cloudinary.", {
                            userId: user._id.toString(),
                            error
                        });
                    }
                }

                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

export default passport;

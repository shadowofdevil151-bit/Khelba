import { User } from "../../models/user.model.js";
import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { NotificationService } from "../notification/notification.service.js";
import cloudinary from "../../config/cloudinary.js";
import { FRIEND_REQUEST_RESEND_COOLDOWN_MS } from "../../constants/user.constants.js";
import { BattleReport } from "../../models/battleReport.model.js";

const relation = (user, otherId) => user.friends.find((item) => String(item.user) === String(otherId));
const friendStatusFor = (entry, viewerId) => {
    if (entry?.status === "accepted") return "friends";
    if (entry?.status === "requested") {
        return String(entry.requestedBy) === String(viewerId) ? "pending_sent" : "pending_received";
    }
    return "none";
};
const resolveFriendStatus = (viewerEntry, targetEntry, viewerId, targetId) => {
    if (viewerEntry?.status === "accepted" || targetEntry?.status === "accepted") {
        return { friendStatus: "friends", friendshipStatus: "friends", requestSentAt: null };
    }
    const requestedEntries = [
        { entry: viewerEntry, fallback: "pending_sent" },
        { entry: targetEntry, fallback: "pending_received" }
    ].filter(({ entry }) => entry?.status === "requested");
    const requested = requestedEntries.find(({ entry }) =>
        entry.requestedBy
            ? String(entry.requestedBy) === String(viewerId) || String(entry.requestedBy) === String(targetId)
            : true
    );
    if (!requested) return { friendStatus: "none", friendshipStatus: "none", requestSentAt: null };
    const { entry, fallback } = requested;
    const sentByViewer = entry.requestedBy
        ? String(entry.requestedBy) === String(viewerId)
        : fallback === "pending_sent";
    return {
        friendStatus: sentByViewer ? "pending_sent" : "pending_received",
        friendshipStatus: sentByViewer ? "pending_out" : "pending_in",
        requestSentAt: entry.updatedAt || null
    };
};
const replaceFriendRelation = async (ownerId, otherId, requestedBy, status, updatedAt) => {
    await User.updateOne(
        { _id: ownerId },
        [{
            $set: {
                friends: {
                    $concatArrays: [
                        {
                            $filter: {
                                input: { $ifNull: ["$friends", []] },
                                as: "friend",
                                cond: { $ne: ["$$friend.user", otherId] }
                            }
                        },
                        [{ user: otherId, status, requestedBy, updatedAt }]
                    ]
                }
            }
        }],
        { updatePipeline: true }
    );
};

const ensureUser = async (id) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "User id is invalid.");
    const user = await User.findById(id).select("_id username usernameChangedAt email avatar profile friends");
    if (!user) throw new ApiError(404, "User not found.");
    return user;
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const validProfile = ({ institution, bio, gender, education_level, education_year, education_stream }, currentLevel = "HSC") => {
    if (education_level !== undefined && !["SSC", "HSC", "SCHOOL"].includes(education_level)) throw new ApiError(400, "Invalid education level.");
    if (education_stream !== undefined && !["SCIENCE", "ARTS", "COMMERCE"].includes(education_stream)) throw new ApiError(400, "Invalid education stream.");
    const year = education_year === undefined ? undefined : Number(education_year);
    const max = (education_level || currentLevel) === "SCHOOL" ? 8 : 2;
    if (year !== undefined && (!Number.isInteger(year) || year < 1 || year > max)) throw new ApiError(400, "Invalid education year.");
    return Object.fromEntries(Object.entries({ institution, bio, gender, education_level, education_year: year, education_stream })
        .filter(([, value]) => value !== undefined));
};

export const UserService = {
    async profile(userId) { return ensureUser(userId); },
    async publicProfile(userId, viewerId = null) {
        if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "User id is invalid.");
        const user = await User.findOne({ _id: userId, status: "ACTIVE" })
            .select("_id username avatar profile createdAt friends")
            .lean();
        if (!user) throw new ApiError(404, "User not found.");
        const { friends: targetFriends = [], ...publicUser } = user;
        const report = await BattleReport.findOne({ user_id: userId })
            .select("battle_points battle_count performance streak")
            .lean();
        let friendshipStatus = "self";
        let friendStatus = "none";
        let requestSentAt = null;
        if (viewerId && String(viewerId) !== String(userId)) {
            if (!mongoose.isValidObjectId(viewerId)) throw new ApiError(400, "User id is invalid.");
            const viewer = await User.findById(viewerId).select("friends").lean();
            const viewerEntry = (viewer?.friends || []).find((item) => String(item.user) === String(userId));
            const targetEntry = targetFriends.find((item) => String(item.user) === String(viewerId));
            ({ friendStatus, friendshipStatus, requestSentAt } = resolveFriendStatus(
                viewerEntry,
                targetEntry,
                viewerId,
                userId
            ));
        }
        return {
            ...publicUser,
            friendshipStatus,
            friendStatus,
            requestSentAt,
            ...(report ? {
                stats: {
                    streak: Number(report.streak?.currentStreak || 0),
                    points: Number(report.battle_points || 0),
                    total_battles: Number(report.battle_count?.total || 0),
                    wins: Number(report.battle_count?.win || 0),
                    losses: Number(report.battle_count?.losses || 0),
                    accuracy: Number(report.performance?.accuracy || 0)
                }
            } : {})
        };
    },
    async friends(userId) {
        const user = await ensureUser(userId);
        const ids = user.friends.map((item) => item.user);
        const profiles = await User.find({ _id: { $in: ids } }).select("_id username avatar profile").lean();
        const byId = new Map(profiles.map((item) => [String(item._id), item]));
        return user.friends.map((item) => ({ ...item.toObject(), profile: byId.get(String(item.user)) || null }));
    },
    async search(userId, username) {
        if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "User id is invalid.");
        if (typeof username !== "string" || !username.trim()) {
            throw new ApiError(400, "Username search text is required.");
        }
        const search = username.trim().toLowerCase();
        if (search.length > 50) throw new ApiError(400, "Username search text is too long.");
        const [currentUser, users] = await Promise.all([
            User.findById(userId).select("friends").lean(),
            User.find({
                _id: { $ne: userId },
                username: { $regex: `^${escapeRegex(search)}` }
            })
                .select("_id username avatar profile")
                .sort({ username: 1 })
                .limit(20)
                .lean()
        ]);
        const friendMap = new Map(
            (currentUser?.friends || []).map((entry) => [String(entry.user), entry])
        );
        return users.map((user) => {
            const entry = friendMap.get(String(user._id));
            let friendshipStatus = "none";
            let friendStatus = friendStatusFor(entry, userId);
            let requestSentAt = null;
            if (entry) {
                if (entry.status === "accepted") friendshipStatus = "friends";
                else if (entry.status === "requested") {
                    friendshipStatus = String(entry.requestedBy) === String(userId) ? "pending_out" : "pending_in";
                    requestSentAt = entry.updatedAt || null;
                } else if (entry.status === "rejected") {
                    friendshipStatus = "rejected";
                    requestSentAt = entry.updatedAt || null;
                }
            }
            return { ...user, friendshipStatus, friendStatus, requestSentAt };
        });
    },
    async updateProfile(userId, input, avatar) {
        const user = await ensureUser(userId);
        const updates = validProfile(input, user.profile?.education_level);
        if (input.username !== undefined) {
            const username = String(input.username).trim();
            if (username.length < 3 || username.length > 50) throw new ApiError(400, "Username must contain between 3 and 50 characters.");
            const normalizedUsername = username.toLowerCase();
            const currentUsername = String(user.username || "").toLowerCase();
            if (normalizedUsername !== currentUsername) {
                if (user.usernameChangedAt) {
                    const nextChangeAt = new Date(user.usernameChangedAt);
                    nextChangeAt.setMonth(nextChangeAt.getMonth() + 1);
                    if (nextChangeAt > new Date()) {
                        throw new ApiError(429, "ইউজারনেম মাসে একবার পরিবর্তন করা যায়।");
                    }
                }
                const usernameTaken = await User.exists({ username: normalizedUsername, _id: { $ne: userId } });
                if (usernameTaken) throw new ApiError(409, "এই ইউজারনেমটি ইতোমধ্যে ব্যবহার করা হয়েছে।");
                user.set("username", normalizedUsername);
                user.set("usernameChangedAt", new Date());
            }
        }
        if (input.education_level && input.education_level !== user.profile?.education_level && input.education_year === undefined) {
            updates.education_year = 1;
        }
        const previousAvatar = avatar ? user.avatar?.publicId : null;
        if (avatar) user.set("avatar", avatar);
        for (const [key, value] of Object.entries(updates)) {
            if (key !== "avatar") user.set(`profile.${key}`, value);
        }
        try {
            await user.save();
        } catch (error) {
            if (error?.code === 11000 && error?.keyPattern?.username) {
                throw new ApiError(409, "এই ইউজারনেমটি ইতোমধ্যে ব্যবহার করা হয়েছে।");
            }
            throw error;
        }
        if (previousAvatar) await cloudinary.uploader.destroy(previousAvatar, { resource_type: "image" });
        return user;
    },
    async requestFriend(userId, targetId) {
        if (String(userId) === String(targetId)) throw new ApiError(400, "You cannot add yourself.");
        const [user, target] = await Promise.all([ensureUser(userId), ensureUser(targetId)]);
        const existing = relation(user, targetId);
        if (existing?.status === "accepted") throw new ApiError(409, "You are already friends.");
        if (existing?.status === "requested") {
            const iAmRequester = String(existing.requestedBy) === String(userId);
            if (!iAmRequester) {
                throw new ApiError(409, "They already sent you a friend request. Accept it from Notifications.");
            }
            const elapsed = Date.now() - new Date(existing.updatedAt).getTime();
            if (elapsed < FRIEND_REQUEST_RESEND_COOLDOWN_MS) {
                const hoursRemaining = Math.ceil((FRIEND_REQUEST_RESEND_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
                throw new ApiError(429, `You can send a new request in ${hoursRemaining} hour(s).`);
            }
        }
        const now = new Date();
        await replaceFriendRelation(userId, target._id, user._id, "requested", now);
        await replaceFriendRelation(target._id, user._id, user._id, "requested", now);
        await NotificationService.removeFriendRequest(targetId, userId);
        await NotificationService.create({ recipient: targetId, actor: userId, type: "friend_request", payload: { username: user.username } });
        return { requested: true };
    },
    async cancelFriendRequest(userId, targetId) {
        if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(targetId)) {
            throw new ApiError(400, "User id is invalid.");
        }
        if (String(userId) === String(targetId)) {
            throw new ApiError(400, "You cannot cancel your own request.");
        }
        const user = await ensureUser(userId);
        const existing = relation(user, targetId);
        if (!existing) throw new ApiError(404, "Friend request not found.");
        if (existing.status === "accepted") {
            throw new ApiError(409, "Cannot cancel an accepted friendship. Use unfriend instead.");
        }
        if (existing.status !== "requested" || String(existing.requestedBy) !== String(userId)) {
            throw new ApiError(403, "You can only cancel requests you sent.");
        }
        await Promise.all([
            User.updateOne({ _id: userId }, { $pull: { friends: { user: targetId } } }),
            User.updateOne({ _id: targetId }, { $pull: { friends: { user: userId } } })
        ]);
        await NotificationService.removeFriendRequest(targetId, userId);
        return { cancelled: true };
    },
    async respondFriend(userId, requesterId, accept) {
        const user = await ensureUser(userId);
        const item = relation(user, requesterId);
        if (!item || item.status !== "requested" || String(item.requestedBy) === String(userId)) throw new ApiError(404, "Friend request not found.");
        const status = accept ? "accepted" : "rejected";
        const now = new Date();
        await User.updateOne({ _id: userId, "friends.user": requesterId }, { $set: { "friends.$.status": status, "friends.$.updatedAt": now } });
        await User.updateOne({ _id: requesterId, "friends.user": userId }, { $set: { "friends.$.status": status, "friends.$.updatedAt": now } });
        await NotificationService.removeFriendRequest(userId, requesterId);
        await NotificationService.create({ recipient: requesterId, actor: userId, type: accept ? "friend_request_accepted" : "friend_request_rejected", payload: { username: user.username } });
        return { status };
    },
    async unfriend(userId, otherId) {
        if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(otherId)) {
            throw new ApiError(400, "User id is invalid.");
        }
        if (String(userId) === String(otherId)) throw new ApiError(400, "You cannot remove yourself.");
        const user = await ensureUser(userId);
        const other = await ensureUser(otherId);
        const existing = relation(user, otherId);
        const reverse = relation(other, userId);
        if (existing?.status !== "accepted" && reverse?.status !== "accepted") {
            throw new ApiError(409, "You are not friends with this user.");
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const ownerResult = await User.updateOne(
                    { _id: userId },
                    { $pull: { friends: { user: otherId } } },
                    { session }
                );
                const otherResult = await User.updateOne(
                    { _id: otherId },
                    { $pull: { friends: { user: userId } } },
                    { session }
                );
                if (ownerResult.modifiedCount !== 1 && otherResult.modifiedCount !== 1) {
                    throw new ApiError(409, "Friendship changed. Please refresh and try again.");
                }
            });
        } finally {
            await session.endSession();
        }
        const { ChatService } = await import("../chat/chat.service.js");
        await ChatService.remove(userId, otherId);
        return { friendStatus: "none" };
    },
    async isFriend(userId, otherId) {
        const [user, other] = await Promise.all([
            User.findOne({ _id: userId, friends: { $elemMatch: { user: otherId, status: "accepted" } } }).select("_id").lean(),
            User.findOne({ _id: otherId, friends: { $elemMatch: { user: userId, status: "accepted" } } }).select("_id").lean()
        ]);
        return Boolean(user || other);
    }
};

import { User } from "../../models/user.model.js";
import { BattleReport } from "../../models/battleReport.model.js";
import { BATTLE_TIMEZONE } from "../battle/battle.constants.js";
import { isStreakActive } from "../../utils/streak.js";

const TOP_LIMIT = 10;

export const LeaderboardService = {
    async top(limit = TOP_LIMIT) {
        const safeLimit = Math.max(1, Math.min(TOP_LIMIT, Number(limit) || TOP_LIMIT));
        const [leaderboard] = await BattleReport.aggregate([
            { $match: { battle_points: { $gt: 0 } } },
            {
                $lookup: {
                    from: User.collection.name,
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            { $match: { "user.status": "ACTIVE" } },
            {
                $facet: {
                    leaders: [
                        { $sort: { battle_points: -1, user_id: 1 } },
                        { $limit: safeLimit },
                        {
                            $project: {
                                _id: 0,
                                userId: "$user._id",
                                username: "$user.username",
                                avatarUrl: { $ifNull: ["$user.avatar.url", null] },
                                battleScore: "$battle_points"
                            }
                        }
                    ],
                    count: [{ $count: "total" }]
                }
            }
        ]);
        const leaders = (leaderboard?.leaders || []).map((entry, index) => ({
            ...entry,
            userId: String(entry.userId),
            position: index + 1,
            battleScore: Number(entry.battleScore) || 0
        }));
        const positiveCount = leaderboard?.count?.[0]?.total || 0;
        const zeroUsers = leaders.length < safeLimit
            ? await User.find({
                status: "ACTIVE",
                _id: { $nin: leaders.map((entry) => entry.userId) }
            })
                .select("_id username avatar")
                .sort({ _id: 1 })
                .limit(safeLimit - leaders.length)
                .lean()
            : [];
        return [
            ...leaders,
            ...zeroUsers.map((user, index) => ({
                position: positiveCount + index + 1,
                userId: String(user._id),
                username: user.username,
                avatarUrl: user.avatar?.url || null,
                battleScore: 0
            }))
        ];
    },
    async me(userId) {
        const user = await User.findOne({ _id: userId, status: "ACTIVE" }).select("_id").lean();
        if (!user) return { position: null, battleScore: 0, totalPlayers: 0 };
        const [totalPlayers, report] = await Promise.all([
            User.countDocuments({ status: "ACTIVE" }),
            BattleReport.findOne({ user_id: userId }).select("battle_points streak").lean()
        ]);
        const score = Number(report?.battle_points || 0);
        const [positionResult] = await BattleReport.aggregate([
            { $match: { battle_points: { $gt: score } } },
            {
                $lookup: {
                    from: User.collection.name,
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            { $match: { "user.status": "ACTIVE" } },
            { $count: "total" }
        ]);
        const positionAbove = positionResult?.total || 0;
        const timezone = report?.streak?.timezone || BATTLE_TIMEZONE;
        const lastMatchDate = report?.streak?.lastMatchDate;
        const currentStreak = isStreakActive(report?.streak, new Date(), timezone)
            ? Number(report?.streak?.currentStreak || 0)
            : 0;
        return {
            position: positionAbove + 1,
            battleScore: score,
            totalPlayers,
            currentStreak,
            longestStreak: Number(report?.streak?.longest_streak || 0),
            lastMatchDate: lastMatchDate || null,
            timezone
        };
    },
};

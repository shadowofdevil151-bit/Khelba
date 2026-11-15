import { BattleReport } from "../models/battleReport.model.js";
import { BATTLE_TIMEZONE } from "../modules/battle/battle.constants.js";
import { calculateStreak } from "../utils/streak.js";

const MAX_STREAK_UPDATE_ATTEMPTS = 8;

export const StreakService = {
    async recordActivity(userId, activityDate = new Date()) {
        try {
            await BattleReport.updateOne(
                { user_id: userId },
                { $setOnInsert: { user_id: userId } },
                { upsert: true }
            );
        } catch (error) {
            if (error?.code !== 11000 || !await BattleReport.exists({ user_id: userId })) {
                throw error;
            }
        }

        for (let attempt = 0; attempt < MAX_STREAK_UPDATE_ATTEMPTS; attempt += 1) {
            const report = await BattleReport.findOne({ user_id: userId })
                .select("streak")
                .lean();
            if (!report) throw new Error("Could not load the activity streak report.");

            const previous = report.streak || {};
            const next = calculateStreak(previous, activityDate, BATTLE_TIMEZONE);
            const previousCurrentStreak = Number(previous.currentStreak);
            const result = await BattleReport.updateOne(
                {
                    user_id: userId,
                    "streak.lastMatchDate": previous.lastMatchDate ?? null,
                    "streak.currentStreak": Number.isFinite(previousCurrentStreak)
                        ? previousCurrentStreak
                        : { $exists: false }
                },
                {
                    $set: {
                        "streak.currentStreak": next.currentStreak,
                        "streak.longest_streak": next.longest_streak,
                        "streak.lastMatchDate": next.lastMatchDate,
                        "streak.timezone": next.timezone
                    }
                }
            );
            if (result.matchedCount === 1) return next;
        }

        throw new Error("Could not record activity streak after concurrent update retries.");
    }
};

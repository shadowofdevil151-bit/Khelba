export const dateInTimezone = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
};

export const daysBetweenDateKeys = (from, to) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) {
        return null;
    }
    const fromTime = Date.parse(`${from}T00:00:00.000Z`);
    const toTime = Date.parse(`${to}T00:00:00.000Z`);
    if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return null;
    return (toTime - fromTime) / 86400000;
};

export const calculateStreak = (previous = {}, activityDate, timeZone) => {
    const today = dateInTimezone(activityDate, timeZone);
    const lastMatchDate = previous.lastMatchDate || null;
    const current = Number.isFinite(Number(previous.currentStreak))
        ? Number(previous.currentStreak)
        : 0;
    const longest = Number.isFinite(Number(previous.longest_streak))
        ? Number(previous.longest_streak)
        : 0;

    let currentStreak = current;
    if (!lastMatchDate) currentStreak = 1;
    else if (today > lastMatchDate) {
        currentStreak = daysBetweenDateKeys(lastMatchDate, today) === 1 ? current + 1 : 1;
    }

    const effectiveDate = lastMatchDate && today < lastMatchDate ? lastMatchDate : today;
    return {
        currentStreak,
        longest_streak: Math.max(longest, currentStreak),
        lastMatchDate: effectiveDate,
        timezone: timeZone
    };
};

export const isStreakActive = (streak = {}, now, timeZone) => {
    const lastActivityDate = streak.lastMatchDate;
    if (!lastActivityDate) return false;
    const today = dateInTimezone(now, timeZone);
    const daysSinceActivity = daysBetweenDateKeys(lastActivityDate, today);
    return daysSinceActivity === 0 || daysSinceActivity === 1;
};

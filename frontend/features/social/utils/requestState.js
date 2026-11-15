// Pure helpers for the friend-request state machine on the client.
// Do not import React here. No side effects.
export const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function canCancelRequest(user, otherId) {
    const entry = (user?.friends || []).find((f) => String(f.user) === String(otherId));
    return Boolean(entry && entry.status === "requested" && String(entry.requestedBy) === String(user._id));
}

export function hoursUntilRetry(requestSentAt, now = Date.now()) {
    if (!requestSentAt) return 0;
    const elapsed = now - new Date(requestSentAt).getTime();
    const remaining = RESEND_COOLDOWN_MS - elapsed;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / (60 * 60 * 1000));
}

export function describeFriendship(status, requestSentAt) {
    if (status === "friends") return { kind: "friends", label: "Friends", chip: "social-chip-emerald" };
    if (status === "pending_out") {
        const hours = hoursUntilRetry(requestSentAt);
        if (hours > 0) return { kind: "pending_out", label: `Requested · ${hours}h`, chip: "social-chip-amber", hoursLeft: hours };
        return { kind: "retryable", label: "Retry request", chip: "social-chip-amber" };
    }
    if (status === "pending_in") return { kind: "pending_in", label: "Incoming", chip: "social-chip-violet" };
    if (status === "rejected") return { kind: "rejected", label: "Request declined", chip: "social-chip-rose" };
    if (status === "self") return { kind: "self", label: "You", chip: "social-chip-sky" };
    return { kind: "none", label: "Add friend", chip: "social-chip-sky" };
}

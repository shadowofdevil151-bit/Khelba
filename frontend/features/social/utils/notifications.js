import { MessageCircle, UserPlus, UserCheck, Swords, Trophy, Flame, Info, Bell } from "lucide-react";

const META = {
    friend_chat: { icon: MessageCircle, tone: "sky", title: (p) => `New message from ${p.senderName || "a friend"}` },
    friend_request: { icon: UserPlus, tone: "violet", title: (p) => `${p.username || "Someone"} sent a friend request` },
    friend_request_accepted: { icon: UserCheck, tone: "emerald", title: (p) => `${p.username || "Someone"} accepted your request` },
    friend_request_rejected: { icon: UserCheck, tone: "rose", title: (p) => `${p.username || "Someone"} declined your request` },
    friend_battle_request: { icon: Swords, tone: "amber", title: () => "Battle invitation" },
    friend_battle_abandoned: { icon: Swords, tone: "zinc", title: () => "Battle invitation expired" },
    friend_battle_rejected: { icon: Swords, tone: "zinc", title: () => "সাথী চ্যালেঞ্জ প্রত্যাখ্যান করেছে" },
    friend_battle_accepted: { icon: Trophy, tone: "emerald", title: () => "Battle invitation accepted" },
    battle_result: { icon: Trophy, tone: "amber", title: () => "Battle result" },
    battle_win: { icon: Trophy, tone: "amber", title: () => "You won a battle" },
    battle_loss: { icon: Trophy, tone: "rose", title: () => "You lost a battle" },
    streak: { icon: Flame, tone: "orange", title: () => "Streak update" },
    system: { icon: Info, tone: "zinc", title: () => "System update" }
};

const toneClasses = {
    sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    zinc: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
};

export const EXPIRY_TTL_MS = {
    friend_battle_request: 120000
};

export function computeExpiresAt(item) {
    const ttl = EXPIRY_TTL_MS[item?.type];
    if (!ttl) return null;
    const created = Date.parse(item?.createdAt);
    return Number.isFinite(created) ? created + ttl : null;
}

export function notificationStatus(item, now = Date.now()) {
    const expiresAt = computeExpiresAt(item);
    return expiresAt !== null && expiresAt <= now ? "expired" : item?.seen ? "seen" : "idle";
}

export function notificationMeta(item) {
    const entry = META[item.type] || META.system;
    return {
        icon: entry.icon,
        tone: entry.tone,
        toneClass: toneClasses[entry.tone] || toneClasses.zinc,
        title: entry.title(item.payload || {})
    };
}

export function groupByDay(items) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const groups = new Map();
    for (const item of items) {
        const timestamp = new Date(item.createdAt).getTime();
        const label = timestamp >= today ? "Today" : timestamp >= yesterday ? "Yesterday" : "Earlier";
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(item);
    }
    return ["Today", "Yesterday", "Earlier"].filter((label) => groups.has(label)).map((label) => [label, groups.get(label)]);
}

export function notificationAction(item) {
    switch (item.type) {
        case "friend_chat":
            return (item.actor || item.payload?.senderId)
                ? { kind: "open_chat", senderId: String(item.actor || item.payload.senderId) }
                : null;
        case "friend_request":
        case "friend_request_accepted":
        case "friend_request_rejected":
            return { kind: "switch_tab", tab: "requests" };
        case "battle_result":
        case "battle_win":
        case "battle_loss":
        case "friend_battle_accepted":
            return { kind: "route", href: "/battle" };
        case "friend_battle_request":
            if (notificationStatus(item) === "expired") return null;
            return item.payload?.requestId
                ? { kind: "route", href: `/battle?battleRequestId=${encodeURIComponent(item.payload.requestId)}` }
                : { kind: "route", href: "/battle" };
        case "friend_battle_rejected":
            return null;
        default:
            return null;
    }
}

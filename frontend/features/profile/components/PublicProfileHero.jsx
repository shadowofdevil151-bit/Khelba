"use client";

import { Check, MessageCircle, Swords, UserPlus, X } from "lucide-react";
import UserAvatar from "@/features/social/components/UserAvatar";

const streamStyles = {
    SCIENCE: { label: "বিজ্ঞান", color: "rgba(34, 211, 238, .28)", pill: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200" },
    ARTS: { label: "মানবিক", color: "rgba(244, 63, 94, .28)", pill: "border-rose-300/25 bg-rose-300/10 text-rose-200" },
    COMMERCE: { label: "ব্যবসায় শিক্ষা", color: "rgba(245, 158, 11, .28)", pill: "border-amber-300/25 bg-amber-300/10 text-amber-200" }
};

const buttonBase = "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export default function PublicProfileHero({ profile, friendStatus, onFriendAction, onReject, onMessage, onBattle }) {
    const stream = streamStyles[profile?.profile?.education_stream] || streamStyles.SCIENCE;
    const classLevel = Number(profile?.profile?.education_year) === 2 ? "১২" : "১১";
    const joined = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString("bn-BD", { month: "long", year: "numeric" })
        : "অজানা";
    const action = friendStatus === "none"
        ? <button type="button" onClick={() => onFriendAction("none")} className={`${buttonBase} bg-sky-500 text-white hover:bg-sky-400`}><UserPlus size={16}/>বন্ধু যোগ করুন</button>
        : friendStatus === "pending_sent"
            ? <button type="button" disabled className={`${buttonBase} border border-white/10 bg-white/5 text-zinc-400`}><Check size={16}/>অনুরোধ পাঠানো হয়েছে</button>
            : friendStatus === "pending_received"
                ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onFriendAction("pending_received")} className={`${buttonBase} bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25`}><Check size={16}/>অনুরোধ গ্রহণ করুন</button><button type="button" onClick={onReject} className={`${buttonBase} border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10`}><X size={15}/>প্রত্যাখ্যান</button></div>
                : <button type="button" onClick={() => onFriendAction("friends")} className={`${buttonBase} border border-rose-400/25 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20`}><X size={16}/>বন্ধু সরান</button>;

    return <section className="relative h-auto min-h-52 overflow-hidden rounded-2xl border-b-2 border-cyan-300/50 bg-[#111318] p-5 sm:min-h-64 sm:p-8" style={{ backgroundImage: `radial-gradient(ellipse at 100% 0%, ${stream.color}, transparent 62%)` }}>
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-white/[.03] blur-3xl"/>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="rounded-full ring-4 ring-[#111318]"><UserAvatar user={profile} size="xl" className="h-24 w-24"/></div>
            <div className="min-w-0 flex-1">
                <h1 className="truncate text-3xl font-bold text-white">{profile?.username || "শিক্ষার্থী"}</h1>
                <p className="mt-1 text-sm text-zinc-400">@{profile?.username || "শিক্ষার্থী"} · যোগ দিয়েছেন {joined}</p>
                <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stream.pill}`}>{stream.label}</span><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs text-zinc-300">এইচএসসি · {classLevel} শ্রেণি</span></div>
                <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-zinc-300">{profile?.profile?.bio || "এই শিক্ষার্থী এখনো কোনো পরিচিতি যোগ করেনি।"}</p>
            </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-2 sm:ml-[7.5rem]">
            {action}
            <button type="button" onClick={onMessage} disabled={friendStatus !== "friends"} className={`${buttonBase} border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10`}><MessageCircle size={16}/>মেসেজ</button>
            <button type="button" onClick={onBattle} disabled={friendStatus !== "friends"} className={`${buttonBase} border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10`}><Swords size={16}/>ব্যাটল</button>
        </div>
    </section>;
}

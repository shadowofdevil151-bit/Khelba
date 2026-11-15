"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Flame, Target, Trophy, Zap } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import LoadingState from "@/components/LoadingState";
import RequestErrorState from "@/components/RequestErrorState";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import AcademyMetric from "@/features/academy/components/AcademyMetric";
import PublicProfileHero from "../components/PublicProfileHero";
import SubjectStrengthBar from "../components/SubjectStrengthBar";
import RecentBattleRow from "../components/RecentBattleRow";

const statusFromProfile = (profile) => {
    if (profile?.friendStatus === "friends" || profile?.friendStatus === "accepted") return "friends";
    if (profile?.friendStatus === "pending_sent" || profile?.friendStatus === "pending_received") return profile.friendStatus;
    if (profile?.friendshipStatus === "pending_out") return "pending_sent";
    if (profile?.friendshipStatus === "pending_in") return "pending_received";
    if (profile?.friendshipStatus === "friends" || profile?.friendshipStatus === "accepted") return "friends";
    return "none";
};

export default function PublicProfilePage() {
    const { userId } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [friendStatus, setFriendStatus] = useState("none");
    const [removeOpen, setRemoveOpen] = useState(false);
    const [actionPending, setActionPending] = useState(false);
    const [actionError, setActionError] = useState("");
    const controllerRef = useRef(null);

    const load = async (signal) => {
        setLoading(true);
        setError("");
        try {
            const body = await api(`/users/${encodeURIComponent(userId)}/profile`, { signal });
            if (signal?.aborted) return;
            setProfile(body.data);
            setFriendStatus(statusFromProfile(body.data));
        } catch (requestError) {
            if (requestError.name !== "AbortError" && !signal?.aborted) setError(requestError.message || "প্রোফাইল লোড করা যায়নি।");
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        if (user?._id && String(user._id) === String(userId)) {
            router.replace("/profile");
            return undefined;
        }
        const controller = new AbortController();
        controllerRef.current = controller;
        load(controller.signal);
        return () => {
            controllerRef.current?.abort();
            controllerRef.current = null;
        };
    }, [user?._id, userId]);

    const doFriendAction = async (requestedStatus) => {
        if (!profile?._id || actionPending) return;
        if (requestedStatus === "friends") {
            setActionError("");
            setRemoveOpen(true);
            return;
        }
        setActionPending(true);
        setActionError("");
        try {
            if (requestedStatus === "none") {
                await api(`/users/${profile._id}/friend-request`, { method: "POST", body: JSON.stringify({}) });
                setFriendStatus("pending_sent");
            } else if (requestedStatus === "pending_received") {
                await api(`/users/${profile._id}/friend-response`, { method: "POST", body: JSON.stringify({ accept: true }) });
                setFriendStatus("friends");
            }
        } catch (requestError) {
            setActionError(requestError.message || "বন্ধুত্বের অনুরোধটি সম্পন্ন করা যায়নি।");
        } finally {
            setActionPending(false);
        }
    };

    const rejectRequest = async () => {
        if (!profile?._id || actionPending) return;
        setActionPending(true);
        setActionError("");
        try {
            await api(`/users/${profile._id}/friend-response`, { method: "POST", body: JSON.stringify({ accept: false }) });
            setFriendStatus("none");
        } catch (requestError) {
            setActionError(requestError.message || "অনুরোধটি প্রত্যাখ্যান করা যায়নি।");
        } finally {
            setActionPending(false);
        }
    };

    const removeFriend = async () => {
        if (!profile?._id || actionPending) return;
        setActionPending(true);
        setActionError("");
        try {
            await api(`/users/friends/${profile._id}`, { method: "DELETE" });
            setFriendStatus("none");
            setRemoveOpen(false);
        } catch (requestError) {
            setActionError(requestError.message || "বন্ধুকে সরানো যায়নি।");
        } finally {
            setActionPending(false);
        }
    };

    const stats = profile?.stats;
    const statsData = useMemo(() => stats ? [
        { icon: Flame, label: "স্ট্রিক", value: formatBanglaNumber(stats.streak || 0), detail: "দিন", accent: "rose" },
        { icon: Zap, label: "পয়েন্ট", value: formatBanglaNumber(stats.points || 0), detail: "ব্যাটল পয়েন্ট", accent: "cyan" },
        { icon: Trophy, label: "জয় / মোট", value: `${formatBanglaNumber(stats.wins || 0)} / ${formatBanglaNumber(stats.total_battles || 0)}`, detail: "ব্যাটল", accent: "emerald" },
        { icon: Target, label: "নির্ভুলতা", value: `${formatBanglaNumber(Math.round(stats.accuracy || 0))}%`, detail: "সঠিক উত্তর", accent: "violet" }
    ] : [], [stats]);

    if (loading) return <div className="mx-auto grid min-h-[60vh] max-w-4xl place-items-center px-4"><LoadingState title="প্রোফাইল খোলা হচ্ছে" detail="শিক্ষার্থীর তথ্য প্রস্তুত করছি…" className="w-full"/></div>;
    if (error || !profile) return <div className="mx-auto max-w-xl py-8"><button type="button" onClick={() => router.back()} className="ghost mb-5 inline-flex items-center gap-2"><ArrowLeft size={16}/>ফিরে যান</button><RequestErrorState title="প্রোফাইল লোড করা যায়নি" detail={error || "এই প্রোফাইলটি খুঁজে পাওয়া যায়নি।"} onRetry={() => { controllerRef.current?.abort(); const controller = new AbortController(); controllerRef.current = controller; load(controller.signal); }}/></div>;

    const subjects = Array.isArray(profile.subjectStrength) ? profile.subjectStrength : [];
    const battles = Array.isArray(profile.recentBattles) ? profile.recentBattles.slice(0, 5) : [];

    return <div className="mx-auto max-w-6xl space-y-5 py-2">
        <button type="button" onClick={() => router.back()} className="ghost inline-flex items-center gap-2"><ArrowLeft size={16}/>ফিরে যান</button>
        {actionError && !removeOpen && <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{actionError}</div>}
        <PublicProfileHero profile={profile} friendStatus={friendStatus} onFriendAction={doFriendAction} onReject={rejectRequest} onMessage={() => router.push(`/social?userId=${encodeURIComponent(profile._id)}`)} onBattle={() => router.push(`/battle?friendId=${encodeURIComponent(profile._id)}`)}/>
        {statsData.length > 0 && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{statsData.map((item) => <AcademyMetric key={item.label} {...item}/>)}</div>}
        {(profile.subjectStrength !== undefined || profile.recentBattles !== undefined) && <div className="grid gap-5 lg:grid-cols-2">
            {profile.subjectStrength !== undefined && <section className="panel p-5 sm:p-7"><h2 className="text-lg font-bold text-white">বিষয়ভিত্তিক দক্ষতা</h2><div className="mt-5 space-y-4">{subjects.length ? subjects.map((item, index) => <SubjectStrengthBar key={`${item.code || item.name}-${index}`} item={item}/>) : <p className="py-6 text-center text-sm text-zinc-500">এখনো কোনো বিষয়ে পর্যাপ্ত তথ্য নেই।</p>}</div></section>}
            {profile.recentBattles !== undefined && <section className="panel p-5 sm:p-7"><h2 className="text-lg font-bold text-white">সাম্প্রতিক ব্যাটল</h2><div className="mt-3">{battles.length ? battles.map((item, index) => <RecentBattleRow key={`${item.endedAt || "battle"}-${index}`} battle={item}/>) : <p className="py-6 text-center text-sm text-zinc-500">এখনো কোনো ব্যাটল হয়নি।</p>}</div></section>}
        </div>}
        {removeOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionPending) setRemoveOpen(false); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="public-remove-friend-title" className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#14161b] p-5 shadow-2xl">
                <h2 id="public-remove-friend-title" className="text-base font-semibold text-zinc-100">বন্ধু তালিকা থেকে সরাবেন?</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{profile.username || "এই বন্ধুকে"} কে বন্ধু তালিকা থেকে সরাতে চান?</p>
                {actionError && <p role="alert" className="mt-3 text-sm text-rose-300">{actionError}</p>}
                <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setRemoveOpen(false)} disabled={actionPending} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">বাতিল</button><button type="button" onClick={removeFriend} disabled={actionPending} className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/25 disabled:cursor-wait disabled:opacity-50">{actionPending ? "সরানো হচ্ছে…" : "সরান"}</button></div>
            </div>
        </div>}
    </div>;
}

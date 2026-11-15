"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Flame, LogOut, Pencil, ShieldAlert, Target, Trophy, Upload, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import LoadingState from "@/components/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const DEFAULT_FORM = {
    username: "",
    bio: "",
    education_stream: "SCIENCE",
    institution: "",
    class_level: "11"
};
const STREAMS = {
    SCIENCE: { label: "বিজ্ঞান", accent: "from-cyan-500/80 via-sky-500/50 to-indigo-500/80", pill: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200" },
    ARTS: { label: "মানবিক", accent: "from-rose-500/80 via-pink-500/50 to-violet-500/80", pill: "border-rose-300/25 bg-rose-300/10 text-rose-200" },
    COMMERCE: { label: "ব্যবসায় শিক্ষা", accent: "from-amber-500/80 via-orange-500/50 to-yellow-500/80", pill: "border-amber-300/25 bg-amber-300/10 text-amber-200" }
};

function formFromUser(account) {
    const profile = account?.profile || {};
    return {
        username: account?.username || "",
        bio: profile.bio || "",
        education_stream: profile.education_stream || "SCIENCE",
        institution: profile.institution || "",
        class_level: Number(profile.education_year) === 2 ? "12" : "11"
    };
}

function joinedDate(date) {
    if (!date) return "সদস্য হওয়ার তারিখ অজানা";
    return `সদস্য হয়েছেন ${new Date(date).toLocaleDateString("bn-BD", { month: "long", year: "numeric" })}`;
}

function Avatar({ user, preview, onPick, uploading }) {
    const name = user?.username || "শিক্ষার্থী";
    const source = preview || user?.avatar?.url;
    return <div className="relative h-24 w-24 shrink-0">
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-500 text-3xl font-bold text-white ring-4 ring-[#111318]">
            {source ? <img src={source} alt="প্রোফাইল ছবি" className="h-full w-full object-cover"/> : name.slice(0, 1).toUpperCase()}
        </div>
        <button type="button" onClick={onPick} disabled={uploading} className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-4 border-[#111318] bg-sky-500 text-white shadow-lg transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-70" aria-label="প্রোফাইল ছবি বদলান">
            {uploading ? <Upload size={15} className="animate-pulse"/> : <Camera size={15}/>}
        </button>
    </div>;
}

function Stat({ icon: Icon, label, value, detail, accent }) {
    return <div className={`academy-metric-${accent} min-h-32 rounded-2xl border border-white/10 bg-[#111318] p-4 transition-colors hover:border-white/25 sm:p-5`}>
        <div className="flex items-center gap-2 text-sm text-zinc-400"><Icon size={16} className="text-zinc-500"/><span>{label}</span></div>
        <div className="bangla-digits mt-3 text-2xl font-semibold leading-none text-white sm:text-3xl">{value}</div>
        <div className="mt-2 text-xs text-zinc-500">{detail}</div>
    </div>;
}

export default function ProfilePage() {
    const router = useRouter();
    const { user, setUser, logout } = useAuth();
    const [form, setForm] = useState(DEFAULT_FORM);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [preview, setPreview] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const inputRef = useRef(null);
    const previewUrlRef = useRef("");

    const load = async () => {
        setLoading(true);
        setError("");
        const [profileResult, rankResult, reportResult] = await Promise.allSettled([
            api("/users/me"),
            api("/leaderboard/me"),
            api("/academic/report/summary")
        ]);
        if (profileResult.status === "fulfilled") {
            setUser(profileResult.value.data);
            setForm(formFromUser(profileResult.value.data));
        } else {
            setError(profileResult.reason?.message || "প্রোফাইল লোড করা যায়নি।");
        }
        if (rankResult.status === "fulfilled" || reportResult.status === "fulfilled") {
            const rank = rankResult.status === "fulfilled" ? rankResult.value.data || {} : {};
            const report = reportResult.status === "fulfilled" ? reportResult.value.data || {} : {};
            setStats({ ...rank, ...report });
        }
        if (rankResult.status === "rejected" || reportResult.status === "rejected") {
            setError((current) => current || "কিছু পরিসংখ্যান লোড করা যায়নি।");
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
        return () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        };
    }, []);

    const stream = STREAMS[form.education_stream] || STREAMS.SCIENCE;
    const avatarSource = preview || user?.avatar?.url || "";
    const changed = JSON.stringify(form) !== JSON.stringify(formFromUser(user));
    const battleTotal = Number(stats?.battle_count?.total ?? stats?.totalBattles ?? 0);
    const battleWins = Number(stats?.battle_count?.win ?? stats?.wins ?? 0);
    const accuracy = Number(stats?.accuracy ?? stats?.performance?.accuracy ?? stats?.totals?.accuracy ?? 0);
    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

    const chooseAvatar = () => {
        setEditing(true);
        inputRef.current?.click();
    };

    const uploadAvatar = async (file) => {
        const previousPreview = preview;
        const objectUrl = URL.createObjectURL(file);
        previewUrlRef.current = objectUrl;
        setPreview(objectUrl);
        setUploading(true);
        setError("");
        setSuccess("");
        try {
            const body = new FormData();
            body.append("avatar", file);
            body.append("institution", form.institution);
            body.append("bio", form.bio);
            body.append("education_level", "HSC");
            body.append("education_year", form.class_level === "12" ? "2" : "1");
            body.append("education_stream", form.education_stream);
            const response = await api("/users/me", { method: "PATCH", body });
            setUser(response.data);
            setPreview("");
            URL.revokeObjectURL(objectUrl);
            previewUrlRef.current = "";
            setSuccess("প্রোফাইল ছবি হালনাগাদ হয়েছে।");
        } catch (requestError) {
            setPreview(previousPreview);
            URL.revokeObjectURL(objectUrl);
            previewUrlRef.current = previousPreview;
            setError(requestError.message || "প্রোফাইল ছবি আপলোড করা যায়নি।");
        } finally {
            setUploading(false);
        }
    };

    const selectAvatar = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("শুধু ছবি ফাইল বেছে নিন।");
            return;
        }
        if (file.size > MAX_AVATAR_SIZE) {
            setError("ছবির আকার ৫ এমবির কম হতে হবে।");
            return;
        }
        void uploadAvatar(file);
    };

    const save = async (event) => {
        event.preventDefault();
        if (saving || !changed || !form.username.trim()) return;
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            const response = await api("/users/me", {
                method: "PATCH",
                body: JSON.stringify({
                    username: form.username.trim(),
                    bio: form.bio,
                    institution: form.institution,
                    education_level: "HSC",
                    education_year: form.class_level === "12" ? 2 : 1,
                    education_stream: form.education_stream
                })
            });
            setUser(response.data);
            setForm(formFromUser(response.data));
            setEditing(false);
            setSuccess("আপনার তথ্য হালনাগাদ হয়েছে।");
        } catch (requestError) {
            setError(requestError.message || "তথ্য সংরক্ষণ করা যায়নি।");
        } finally {
            setSaving(false);
        }
    };

    const cancelEdit = () => {
        setForm(formFromUser(user));
        setEditing(false);
        setError("");
    };

    const handleLogout = async () => {
        await logout();
        router.replace("/login");
    };

    const statsData = useMemo(() => [
        { icon: Flame, label: "স্ট্রিক", value: formatBanglaNumber(stats?.currentStreak || 0), detail: "দিন", accent: "rose" },
        { icon: Zap, label: "মোট পয়েন্ট", value: formatBanglaNumber(stats?.battleScore || 0), detail: "ব্যাটল পয়েন্ট", accent: "cyan" },
        { icon: Trophy, label: "জয় / মোট ব্যাটল", value: `${formatBanglaNumber(battleWins)} / ${formatBanglaNumber(battleTotal)}`, detail: "জয় ও অংশগ্রহণ", accent: "emerald" },
        { icon: Target, label: "নির্ভুলতা", value: `${formatBanglaNumber(Math.round(accuracy))}%`, detail: "সঠিক উত্তরের হার", accent: "violet" }
    ], [accuracy, battleTotal, battleWins, stats]);

    if (loading) return <div className="grid min-h-[60vh] place-items-center"><LoadingState title="প্রোফাইল প্রস্তুত হচ্ছে" detail="আপনার তথ্য লোড করছি…"/></div>;

    return <div className="mx-auto max-w-6xl space-y-5">
        {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"><span>{error}</span><button type="button" onClick={load} className="shrink-0 font-semibold underline underline-offset-4">আবার চেষ্টা</button></div>}
        {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-4 py-3 text-sm text-emerald-200"><Check size={16}/>{success}</div>}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#191c23] shadow-2xl">
            <div className={`h-32 bg-gradient-to-r ${stream.accent} relative overflow-hidden`}><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/20 bg-white/10 blur-2xl"/><div className="absolute bottom-0 left-1/3 h-16 w-1/2 rounded-full bg-white/10 blur-3xl"/></div>
            <div className="relative px-5 pb-5 sm:px-8">
                <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end">
                    <Avatar user={user} preview={avatarSource} onPick={chooseAvatar} uploading={uploading}/>
                    <div className="min-w-0 flex-1 pb-1"><h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{user?.username || "শিক্ষার্থী"}</h1><p className="mt-1 text-sm text-zinc-400">@{user?.username || "শিক্ষার্থী"}</p><p className="mt-2 text-xs text-zinc-500">{joinedDate(user?.createdAt)}</p></div>
                    <button type="button" onClick={() => setEditing((current) => !current)} className="social-btn-ghost shrink-0 self-start sm:self-end"><Pencil size={15}/>{editing ? "বন্ধ করুন" : "সম্পাদনা"}</button>
                </div>
                <div className="mt-5 flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stream.pill}`}>{stream.label}</span><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs text-zinc-300">এইচএসসি · {form.class_level === "12" ? "১২" : "১১"} শ্রেণি</span></div>
                <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-zinc-300">{form.bio || "নিজের সম্পর্কে কিছু লিখুন—আপনার শেখার যাত্রা এখান থেকেই শুরু।"}</p>
            </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{statsData.map((item) => <Stat key={item.label} {...item}/>)}</div>

        {editing && <form onSubmit={save} className="panel p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between"><div><div className="eyebrow">তথ্য সম্পাদনা</div><h2 className="mt-1 text-xl font-bold text-white">আপনার পরিচয়</h2></div><button type="button" onClick={cancelEdit} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="সম্পাদনা বন্ধ করুন"><X size={18}/></button></div>
            <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-zinc-400">ইউজারনেম<input className="field mt-2" value={form.username} maxLength={50} onChange={(event) => update("username", event.target.value)}/><span className="mt-1 block text-xs text-zinc-500">ইউজারনেম মাসে একবার পরিবর্তন করা যাবে।</span></label>
                <label className="text-sm text-zinc-400">শিক্ষাপ্রতিষ্ঠান<input className="field mt-2" value={form.institution} maxLength={160} onChange={(event) => update("institution", event.target.value)}/></label>
                <label className="text-sm text-zinc-400 md:col-span-2">পরিচিতি<textarea className="field mt-2 min-h-28 resize-y" maxLength={160} value={form.bio} onChange={(event) => update("bio", event.target.value)}/><span className="bangla-digits mt-1 block text-right text-xs text-zinc-500">{formatBanglaNumber(form.bio.length)}/{formatBanglaNumber(160)}</span></label>
                <label className="text-sm text-zinc-400">শিক্ষা বিভাগ<select className="field mt-2" value={form.education_stream} onChange={(event) => update("education_stream", event.target.value)}><option value="SCIENCE">বিজ্ঞান</option><option value="ARTS">মানবিক</option><option value="COMMERCE">ব্যবসায় শিক্ষা</option></select></label>
                <label className="text-sm text-zinc-400">শ্রেণি<select className="field mt-2" value={form.class_level} onChange={(event) => update("class_level", event.target.value)}><option value="11">১১</option><option value="12">১২</option></select></label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={cancelEdit} className="ghost">বাতিল</button><button type="submit" disabled={saving || !changed || !form.username.trim()} className="primary flex items-center gap-2"><Check size={16}/>{saving ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}</button></div>
        </form>}

        <section className="panel p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="eyebrow">অ্যাকাউন্ট</div><h2 className="mt-1 text-xl font-bold text-white">অ্যাকাউন্টের তথ্য</h2></div><button type="button" onClick={handleLogout} className="social-btn-ghost border-rose-400/25 text-rose-300 hover:border-rose-400/50 hover:bg-rose-400/10"><LogOut size={15}/>লগ আউট</button></div><div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-3"><div><div className="text-xs text-zinc-500">ইমেইল</div><div className="mt-1 truncate text-sm text-zinc-200">{user?.email || "—"}</div></div><div><div className="text-xs text-zinc-500">সদস্য হওয়ার তারিখ</div><div className="mt-1 text-sm text-zinc-200">{joinedDate(user?.createdAt).replace("সদস্য হয়েছেন ", "")}</div></div><div><div className="text-xs text-zinc-500">বর্তমান বিভাগ</div><div className="mt-1 text-sm text-zinc-200">{stream.label}</div></div></div></section>

        <section className="rounded-2xl border border-white/[.06] bg-white/[.015] p-5 sm:p-7"><div className="flex items-center gap-3 text-zinc-400"><ShieldAlert size={18}/><div><h2 className="text-sm font-semibold text-zinc-300">একাউন্ট মুছে ফেলুন</h2><p className="mt-1 text-xs text-zinc-600">এই সুবিধাটি শীঘ্রই আসছে।</p></div></div><button type="button" disabled title="শীঘ্রই আসছে" className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-600">একাউন্ট মুছে ফেলুন</button></section>
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={selectAvatar}/>
    </div>;
}

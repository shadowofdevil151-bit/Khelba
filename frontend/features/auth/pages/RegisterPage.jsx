"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { api } from "@/lib/api";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ username: "", email: "", password: "" });
    const [avatar, setAvatar] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const submit = async e => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => data.append(k, v));
            if (avatar) data.append("avatar", avatar);
            await api("/auth/register", { method: "POST", body: data });
            const next = new URLSearchParams(window.location.search).get("next");
            if (next && next.startsWith("/") && !next.startsWith("//")) sessionStorage.setItem("auth:next", next);
            router.replace("/login?registered=1");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="relative flex min-h-[100dvh] flex-col bg-[#202020] px-5 pb-8 pt-8 sm:grid sm:min-h-screen sm:place-items-center sm:bg-transparent sm:px-4 sm:py-10">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(68,104,195,0.16),transparent_65%)] sm:hidden" />
            <div className="relative flex w-full flex-1 flex-col justify-between sm:mx-auto sm:max-w-md sm:flex-none sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#2a2a2a] sm:p-8 sm:shadow-md">
                <div>
                    <div className="mb-6 flex items-center gap-2.5">
                        <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brass-200 to-brass-400 font-serif text-2xl font-bold text-ink-950 shadow-lg shadow-brass-400/15">K</span>
                        <span className="text-lg font-semibold tracking-wide text-white">Khelba</span>
                    </div>
                    <div className="eyebrow mb-3">শুরুটা হোক সুন্দর</div>
                    <h1 className="text-[28px] font-bold leading-[1.25] text-paper sm:font-serif sm:text-4xl">আপনার জায়গা তৈরি করুন।</h1>
                    <p className="mt-2 text-sm text-paper/60 sm:text-base">আপনার অগ্রগতি, ব্যাটল ও বন্ধুরা—সব এক জায়গায়।</p>
                </div>

                {error && <div className="mt-4 mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}

                <form onSubmit={submit} className="mt-6 space-y-3">
                    <div className="relative">
                        <User aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper/40" />
                        <input
                            className="field w-full"
                            style={{ paddingLeft: "44px", height: "52px", fontSize: "16px" }}
                            placeholder="ইউজারনেম"
                            aria-label="ইউজারনেম"
                            required
                            minLength={3}
                            value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                        />
                    </div>
                    <div className="relative">
                        <Mail aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper/40" />
                        <input
                            className="field w-full"
                            style={{ paddingLeft: "44px", height: "52px", fontSize: "16px" }}
                            type="email"
                            placeholder="ইমেইল ঠিকানা"
                            aria-label="ইমেইল ঠিকানা"
                            required
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <div className="relative">
                        <Lock aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper/40" />
                        <input
                            className="field w-full"
                            style={{ paddingLeft: "44px", paddingRight: "48px", height: "52px", fontSize: "16px" }}
                            type={showPassword ? "text" : "password"}
                            placeholder="পাসওয়ার্ড"
                            aria-label="পাসওয়ার্ড"
                            required
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
                            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-paper/55 transition-colors hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-300/60"
                        >
                            {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                    </div>
                    <label className="block text-sm text-paper/60">
                        প্রোফাইল ছবি
                        <input className="field mt-2 w-full text-sm" type="file" accept="image/*" required onChange={e => setAvatar(e.target.files?.[0])} />
                    </label>
                    <button className="primary w-full" disabled={loading} style={{ height: "52px", fontSize: "16px" }}>
                        {loading ? "অ্যাকাউন্ট তৈরি হচ্ছে…" : "অ্যাকাউন্ট তৈরি করুন"}
                    </button>
                </form>

                <p className="mt-6 pt-6 text-center text-sm text-paper/60">
                    আগে থেকেই অ্যাকাউন্ট আছে? <Link className="font-semibold text-sky-400 underline-offset-4 hover:underline" href="/login">লগ ইন করুন</Link>
                </p>
            </div>
        </main>
    );
}
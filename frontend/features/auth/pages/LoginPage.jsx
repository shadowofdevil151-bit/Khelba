"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
    const { login, googleLogin } = useAuth();
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(form);
            const next = typeof window !== "undefined" ? sessionStorage.getItem("auth:next") : null;
            if (typeof window !== "undefined") sessionStorage.removeItem("auth:next");
            const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
            router.replace(safeNext);
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
                    <div className="eyebrow mb-3">আবার স্বাগতম</div>
                    <h1 className="text-[28px] font-bold leading-[1.25] text-paper sm:font-serif sm:text-4xl">আপনার পড়ার জায়গায় ফিরুন।</h1>
                    <p className="mt-2 text-sm text-paper/60 sm:text-base">শান্ত পরিবেশে অনুশীলন করুন ও প্রতিযোগিতায় অংশ নিন।</p>
                </div>

                {error && <div className="mt-4 mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}

                <form onSubmit={submit} className="mt-6 space-y-3">
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
                    <button className="primary w-full" disabled={loading} style={{ height: "52px", fontSize: "16px" }}>
                        {loading ? "খোলা হচ্ছে…" : "লগ ইন"}
                    </button>
                </form>

                <div className="my-5 flex items-center gap-3 text-xs text-paper/45">
                    <span className="h-px flex-1 bg-white/10" />
                    অথবা
                    <span className="h-px flex-1 bg-white/10" />
                </div>

                <button
                    type="button"
                    onClick={googleLogin}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/12 bg-[#282828] text-sm font-semibold text-paper transition-colors hover:bg-[#303030]"
                    style={{ height: "52px" }}
                >
                    <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20">
                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                    </svg>
                    গুগল দিয়ে চালিয়ে যান
                </button>

                <p className="mt-6 pt-6 text-center text-sm text-paper/60">
                    অ্যাকাউন্ট নেই? <Link className="font-semibold text-sky-400 underline-offset-4 hover:underline" href="/register">নতুন অ্যাকাউন্ট খুলুন</Link>
                </p>
            </div>
        </main>
    );
}
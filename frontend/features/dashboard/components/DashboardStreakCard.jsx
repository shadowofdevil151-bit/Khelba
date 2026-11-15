import { Flame } from "lucide-react";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

export default function DashboardStreakCard({ rank = null, error = false, loading = false }) {
    const currentStreak = rank?.currentStreak ?? 0;
    const longestStreak = rank?.longestStreak ?? 0;
    const progress = longestStreak > 0 ? Math.min(100, (currentStreak / longestStreak) * 100) : 0;

    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (progress / 100) * circumference;

    const remaining = Math.max(0, longestStreak - currentStreak);
    const milestoneCopy =
        currentStreak > 0 && remaining === 0
            ? "🎉 তুমি নিজের রেকর্ডে আছো!"
            : currentStreak > 0
              ? `আর ${formatBanglaNumber(remaining)} দিনে নতুন রেকর্ড`
              : "আজ পড়ে স্ট্রিক শুরু করো";

    return (
        <section className="panel relative isolate flex min-h-[168px] items-center overflow-hidden rounded-2xl border-orange-300/15 p-4 sm:p-5">
            {/* Warm glow layers */} 
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.14),transparent_55%)]" />
            <div className="pointer-events-none absolute -right-10 -top-16 -z-10 h-44 w-44 rounded-full bg-orange-500/15 blur-3xl streak-glow-anim" />
            <div className="pointer-events-none absolute -left-12 bottom-0 -z-10 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="flex w-full items-start justify-between gap-4">
                <div className="relative z-10 min-w-0 flex-1">
                    <div className="eyebrow flex items-center gap-2 text-sm text-orange-300/90 sm:text-base">
                        <Flame size={17} /> পড়ার ধারাবাহিকতা
                    </div>

                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="bangla-digits text-4xl font-black leading-none text-white sm:text-5xl">
                            {loading ? "—" : formatBanglaNumber(currentStreak)}
                        </span>
                        <span className="text-base text-white/65 sm:text-lg">দিনের স্ট্রিক</span>
                    </div>

                    <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/55 sm:text-sm">
                            <span>সেরা রেকর্ড</span>
                            <span className="bangla-digits font-semibold text-white/75">{loading ? "—" : `${formatBanglaNumber(longestStreak)} দিন`}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-[width] duration-700 ease-out"
                                style={{ width: `${Math.max(progress, currentStreak > 0 ? 4 : 0)}%` }}
                            />
                        </div>
                        <p className="bangla-digits text-xs text-white/55 sm:text-sm">{milestoneCopy}</p>
                    </div>

                    {error && <p className="mt-2 max-w-56 text-xs text-amber-200">স্ট্রিকের তথ্য পাওয়া যায়নি।</p>}

                </div>

                {/* Flame with progress ring */}
                <div className="relative z-10 shrink-0">
                    <div className="absolute inset-0 rounded-full bg-orange-500/25 blur-2xl streak-glow-anim" />
                    <div className="relative grid h-[88px] w-[88px] place-items-center sm:h-[104px] sm:w-[104px]">
                        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                            <defs>
                                <linearGradient id="dashStreakGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#fcd34d" />
                                    <stop offset="55%" stopColor="#fb923c" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                            <circle
                                cx="50" cy="50" r={radius} fill="none"
                                stroke="url(#dashStreakGrad)"
                                strokeWidth="4" strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                style={{ transition: "stroke-dashoffset 900ms ease" }}
                            />
                        </svg>
                        <span className="streak-flame-anim text-4xl sm:text-5xl" aria-hidden="true">🔥</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes dash-streak-flicker {
                    0%, 100% { transform: scale(1) rotate(-2deg); filter: brightness(1); }
                    25% { transform: scale(1.07) rotate(2deg); filter: brightness(1.15); }
                    50% { transform: scale(0.96) rotate(-1deg); filter: brightness(0.95); }
                    75% { transform: scale(1.04) rotate(1deg); filter: brightness(1.1); }
                }
                @keyframes dash-streak-glow {
                    0%, 100% { opacity: 0.45; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.12); }
                }
                .streak-flame-anim {
                    animation: dash-streak-flicker 2.6s ease-in-out infinite;
                    transform-origin: center bottom;
                }
                .streak-glow-anim { animation: dash-streak-glow 3.4s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) {
                    .streak-flame-anim, .streak-glow-anim { animation: none; }
                }
            `}</style>
        </section>
    );
}
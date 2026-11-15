"use client";

import { Activity, Target, Trophy } from "lucide-react";
import { useDashboardReports } from "@/features/dashboard/hooks/useDashboardReports";
import { useAuth } from "@/hooks/useAuth";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

export default function DashboardReport({ leaderboard = [], mine = null, comparisonLoading = false, comparisonError = false, retryComparison }) {
    const { user } = useAuth();
    const { totals, loading, error, retry } = useDashboardReports();

    const overallAccuracy = totals.total_attempts ? Math.round((totals.total_right_answer / totals.total_attempts) * 100) : 0;
    const reportUnavailable = error;
    const mineId = String(user?._id || "");
    const topContainsMine = mineId && leaderboard.some((entry) => String(entry.userId) === mineId);
    const comparisons = leaderboard.map((entry) => ({
        id: String(entry.userId),
        label: entry.username,
        score: Number(entry.battleScore) || 0,
        isMine: String(entry.userId) === mineId
    }));
    if (mine && !topContainsMine) {
        comparisons.push({
            id: mineId || "mine",
            label: "আপনি",
            score: Number(mine.battleScore) || 0,
            isMine: true
        });
    }
    const maxScore = Math.max(1, ...comparisons.map((entry) => entry.score));

    return <section className="dashboard-report-card panel flex min-h-0 flex-col overflow-hidden p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <div className="eyebrow flex items-center gap-2"><Activity size={14}/> তোমার রিপোর্ট</div>
                <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">তোমার অগ্রগতি</h2>
                <p className="mt-1 text-base text-white/65 sm:text-lg">শীর্ষ খেলোয়াড়দের সঙ্গে তোমার স্কোরের তুলনা</p>
            </div>
            <div className="dashboard-report-stat rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-right">
                <div className="bangla-digits text-2xl font-bold text-white">{loading || reportUnavailable ? "—" : `${formatBanglaNumber(overallAccuracy)}%`}</div>
                <div className="text-sm text-white/70">সঠিক উত্তরের হার · Accuracy</div>
            </div>
        </header>

        <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="dashboard-report-stat rounded-xl border border-white/[.08] bg-black/10 p-3">
                <div className="flex items-center gap-2 text-sm text-white/60"><Target size={16}/> মোট চেষ্টা</div>
                <div className="bangla-digits mt-1 text-xl font-semibold text-white sm:text-2xl">{loading || reportUnavailable ? "—" : formatBanglaNumber(totals.total_attempts)}</div>
            </div>
            <div className="dashboard-report-stat rounded-xl border border-white/[.08] bg-black/10 p-3">
                <div className="text-sm text-white/60">সম্পন্ন প্রশ্ন</div>
                <div className="bangla-digits mt-1 text-xl font-semibold text-white sm:text-2xl">{loading || reportUnavailable ? "—" : formatBanglaNumber(totals.completed_questions)}</div>
            </div>
        </div>
        {error && <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/15 bg-amber-200/[.04] px-3 py-2 text-sm text-amber-100/90">
            <span>রিপোর্ট আনতে একটু দেরি হচ্ছে—ততক্ষণে একটা Reels দেখে আসবে? 😄</span>
            <button type="button" onClick={retry} className="rounded-lg px-2 py-1 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">আবার চেষ্টা</button>
        </div>}

        <div className="mt-4 flex min-h-0 flex-1 flex-col">
            {comparisonLoading ? <div className="grid min-h-40 flex-1 place-items-center text-base text-white/65">স্কোর তুলনা লোড হচ্ছে…</div> : comparisons.length ? <>
                <div className="mb-3 flex items-center justify-between gap-3 text-base text-white/70 sm:text-lg">
                    <span className="flex items-center gap-2"><Trophy size={18}/> ব্যাটল স্কোর · Battle Score</span>
                    <span className="shrink-0">সর্বোচ্চ <span className="bangla-digits">{formatBanglaNumber(maxScore)}</span></span>
                </div>
                <div className="dashboard-chart flex min-h-[240px] flex-1 flex-col" role="img" aria-label="শীর্ষ তিন খেলোয়াড় ও তোমার ব্যাটল স্কোরের উল্লম্ব বার তুলনা">
                    <div className="relative min-h-0 flex-1 pl-11">
                        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-7 top-7 flex flex-col justify-between">
                            {[100, 50, 0].map((tick) => <div key={tick} className="flex items-center gap-2">
                                <span className="bangla-digits w-10 text-right text-sm tabular-nums text-white/75 sm:text-base">{tick === 0 ? "০" : tick === 50 ? "৫০%" : "১০০%"}</span>
                                <span className="h-px flex-1 border-t border-dashed border-white/10"/>
                            </div>)}
                        </div>
                        <div className="relative grid h-full items-stretch gap-2 pl-1 pr-1 sm:gap-4" style={{ gridTemplateColumns: `repeat(${comparisons.length}, minmax(0, 1fr))` }}>
                            {comparisons.map((entry, index) => {
                                const height = Math.max(4, (entry.score / maxScore) * 100);
                                return <div key={entry.id} className="dashboard-chart-column flex min-w-0 flex-col items-center" style={{ animationDelay: `${index * 100}ms` }}>
                                    <div className="relative mt-7 w-full flex-1">
                                        <span
                                            className={`absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-base font-semibold tabular-nums drop-shadow sm:text-lg ${entry.isMine ? "text-emerald-50" : "text-white"}`}
                                            style={{ bottom: `${height}%` }}
                                        ><span className="bangla-digits">{formatBanglaNumber(entry.score)}</span></span>
                                        <div className="absolute inset-x-1 bottom-0 top-0 flex items-end justify-center">
                                            <div
                                                className={` dashboard-chart-bar w-full max-w-12 rounded-t-lg ${entry.isMine ? "dashboard-chart-bar-mine bg-gradient-to-t from-[#2563eb] to-[#22c55e]" : "dashboard-chart-bar-leader bg-gradient-to-t from-amber-600 to-amber-300"}`}
                                                style={{ height: `${height}%`, animationDelay: `${index * 120}ms` }}
                                            />
                                        </div>
                                    </div>
                                    <span className={`mt-2 max-w-full truncate text-center text-sm sm:text-base ${entry.isMine ? "font-semibold text-blue-100" : "text-white/90"}`} title={entry.isMine ? "আপনি" : entry.label}>
                                        {entry.isMine ? "আপনি" : entry.label}
                                    </span>
                                </div>;
                            })}
                        </div>
                    </div>
                </div>
                {comparisonError && <p role="status" className="mt-2 flex flex-wrap items-center gap-2 text-sm text-amber-100/90"><span>স্কোর তুলনা আসেনি।</span><button type="button" onClick={retryComparison} className="underline underline-offset-4">আবার চেষ্টা</button></p>}
            </> : <div className="grid min-h-40 flex-1 place-items-center text-base text-white/75"><div className="text-center">{comparisonError ? <><p>স্কোর তুলনা লোড করা যায়নি।</p><button type="button" onClick={retryComparison} className="mt-2 text-sm font-medium text-blue-200 underline underline-offset-4">আবার চেষ্টা</button></> : "তুলনার জন্য এখনো কোনো স্কোর পাওয়া যায়নি।"}</div></div>}
        </div>
    </section>;
}

import Link from "next/link";
import { Crown, Trophy, UserRound } from "lucide-react";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

function Avatar({ entry }) {
    return <div className="dashboard-leaderboard-avatar grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[.06] text-xs font-semibold text-white/85 transition-transform duration-200 sm:h-10 sm:w-10 sm:text-sm">
        {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover"/> : entry.username?.slice(0, 1)?.toUpperCase() || <UserRound size={15}/>}
    </div>;
}

export default function DashboardLeaderboard({ entries = [], loading = false, error = false, onRetry }) {
    return <section className="dashboard-leaderboard panel flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.06] text-blue-300"><Trophy size={20}/></div>
                <div><div className="eyebrow text-sm">গ্লোবাল র‍্যাঙ্কিং</div><h2 className="mt-0.5 text-xl font-bold text-white sm:text-2xl">সেরা খেলোয়াড়</h2></div>
            </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? <div className="grid min-h-40 place-items-center text-sm text-paper/55">লিডারবোর্ড লোড হচ্ছে…</div> : entries.length ? entries.map((entry, index) => (
                <Link
                    key={entry.userId}
                    href={`/profile/${encodeURIComponent(entry.userId)}`}
                    className="dashboard-leaderboard-row group flex items-center gap-2.5 border-b border-white/[.07] px-3 py-2.5 transition-[background-color,transform] duration-200 hover:translate-x-1 hover:bg-white/[.04] sm:gap-3 sm:px-5 sm:py-3.5"
                    style={{ animationDelay: `${index * 70}ms` }}
                    aria-label={`${entry.username}-এর প্রোফাইল দেখুন`}
                >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold sm:h-9 sm:w-9 sm:rounded-xl sm:text-sm ${index === 0 ? "bg-amber-400/10 text-amber-300" : "bg-white/[.04] text-paper/45"}`}>
                        {index === 0 ? <Crown size={16}/> : <span className="bangla-digits">#{formatBanglaNumber(entry.position)}</span>}
                    </span>
                    <Avatar entry={entry}/>
                    <span className={`min-w-0 flex-1 truncate text-sm font-medium transition-colors group-hover:text-white sm:text-base ${index === 0 ? "text-white" : "text-paper/85"}`}>
                        {entry.username}
                        {index === 0 && <span className="ml-1.5 inline-block rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-300 align-middle sm:ml-2">চ্যাম্পিয়ন</span>}
                    </span>
                    <span className="whitespace-nowrap text-right font-semibold text-white/85">
                        <span className="bangla-digits text-sm sm:text-base">{formatBanglaNumber(entry.battleScore)}</span> <span className="text-[10px] font-bold tracking-widest text-paper/50 sm:text-[11px]">পয়েন্ট</span>
                    </span>
                </Link>
            )) : <div className="grid min-h-40 flex-1 place-items-center px-6 py-10 text-center">
                <div><Trophy size={32} className="mx-auto mb-3 text-paper/35"/><p className="text-sm font-medium text-paper/65">{error ? "লিডারবোর্ডের তথ্য পাওয়া যাচ্ছে না।" : "এই মুহূর্তে লিডারবোর্ডের তথ্য পাওয়া যাচ্ছে না।"}</p>{error && <button type="button" onClick={onRetry} className="mt-3 text-sm text-blue-200 underline">আবার চেষ্টা</button>}</div>
            </div>}
        </div>
    </section>;
}
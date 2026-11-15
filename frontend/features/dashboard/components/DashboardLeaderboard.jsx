import Link from "next/link";
import { Crown, Trophy, UserRound } from "lucide-react";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

function Avatar({ entry }) {
    return <div className="dashboard-leaderboard-avatar grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[.06] text-sm font-semibold text-white/85 transition-transform duration-200">
        {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover"/> : entry.username?.slice(0, 1)?.toUpperCase() || <UserRound size={17}/>}
    </div>;
}

export default function DashboardLeaderboard({ entries = [], loading = false, error = false, onRetry }) {
    return <section className="dashboard-leaderboard panel flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.06] text-blue-300"><Trophy size={20}/></div>
                <div><div className="eyebrow text-sm">গ্লোবাল র‍্যাঙ্কিং</div><h2 className="mt-0.5 text-2xl font-bold text-white">সেরা খেলোয়াড়</h2></div>
            </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? <div className="grid min-h-40 place-items-center text-sm text-paper/55">লিডারবোর্ড লোড হচ্ছে…</div> : entries.length ? entries.map((entry, index) => (
                <Link
                    key={entry.userId}
                    href={`/profile/${encodeURIComponent(entry.userId)}`}
                    className="dashboard-leaderboard-row group flex items-center gap-3 border-b border-white/[.07] px-5 py-3.5 transition-[background-color,transform] duration-200 hover:translate-x-1 hover:bg-white/[.04]"
                    style={{ animationDelay: `${index * 70}ms` }}
                    aria-label={`${entry.username}-এর প্রোফাইল দেখুন`}
                >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${index === 0 ? "bg-amber-400/10 text-amber-300" : "bg-white/[.04] text-paper/45"}`}>
                        {index === 0 ? <Crown size={18}/> : <span className="bangla-digits">#{formatBanglaNumber(entry.position)}</span>}
                    </span>
                    <Avatar entry={entry}/>
                    <span className={`min-w-0 flex-1 truncate text-base font-medium transition-colors group-hover:text-white ${index === 0 ? "text-white" : "text-paper/85"}`}>
                        {entry.username}
                        {index === 0 && <span className="ml-2 text-[11px] font-bold tracking-widest text-amber-300">চ্যাম্পিয়ন</span>}
                    </span>
                    <span className="whitespace-nowrap text-right font-semibold text-white/85">
                        <span className="bangla-digits text-base">{formatBanglaNumber(entry.battleScore)}</span> <span className="text-[11px] font-bold tracking-widest text-paper/50">পয়েন্ট</span>
                    </span>
                </Link>
            )) : <div className="grid min-h-40 flex-1 place-items-center px-6 py-10 text-center">
                <div><Trophy size={32} className="mx-auto mb-3 text-paper/35"/><p className="text-sm font-medium text-paper/65">{error ? "লিডারবোর্ডের তথ্য পাওয়া যাচ্ছে না।" : "এই মুহূর্তে লিডারবোর্ডের তথ্য পাওয়া যাচ্ছে না।"}</p>{error && <button type="button" onClick={onRetry} className="mt-3 text-sm text-blue-200 underline">আবার চেষ্টা</button>}</div>
            </div>}
        </div>
    </section>;
}

import UserAvatar from "@/features/social/components/UserAvatar";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

const resultStyles = {
    win: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    loss: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    draw: "border-white/10 bg-white/5 text-zinc-400"
};
const resultLabels = { win: "জয়", loss: "হার", draw: "ড্র" };

function relativeDate(value) {
    if (!value) return "তারিখ অজানা";
    const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return "এইমাত্র";
    if (minutes < 60) return `${formatBanglaNumber(minutes)} মিনিট আগে`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${formatBanglaNumber(hours)} ঘণ্টা আগে`;
    const days = Math.floor(hours / 24);
    return `${formatBanglaNumber(days)} দিন আগে`;
}

export default function RecentBattleRow({ battle }) {
    const result = resultLabels[battle?.result] ? battle.result : "draw";
    return <div className="flex items-center gap-3 border-b border-white/[.06] py-3 last:border-0">
        <UserAvatar user={battle?.opponent} size="sm"/>
        <div className="min-w-0 flex-1"><div className="truncate text-sm text-zinc-200">{battle?.opponent?.username || "শিক্ষার্থী"}</div><div className="mt-1 text-xs text-zinc-500">{relativeDate(battle?.endedAt)}</div></div>
        <div className="text-right"><span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${resultStyles[result]}`}>{resultLabels[result]}</span><div className="bangla-digits mt-1 text-xs text-zinc-400">{formatBanglaNumber(battle?.myScore || 0)}–{formatBanglaNumber(battle?.opponentScore || 0)}</div></div>
    </div>;
}

import { Check, X } from "lucide-react";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

export default function BattlePlayerCard({ player, score, answered, answerCorrect, disconnected, me }) {
    const resultStyle = typeof answerCorrect === "boolean"
        ? answerCorrect ? "border-emerald-400/50 bg-emerald-400/10" : "border-red-400/50 bg-red-400/10"
        : me ? "border-brass-400/35 bg-brass-400/10" : "border-white/10 bg-white/[.03]";
    return <div className={`min-w-0 rounded-2xl border p-3 transition-colors duration-300 sm:p-4 ${resultStyle}`}>
        <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 sm:text-left">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-bold text-paper sm:h-11 sm:w-11 sm:text-lg">
                {(player?.username || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
                <div className="max-w-full truncate text-xs font-semibold sm:text-sm">{me ? "আপনি" : player?.username || "প্রতিপক্ষ"}</div>
            </div>
            <div className="text-center sm:text-right"><div className="bangla-digits text-xl font-bold text-paper sm:text-2xl">{formatBanglaNumber(score ?? 0)}</div><div className="text-[9px] tracking-widest text-paper/35">পয়েন্ট</div></div>
        </div>
        {disconnected && <div className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-200">পুনরায় সংযোগ হচ্ছে…</div>}
        {answered && typeof answerCorrect === "boolean" && <div className={`mt-2 flex items-center gap-1.5 text-xs ${answerCorrect ? "text-emerald-300" : "text-red-300"}`}>{answerCorrect ? <Check size={13}/> : <X size={13}/>} {answerCorrect ? "সঠিক" : "ভুল"}</div>}
    </div>;
}

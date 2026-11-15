import SubjectArtwork from "@/features/academy/components/SubjectArtwork";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

const barColors = {
    PHY: "bg-sky-400", CHM: "bg-emerald-400", BLG: "bg-lime-400", MAT: "bg-violet-400",
    AS: "bg-green-400", ACC: "bg-amber-400", BOM: "bg-orange-400", PMM: "bg-rose-400",
    ECN: "bg-cyan-400", CGG: "bg-indigo-400", GEO: "bg-teal-400", HST: "bg-amber-400",
    IHC: "bg-orange-400", ISL: "bg-emerald-400", LGC: "bg-fuchsia-400", PSY: "bg-pink-400",
    SOC: "bg-sky-400", SW: "bg-blue-400", HS: "bg-rose-400", BNG: "bg-rose-400", ICT: "bg-rose-400"
};

export default function SubjectStrengthBar({ item }) {
    const accuracy = Math.max(0, Math.min(100, Number(item?.accuracy) || 0));
    const code = String(item?.code || "").toUpperCase();
    return <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[.03]"><SubjectArtwork code={code} variant="academy"/></div>
        <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2 text-sm"><span className="truncate text-zinc-200">{item?.name || code || "বিষয়"}</span><span className="bangla-digits shrink-0 text-xs text-zinc-400">{formatBanglaNumber(Math.round(accuracy))}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all ${barColors[code] || "bg-cyan-400"}`} style={{ width: `${accuracy}%` }}/></div></div>
    </div>;
}

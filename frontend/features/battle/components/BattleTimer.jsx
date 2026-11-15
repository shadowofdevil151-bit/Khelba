import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

export default function BattleTimer({ seconds, total }) {
    const safe = Math.max(0, Math.ceil(seconds));
    const progress = Math.max(0, Math.min(100, (seconds / total) * 100));
    const urgent = safe <= 10;
    return <div className={`relative grid h-11 w-11 place-items-center rounded-full ${urgent ? "text-red-300" : "text-sky-300"}`} style={{ background: `conic-gradient(currentColor ${progress}%, rgba(255,255,255,.08) ${progress}% 100%)` }}>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[#14161b]"><span className="bangla-digits text-sm font-bold">{formatBanglaNumber(safe)}</span></div>
    </div>;
}

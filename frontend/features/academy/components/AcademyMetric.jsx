export default function AcademyMetric({ icon: Icon, label, value, detail, visual, accent }) {
    return <div className={`academy-metric academy-metric-${accent} h-full min-h-36 rounded-2xl border border-white/10 bg-[#111318] p-5 transition-colors hover:border-white/25`}>
        <div className="flex h-full items-center justify-between gap-4">
            <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-zinc-400"><Icon className="shrink-0 text-zinc-500" size={16}/><span>{label}</span></div>
                <div className="bangla-digits mt-3 text-3xl font-semibold leading-none text-white">{value}</div>
                <div className="bangla-digits mt-2 text-xs text-zinc-500">{detail}</div>
            </div>
            <div className="shrink-0">{visual}</div>
        </div>
    </div>;
}

export default function AcademyMetric({ icon: Icon, label, value, detail, visual, mobileVisual, accent }) {
    return <div className={`academy-metric academy-metric-${accent} h-full min-h-0 rounded-xl border border-white/10 bg-[#111318] p-3 transition-colors hover:border-white/25 sm:min-h-36 sm:rounded-2xl sm:p-5`}>
        <div className="flex h-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] leading-tight text-zinc-400 sm:gap-2 sm:text-sm"><Icon className="shrink-0 text-zinc-500" size={16}/><span>{label}</span></div>
                <div className="bangla-digits mt-1.5 text-lg font-semibold leading-none text-white sm:mt-3 sm:text-3xl">{value}</div>
                <div className="bangla-digits mt-1 hidden text-[10px] leading-tight text-zinc-500 sm:mt-2 sm:block sm:text-xs">{detail}</div>
            </div>
            <div className="hidden shrink-0 sm:block">{visual}</div>
            {mobileVisual && <div className="mt-auto w-full sm:hidden">{mobileVisual}</div>}
        </div>
    </div>;
}
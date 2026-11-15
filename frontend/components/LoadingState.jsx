"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function LoadingState({
    title = "একটু অপেক্ষা করুন",
    detail = "আপনার জন্য প্রস্তুত করছি…",
    compact = false,
    className = ""
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setVisible(true), 300);
        return () => window.clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return <div role="status" aria-live="polite" className={`relative isolate overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-br from-[#14161b] via-[#151a24] to-[#1b1530] ${compact ? "p-6" : "p-10"} text-center shadow-[0_20px_70px_rgba(8,145,178,0.12)] ${className}`}>
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl"/>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl"/>
        <div className={`relative mx-auto grid place-items-center rounded-2xl border border-sky-300/25 bg-gradient-to-br from-sky-400/20 to-violet-500/20 text-sky-200 shadow-[0_0_35px_rgba(56,189,248,0.16)] ${compact ? "mb-4 h-12 w-12" : "mb-5 h-16 w-16"}`}>
            <span className="absolute inset-1 rounded-xl border border-sky-200/20 animate-ping motion-reduce:animate-none"/>
            <Sparkles size={compact ? 20 : 25} className="animate-pulse motion-reduce:animate-none"/>
        </div>
        <h2 className={`relative font-bold text-white ${compact ? "text-base" : "text-lg"}`}>{title}</h2>
        <p className="relative mt-2 text-sm text-sky-100/60">{detail}</p>
        <div aria-hidden="true" className="relative mx-auto mt-5 flex w-fit items-center gap-2">
            {[0, 1, 2].map((dot) => <span key={dot} className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 animate-bounce motion-reduce:animate-none" style={{ animationDelay: `${dot * 140}ms` }}/>)}
        </div>
        <span className="sr-only">লোড হচ্ছে</span>
    </div>;
}

"use client";

import { Loader2, Search, X } from "lucide-react";

export default function SocialSearch({ query, onChange, loading }) {
    return <div className="relative border-b border-white/10 p-4">
        <div className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-[#191c23] px-3 py-2.5 transition-colors focus-within:border-sky-400/50 focus-within:ring-2 focus-within:ring-sky-400/15">
            <Search className="shrink-0 text-zinc-500" size={14}/>
            <input
                data-social-search
                className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                placeholder="ইউজারনেম দিয়ে খুঁজুন…"
                value={query}
                onChange={(event) => onChange(event.target.value)}
            />
            <div className="flex shrink-0 items-center gap-2">
                {loading && <Loader2 className="animate-spin text-cyan-300" size={14}/>}
                {!loading && query.trim() && <button type="button" onClick={() => onChange("")} className="text-zinc-500 hover:text-white" aria-label="সার্চ মুছুন"><X size={14}/></button>}
            </div>
        </div>
    </div>;
}

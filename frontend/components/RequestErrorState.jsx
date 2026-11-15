"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function RequestErrorState({
    title = "এখনই তথ্যগুলো আনা যাচ্ছে না",
    detail = "ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন। আপনার কাজ সংরক্ষিত আছে।",
    onRetry,
    retryLabel = "আবার চেষ্টা করুন",
    className = ""
}) {
    return <section role="alert" className={`relative isolate overflow-hidden rounded-2xl border border-rose-400/20 bg-gradient-to-br from-[#17161c] via-[#1a1720] to-[#211623] p-8 text-center shadow-[0_20px_70px_rgba(244,63,94,0.08)] sm:p-10 ${className}`}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-rose-400/[.08] blur-3xl"/>
        <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-rose-300/20 bg-rose-400/10 text-rose-200">
            <AlertCircle size={25}/>
        </div>
        <h2 className="relative mt-4 text-lg font-bold text-white">{title}</h2>
        <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-rose-100/60">{detail}</p>
        <button type="button" onClick={onRetry} className="relative mt-6 inline-flex items-center gap-2 rounded-xl border border-rose-200/20 bg-rose-200/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-200/[.16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200">
            <RefreshCw size={15}/> {retryLabel}
        </button>
    </section>;
}

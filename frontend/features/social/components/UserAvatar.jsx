"use client";

import { gradientFor, initialFor } from "@/features/social/utils/avatar";

const SIZE = {
    xs: "h-8 w-8 text-xs",
    sm: "h-9 w-9 text-sm",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-2xl"
};

export default function UserAvatar({ user, size = "md", showStatus = false, online = false, className = "" }) {
    const url = user?.avatar?.url;
    const gradient = gradientFor(user?._id || user?.username);
    const classes = SIZE[size] || SIZE.md;
    return <div className={`relative shrink-0 ${className}`}>
        <div className={`grid ${classes} place-items-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br ${gradient} font-semibold text-white`}>
            {url ? <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async"/> : initialFor(user?.username || "শিক্ষার্থী")}
        </div>
        {showStatus && <span aria-hidden="true" className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#14161b] ${online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.7)]" : "bg-zinc-500"}`}/>}
    </div>;
}

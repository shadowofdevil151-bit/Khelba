"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Shield, Sparkles, Swords } from "lucide-react";

const actions = [
    {
        href: "/academy",
        title: "একাডেমি",
        description: "শিখুন, অনুশীলন করুন, নিজের দক্ষতা গড়ুন",
        icon: BookOpen,
        marker: Sparkles,
        eyebrow: "শেখার অভিযান",
        color: "from-[#183d72] via-[#245db4] to-[#3b82f6]",
        glow: "hover:shadow-[0_12px_42px_rgba(59,130,246,.38)]"
    },
    {
        href: "/battle",
        title: "ব্যাটল",
        description: "বিচি থাকলে মাঠে আয়!",
        icon: Swords,
        marker: Shield,
        eyebrow: "যুদ্ধের ময়দান",
        color: "from-[#702d16] via-[#c24c16] to-[#f97316]",
        glow: "hover:shadow-[0_12px_42px_rgba(249,115,22,.38)]"
    },
    {
        href: "/notes",
        title: "নোটস",
        description: "অধ্যায়ভিত্তিক নোট পড়ুন",
        icon: FileText,
        marker: Sparkles,
        eyebrow: "পড়ার সঙ্গী",
        color: "from-[#30215e] via-[#5b3bb0] to-[#8b5cf6]",
        glow: "hover:shadow-[0_12px_42px_rgba(139,92,246,.32)]"
    }
];

export default function DashboardActions() {
    return <section aria-label="শুরু করুন" className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {actions.map(({ href, title, description, icon: Icon, marker: Marker, eyebrow, color, glow }, index) => (
            <Link
                key={href}
                href={href}
                className={`dashboard-action-card group relative flex min-h-[88px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br ${color} p-3 text-center text-white shadow-md transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-white/35 active:scale-[0.99] sm:min-h-[104px] sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:bg-gradient-to-r sm:text-left ${glow} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}
                style={{ animationDelay: `${index * 100}ms` }}
            >
                <span aria-hidden="true" className="pointer-events-none absolute -right-7 top-1/2 hidden h-28 w-28 -translate-y-1/2 rounded-full border border-white/15 transition-transform duration-500 group-hover:scale-110 sm:block">
                    <span className="absolute inset-3 rounded-full border border-white/10"/>
                    <span className="absolute inset-7 rounded-full border border-white/[.08]"/>
                    <span className="absolute right-5 top-5 h-2 w-2 rounded-full bg-white/70 shadow-[0_0_18px_rgba(255,255,255,.65)]"/>
                </span>
                <Icon
                    aria-hidden="true"
                    className={`pointer-events-none absolute right-5 top-1/2 hidden h-16 w-16 -translate-y-1/2 text-white/[.13] transition-[opacity,transform] duration-500 group-hover:scale-110 group-hover:text-white/20 sm:block ${index % 2 === 0 ? "-rotate-12" : "rotate-12"}`}
                    strokeWidth={1}
                />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-4 right-24 hidden h-1.5 w-1.5 rounded-full bg-white/65 shadow-[0_0_12px_rgba(255,255,255,.8)] sm:block"/>
                <span aria-hidden="true" className="pointer-events-none absolute right-16 top-4 hidden h-1 w-1 rounded-full bg-white/55 sm:block"/>
                <span className="pointer-events-none absolute -right-2 -top-8 h-24 w-24 rounded-full bg-white/15 blur-3xl transition-opacity duration-300 group-hover:opacity-100"/>
                <span className="pointer-events-none absolute bottom-0 right-16 hidden h-px w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-60 sm:block"/>
                <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/15 shadow-inner transition-transform duration-300 group-hover:scale-110 sm:bg-black/20 ${index % 2 === 0 ? "group-hover:rotate-[-5deg]" : "group-hover:rotate-[5deg]"}`}>
                    <Icon size={19}/>
                    <Marker className="absolute -right-1.5 -top-1.5 rounded-full border border-white/25 bg-black/25 p-0.5 text-white/90" size={15}/>
                </span>
                <div className="relative min-w-0 sm:flex-1">
                    <span className="mb-0.5 hidden truncate text-[9px] font-bold uppercase tracking-[.12em] text-white/75 sm:block">{eyebrow}</span>
                    <h2 className="text-sm font-bold leading-tight sm:text-lg">{title}</h2>
                    <p className="mt-1 hidden truncate text-[11px] leading-relaxed text-white/85 sm:block">{description}</p>
                </div>
                <ArrowRight className="relative hidden shrink-0 transition-transform duration-300 group-hover:translate-x-1 sm:block" size={16}/>
            </Link>
        ))}
    </section>;
}
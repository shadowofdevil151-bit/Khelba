"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bell, BookOpen, ChevronLeft, ChevronRight, LayoutDashboard,
    NotebookPen, Swords, UserRound, Users
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

const items = [
    ["/dashboard", "ড্যাশবোর্ড", LayoutDashboard],
    ["/academy", "একাডেমি", BookOpen],
    ["/battle", "ব্যাটল", Swords],
    ["/notes", "নোটস", NotebookPen],
    ["/social", "Social", Users]
];

export default function Sidebar({ expanded, onExpandedChange }) {
    const path = usePathname();
    const { user } = useAuth();
    const { unseenCount } = useNotifications();

    return <>
        {expanded && <button className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] md:hidden" onClick={() => onExpandedChange(false)} aria-label="নেভিগেশন বন্ধ করুন"/>}
        <aside className={`fixed bottom-6 left-6 top-6 z-40 flex flex-col rounded-[0.5rem] border border-slate-500/25 bg-[#2f2f2f]/95 px-2.5 py-3  backdrop-blur-xl transition-[width] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] ${expanded ? "w-[17rem]" : "w-[85px]"}`}>
            <div className={`relative mb-7 flex h-10 shrink-0 items-center ${expanded ? "px-1" : "justify-center"}`}>
                <Link href="/dashboard" aria-label="খেলবা ড্যাশবোর্ড" className="flex min-w-0 items-center gap-2.5 overflow-hidden">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brass-200 to-brass-400 font-serif text-xl font-bold text-ink-950">K</span>
                    <span className={`overflow-hidden whitespace-nowrap transition-[width,opacity,transform] duration-[350ms] ease-out ${expanded ? "w-32 translate-x-0 opacity-100 delay-75" : "w-0 -translate-x-1 opacity-0"}`}>
                        <span className="block font-serif text-lg leading-5 text-paper">Khelba</span>
                        <span className="mt-0.5 block text-[8px] tracking-[.1em] text-paper/40">শিখুন · খেলুন · এগিয়ে যান</span>
                    </span>
                </Link>
                <button
                    type="button"
                    onClick={() => onExpandedChange(!expanded)}
                    aria-label={expanded ? "সাইডবার ছোট করুন" : "সাইডবার বড় করুন"}
                    aria-expanded={expanded}
                    className="group absolute -right-4 top-1/2 grid h-12 w-8 -translate-y-1/2 place-items-center rounded-r-xl rounded-l-md border border-l-0 border-slate-400/30 bg-[#30343b] text-paper/65 shadow-[4px_0_16px_rgba(0,0,0,.24)] transition-[background-color,color,width,box-shadow] duration-200 hover:w-9 hover:bg-[#3a414b] hover:text-white hover:shadow-[4px_0_20px_rgba(129,140,248,.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-200"
                >
                    {expanded ? <ChevronLeft size={15}/> : <ChevronRight size={15}/>}
                </button>
            </div>

            <nav aria-label="প্রধান নেভিগেশন" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
                {items.map(([href, label, Icon]) => {
                    const active = path === href || (href !== "/dashboard" && path.startsWith(`${href}/`));
                    const notifications = href === "/social" && unseenCount > 0;
                    return <Link
                        key={href}
                        href={href}
                        title={expanded ? undefined : label}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex h-14 shrink-0 items-center gap-3 overflow-hidden rounded-xl px-2.5 transition-[background-color,color] duration-200 ${active ? "bg-slate-700/80 text-indigo-100 shadow-inner shadow-white/[.04]" : "text-white hover:bg-white/[.055] hover:text-paper"}`}
                    >
                        <span className="relative shrink-0"><Icon className={`transition-transform duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] ${expanded ? "translate-x-0" : "translate-x-[7px]"}`} size={18} strokeWidth={3}/>{notifications && <span aria-label="নতুন বিজ্ঞপ্তি" className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-[#2f2f2f]"/>}</span>
                        <span className={`overflow-hidden whitespace-nowrap text-[18px] transition-[width,opacity,transform] duration-[350ms] ease-out ${expanded ? "w-36 translate-x-0 opacity-100 delay-75" : "pointer-events-none w-0 -translate-x-1 opacity-0"}`}>{label}</span>
                    </Link>;
                })}
                <Link
                    href="/social?tab=notifications"
                    title={expanded ? undefined : "বিজ্ঞপ্তি"}
                    aria-label="বিজ্ঞপ্তি দেখুন"
                    className={`relative flex h-14 shrink-0 items-center gap-3 overflow-hidden rounded-xl px-2.5 transition-[background-color,color] duration-200 ${path === "/social" ? "text-indigo-100" : "text-white hover:bg-white/[.055] hover:text-paper"}`}
                >
                    <span className="relative shrink-0"><Bell className={expanded ? "translate-x-0" : "translate-x-[7px]"} size={18} strokeWidth={3}/>{unseenCount > 0 && <span aria-label="নতুন বিজ্ঞপ্তি" className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-[#2f2f2f]"/>}</span>
                    <span className={`overflow-hidden whitespace-nowrap text-[18px] transition-[width,opacity,transform] duration-[350ms] ease-out ${expanded ? "w-36 translate-x-0 opacity-100 delay-75" : "pointer-events-none w-0 -translate-x-1 opacity-0"}`}>বিজ্ঞপ্তি</span>
                </Link>
            </nav>

            <div className="mt-3 shrink-0 border-t border-slate-500/20 pt-3">
                <Link
                    href="/profile"
                    title={expanded ? undefined : "প্রোফাইল"}
                    aria-label="প্রোফাইল দেখুন"
                    aria-current={path === "/profile" ? "page" : undefined}
                    className={`flex h-12 items-center overflow-hidden rounded-xl px-1.5 transition-colors hover:bg-white/[.06] ${expanded ? "gap-2.5" : "justify-center"}`}
                >
                    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-indigo-200/20 bg-indigo-300/10 text-xs font-semibold text-indigo-100">
                        {user?.avatar?.url ? <img src={user.avatar.url} alt="" className="h-full w-full object-cover"/> : user?.username?.slice(0, 1)?.toUpperCase() || <UserRound size={15}/>}
                    </div>
                    <div className={`min-w-0 overflow-hidden whitespace-nowrap transition-[width,opacity,transform] duration-[350ms] ease-out ${expanded ? "w-36 translate-x-0 opacity-100 delay-75" : "w-0 -translate-x-1 opacity-0"}`}>
                        <div className="truncate text-xs font-medium text-paper/85">{user?.username || "শিক্ষার্থী"}</div>
                        <div className="truncate text-[10px] text-paper/45">প্রোফাইল দেখুন</div>
                    </div>
                </Link>
            </div>
        </aside>
    </>;
}

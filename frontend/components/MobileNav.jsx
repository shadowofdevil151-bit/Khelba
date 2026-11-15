"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bell, BookOpen, LayoutDashboard, NotebookPen, Swords, UserRound, Users
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

const tabs = [
    ["/dashboard", "ড্যাশবোর্ড", LayoutDashboard],
    ["/academy", "একাডেমি", BookOpen],
    ["/battle", "ব্যাটল", Swords],
    ["/notes", "নোটস", NotebookPen],
    ["/social", "Social", Users]
];

// Route-aware hide: deep-focus MCQ practice lives at /academy/[subject]/[chapter]
// and any deeper paths (e.g. .../all, .../wrong). Hides bottom tab bar so
// students don't tap away mid-timer. Live battle hiding will be wired from the
// BattlePage itself once a match-active context is available (out of scope here).
function useHideOnFocusRoute() {
    const path = usePathname() || "";
    const segments = path.split("/").filter(Boolean);
    return segments[0] === "academy" && segments.length >= 3;
}

export default function MobileNav() {
    const path = usePathname() || "";
    const { user } = useAuth();
    const { unseenCount } = useNotifications();
    const hideNav = useHideOnFocusRoute();

    const isActive = (href) =>
        path === href || (href !== "/dashboard" && path.startsWith(`${href}/`));

    return <>
        {/* Slim mobile top bar — brand + utilities, sticky to viewport top */}
        <header className="mobile-top-bar sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-[#202020]/85 backdrop-blur-xl md:hidden">
            <Link href="/dashboard" aria-label="খেলবা ড্যাশবোর্ড" className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brass-200 to-brass-400 font-serif text-lg font-bold text-ink-950">K</span>
                <span className="font-serif text-lg tracking-tight text-paper">Khelba</span>
            </Link>
            <div className="flex items-center gap-2">
                <Link
                    href="/social?tab=notifications"
                    aria-label="বিজ্ঞপ্তি"
                    className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-paper/70 transition-colors hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                >
                    <Bell size={18} strokeWidth={2}/>
                    {unseenCount > 0 && <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-[#202020] animate-pulse motion-reduce:animate-none"/>}
                </Link>
                <Link
                    href="/profile"
                    aria-label="প্রোফাইল"
                    className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-indigo-200/25 bg-indigo-300/10 text-xs font-semibold text-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                >
                    {user?.avatar?.url
                        ? <img src={user.avatar.url} alt="" className="h-full w-full object-cover"/>
                        : (user?.username?.slice(0, 1)?.toUpperCase() || <UserRound size={15}/>)}
                </Link>
            </div>
        </header>

        {/* Chorcha-style bottom tab bar — hidden during deep-focus practice */}
        {!hideNav && <nav
            aria-label="মোবাইল নেভিগেশন"
            className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-500/20 bg-[#242424]/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-2xl md:hidden"
        >
            <ul className="grid grid-cols-5">
                {tabs.map(([href, label, Icon]) => {
                    const active = isActive(href);
                    const isBattleTab = href === "/battle";
                    const notifications = href === "/social" && unseenCount > 0;
                    return <li key={href} className="flex justify-center">
                        <Link
                            href={href}
                            aria-current={active ? "page" : undefined}
                            aria-label={label}
                            className="flex h-16 w-full select-none flex-col items-center justify-center gap-1 transition-transform duration-150 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                        >
                            {isBattleTab ? (
                                <span className={`relative grid h-11 w-11 -mt-3 place-items-center rounded-2xl border border-indigo-300/30 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_6px_20px_rgba(99,102,241,0.4)] ${active ? "ring-2 ring-indigo-300/50" : ""}`}>
                                    <Icon size={20} strokeWidth={2.5}/>
                                </span>
                            ) : (
                                <span className={`relative grid place-items-center rounded-full ${active
                                    ? "border border-indigo-400/30 bg-indigo-500/20 px-3.5 py-1 text-indigo-200 shadow-[0_0_16px_rgba(99,102,241,0.22)]"
                                    : "text-paper/50"}`}>
                                    <Icon size={20} strokeWidth={active ? 2.5 : 2}/>
                                    {notifications && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-[#242424]"/>}
                                </span>
                            )}
                            <span className={`text-[11px] ${isBattleTab ? "mt-0.5" : ""} ${active ? "font-semibold text-indigo-100" : "font-medium text-paper/50"}`}>{label}</span>
                        </Link>
                    </li>;
                })}
            </ul>
        </nav>}
    </>;
}
"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Protected from "./Protected";
import { NotificationProvider } from "@/contexts/NotificationProvider";

export default function AppShell({ children }) {
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    // Force collapse of the desktop sidebar below lg so tablet always stays in
    // the icon-rail state. Desktop (>=1024px) is unaffected and can toggle freely.
    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const mq = window.matchMedia("(min-width: 1024px)");
        const sync = () => { if (!mq.matches) setSidebarExpanded(false); };
        sync();
        if (mq.addEventListener) mq.addEventListener("change", sync);
        else mq.addListener(sync);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener("change", sync);
            else mq.removeListener(sync);
        };
    }, []);

    return <Protected>
        <NotificationProvider>
            <MobileNav />
            <Sidebar expanded={sidebarExpanded} onExpandedChange={setSidebarExpanded}/>
            <main className={`app-main min-h-screen transition-[padding] duration-300 ${sidebarExpanded ? "md:pl-[320px]" : "md:pl-[135px]"}`}>
                <div className="mx-auto px-4 py-6 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </NotificationProvider>
    </Protected>;
}
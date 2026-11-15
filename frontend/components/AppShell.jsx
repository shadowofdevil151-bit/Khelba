"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Protected from "./Protected";
import { NotificationProvider } from "@/contexts/NotificationProvider";
export default function AppShell({ children }) {
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    return <Protected>
        <NotificationProvider>
            <Sidebar expanded={sidebarExpanded} onExpandedChange={setSidebarExpanded}/>
            <main className={`min-h-screen transition-[padding] duration-300 ${sidebarExpanded ? "pl-[135px] md:pl-[320px]" : "pl-[135px]"}`}>
                <div className="mx-auto px-4 py-6 sm:px-6 lg:px-8">
                {children}
                </div>
            </main>
        </NotificationProvider>
    </Protected>;
}

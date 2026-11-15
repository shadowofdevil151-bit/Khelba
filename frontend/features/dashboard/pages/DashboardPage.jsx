"use client";

import { useEffect, useState } from "react";
import DashboardActions from "@/features/dashboard/components/DashboardActions";
import DashboardReport from "@/features/dashboard/components/DashboardReport";
import DashboardLeaderboard from "@/features/dashboard/components/DashboardLeaderboard";
import DashboardStreakCard from "@/features/dashboard/components/DashboardStreakCard";
import { api } from "@/lib/api";

export default function DashboardPage() {
    const [snapshot, setSnapshot] = useState({ entries: [], rank: null, loading: true, error: false });
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        let current = true;
        setSnapshot((previous) => ({ ...previous, loading: true, error: false }));
        Promise.allSettled([api("/leaderboard"), api("/leaderboard/me")]).then(([leaders, rank]) => {
            if (!current) return;
            const entries = leaders.status === "fulfilled" && Array.isArray(leaders.value.data)
                ? leaders.value.data.slice(0, 5)
                : [];
            setSnapshot({
                entries,
                rank: rank.status === "fulfilled" ? rank.value.data : null,
                loading: false,
                error: leaders.status === "rejected" || rank.status === "rejected"
            });
        });
        return () => { current = false; };
    }, [retryKey]);

    const retry = () => setRetryKey((key) => key + 1);

    return <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
        <header className="hidden shrink-0 md:block">
            <h1 className="text-[2rem] font-semibold leading-tight tracking-wide text-white">Dashboard</h1>
        </header>
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
            <div className="lg:col-start-2 lg:row-start-1 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-col">
                <DashboardStreakCard rank={snapshot.rank} loading={snapshot.loading} error={snapshot.error}/>
            </div>
            <div className="lg:col-start-1 lg:row-start-1 lg:min-w-0">
                <DashboardActions/>
            </div>
            <div className="lg:col-start-1 lg:row-start-2 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-col">
                <DashboardReport leaderboard={snapshot.entries.slice(0, 3)} mine={snapshot.rank} comparisonLoading={snapshot.loading} comparisonError={snapshot.error} retryComparison={retry}/>
            </div>
            <div className="lg:col-start-2 lg:row-start-2 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-col">
                <DashboardLeaderboard entries={snapshot.entries} loading={snapshot.loading} error={snapshot.error} onRetry={retry}/>
            </div>
        </div>
    </div>;
}
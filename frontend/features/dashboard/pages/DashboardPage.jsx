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

    return <div className="mx-auto max-w-[1500px] space-y-3 lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col lg:overflow-hidden">
        <header className="flex shrink-0 justify-start">
            <h1 className="text-[2rem] font-semibold leading-tight tracking-wide text-white">Dashboard</h1>
        </header>
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
            <div className="grid min-h-0 min-w-0 gap-4 lg:grid-rows-[auto_minmax(0,1fr)]">
                <DashboardActions/>
                <DashboardReport leaderboard={snapshot.entries.slice(0, 3)} mine={snapshot.rank} comparisonLoading={snapshot.loading} comparisonError={snapshot.error} retryComparison={retry}/>
            </div>
            <div className="flex min-h-0 min-w-0 flex-col gap-4">
                <DashboardStreakCard rank={snapshot.rank} loading={snapshot.loading} error={snapshot.error}/>
                <DashboardLeaderboard entries={snapshot.entries} loading={snapshot.loading} error={snapshot.error} onRetry={retry}/>
            </div>
        </div>
    </div>;
}

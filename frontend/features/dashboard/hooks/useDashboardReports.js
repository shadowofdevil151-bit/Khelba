"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const emptySummary = { total_right_answer: 0, total_wrong_answer: 0, total_attempts: 0, completed_questions: 0 };

export function useDashboardReports() {
    const [totals, setTotals] = useState(emptySummary);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let current = true;
        setLoading(true);
        setError(false);

        api("/academic/report/summary").then((response) => {
            if (!current) return;
            setTotals({ ...emptySummary, ...response.data });
        }).catch(() => {
            if (current) setError(true);
        }).finally(() => {
            if (current) setLoading(false);
        });

        return () => { current = false; };
    }, [reloadKey]);

    return { totals, loading, error, retry: () => setReloadKey((key) => key + 1) };
}

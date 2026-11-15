"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, tokenStore } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function GoogleCallback() {
    const router = useRouter();
    const { setUser } = useAuth();
    const [error, setError] = useState("");

    useEffect(() => {
        const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
        window.history.replaceState({}, document.title, window.location.pathname);
        if (!token) {
            setError("গুগল লগইন থেকে অ্যাক্সেস টোকেন পাওয়া যায়নি।");
            return;
        }

        tokenStore.set(token);
        api("/users/me")
            .then((body) => {
                setUser(body.data);
                const next = sessionStorage.getItem("auth:next");
                sessionStorage.removeItem("auth:next");
                const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
                router.replace(safeNext);
            })
            .catch((event) => {
                tokenStore.clear();
                setError(event.message || "গুগল লগইন সম্পন্ন করা যায়নি।");
            });
    }, [router, setUser]);

    if (error) {
        return <main className="grid min-h-[100dvh] place-items-center p-6 sm:min-h-screen"><div className="panel w-full max-w-md p-6 text-center sm:p-8"><h1 className="text-xl font-semibold">গুগল লগইন ব্যর্থ হয়েছে</h1><p className="mt-3 text-sm text-red-200">{error}</p><button className="primary mt-6 w-full sm:w-auto" style={{ minHeight: "44px" }} onClick={() => router.replace("/login")}>লগইন পাতায় ফিরুন</button></div></main>;
    }

    return <main className="grid min-h-[100dvh] place-items-center p-6 sm:min-h-screen"><div className="panel w-full max-w-md p-6 text-sm text-paper/60 sm:p-8">গুগল লগইন সম্পন্ন হচ্ছে…</div></main>;
}
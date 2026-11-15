"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
export default function Protected({ children }) {
    const { user, ready, authUnavailable, retryAuth } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    useEffect(() => { if (ready && !user && !authUnavailable) router.replace(`/login?next=${encodeURIComponent(pathname)}`); }, [ready, user, authUnavailable, router, pathname]);
    if (ready && authUnavailable) return <div className="grid min-h-screen place-items-center px-5 text-center text-paper/70">
        <div><p>সার্ভারের সঙ্গে সংযোগ করা যাচ্ছে না। আপনার সেশন মুছে যায়নি—আবার চেষ্টা করুন।</p><button type="button" className="primary mt-4" onClick={retryAuth}>আবার সংযোগ করুন</button></div>
    </div>;
    if (!ready || !user) return <div className="grid min-h-screen place-items-center text-paper/60">আপনার পড়ার জায়গা প্রস্তুত হচ্ছে…</div>;
    return children;
}

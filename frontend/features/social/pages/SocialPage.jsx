"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import LoadingState from "@/components/LoadingState";
import RequestErrorState from "@/components/RequestErrorState";
import { notificationAction, notificationStatus } from "../utils/notifications";
import SocialSearch from "../components/SocialSearch";
import SocialList from "../components/SocialList";
import SocialRightPanel from "../components/SocialRightPanel";

export default function SocialPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { items: notifications, unseenCount, markSeen, clearChatNotification } = useNotifications();
    const [tab, setTab] = useState("chat");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedChatUserId, setSelectedChatUserId] = useState(null);
    const [selectedChatUser, setSelectedChatUser] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [mobileView, setMobileView] = useState("list");
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(true);
    const [friendsError, setFriendsError] = useState("");
    const [removeFriendTarget, setRemoveFriendTarget] = useState(null);
    const [friendActionPending, setFriendActionPending] = useState(false);
    const [friendActionError, setFriendActionError] = useState("");
    const searchControllerRef = useRef(null);
    const friendsControllerRef = useRef(null);
    const actionControllerRef = useRef(null);
    const openedChatFromQueryRef = useRef(null);

    const loadFriends = async (signal) => {
        setFriendsLoading(true);
        setFriendsError("");
        try {
            const body = await api("/users/friends", { signal });
            if (!signal?.aborted) setFriends(body.data || []);
        } catch (requestError) {
            if (requestError.name !== "AbortError") setFriendsError(requestError.message || "বন্ধুদের তালিকা লোড করা যায়নি।");
        } finally {
            if (!signal?.aborted) setFriendsLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        friendsControllerRef.current = controller;
        loadFriends(controller.signal);
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const query = searchQuery.trim();
        searchControllerRef.current?.abort();
        if (query.length < 2) {
            setSearchResults([]);
            setSearchLoading(false);
            return undefined;
        }
        const controller = new AbortController();
        searchControllerRef.current = controller;
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const body = await api("/users/search", { method: "POST", body: JSON.stringify({ username: query }), signal: controller.signal });
                if (!controller.signal.aborted) setSearchResults((body.data?.users || body.data || []).filter((item) => String(item._id) !== String(user?._id)));
            } catch (requestError) {
                if (requestError.name !== "AbortError") setSearchResults([]);
            } finally {
                if (!controller.signal.aborted) setSearchLoading(false);
            }
        }, 300);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchQuery, user?._id]);

    useEffect(() => {
        const handler = () => loadFriends();
        window.addEventListener("social:refresh-requests", handler);
        return () => window.removeEventListener("social:refresh-requests", handler);
    }, []);

    useEffect(() => {
        const requestedTab = searchParams.get("tab");
        if (["chat", "requests", "friends", "notifications"].includes(requestedTab)) setTab(requestedTab);
        const userId = searchParams.get("userId");
        if (!userId || openedChatFromQueryRef.current === userId) return undefined;
        openedChatFromQueryRef.current = userId;
        setTab("chat");
        setSelectedChatUserId(userId);
        setSelectedUser(null);
        setMobileView("detail");
        api(`/users/${encodeURIComponent(userId)}/profile`)
            .then((body) => setSelectedChatUser(body.data))
            .catch(() => setSelectedChatUser(null));
        return undefined;
    }, [searchParams]);

    useEffect(() => {
        const handler = async () => {
            if (!selectedUser?._id) return;
            try {
                const body = await api(`/users/${selectedUser._id}/profile`);
                setSelectedUser(body.data);
            } catch {
                // The selected profile remains usable if a refresh fails.
            }
        };
        window.addEventListener("social:refresh-user", handler);
        return () => window.removeEventListener("social:refresh-user", handler);
    }, [selectedUser?._id]);

    const selectChat = (userId, person = null) => {
        setSelectedChatUserId(String(userId));
        setSelectedChatUser(person);
        setSelectedUser(null);
        setMobileView("detail");
    };
    const selectUser = (person) => {
        setSelectedUser(person);
        setSelectedChatUserId(null);
        setMobileView("detail");
    };
    const clearSelection = () => {
        setSelectedChatUserId(null);
        setSelectedChatUser(null);
        setSelectedUser(null);
    };
    const respond = async (targetId, accept) => {
        actionControllerRef.current?.abort();
        const controller = new AbortController();
        actionControllerRef.current = controller;
        try {
            await api(`/users/${targetId}/friend-response`, { method: "POST", body: JSON.stringify({ accept }), signal: controller.signal });
            if (!controller.signal.aborted) await loadFriends(controller.signal);
        } catch (requestError) {
            if (requestError.name !== "AbortError") setFriendsError(requestError.message || "অনুরোধটি সম্পন্ন করা যায়নি।");
        }
    };
    const updateFriendState = (targetId, friendStatus) => {
        const friendshipStatus = friendStatus === "friends"
            ? "friends"
            : friendStatus === "pending_sent"
                ? "pending_out"
                : friendStatus === "pending_received"
                    ? "pending_in"
                    : "none";
        const requestSentAt = friendStatus === "pending_sent" ? new Date().toISOString() : null;
        const update = (item) => String(item?._id) === String(targetId)
            ? { ...item, friendStatus, friendshipStatus, requestSentAt }
            : item;
        setSearchResults((items) => items.map(update));
        setSelectedUser((item) => item && String(item._id) === String(targetId) ? update(item) : item);
    };
    const handleFriendAction = async (target, requestedStatus) => {
        const targetId = target?._id;
        if (!targetId) return false;
        if (requestedStatus === "friends") {
            setFriendActionError("");
            setRemoveFriendTarget(target);
            return true;
        }
        setFriendActionError("");
        try {
            if (requestedStatus === "pending_received") {
                await api(`/users/${targetId}/friend-response`, {
                    method: "POST",
                    body: JSON.stringify({ accept: true })
                });
            } else if (requestedStatus === "none") {
                await api(`/users/${targetId}/friend-request`, { method: "POST", body: JSON.stringify({}) });
            } else {
                return true;
            }
            updateFriendState(targetId, requestedStatus === "pending_received" ? "friends" : "pending_sent");
            await loadFriends();
            return true;
        } catch (requestError) {
            setFriendActionError(requestError.message || "বন্ধুত্বের অনুরোধটি সম্পন্ন করা যায়নি।");
            return false;
        }
    };
    const removeFriend = async () => {
        if (!removeFriendTarget?._id || friendActionPending) return;
        setFriendActionPending(true);
        setFriendActionError("");
        try {
            await api(`/users/friends/${removeFriendTarget._id}`, { method: "DELETE" });
            updateFriendState(removeFriendTarget._id, "none");
            await loadFriends();
            setRemoveFriendTarget(null);
        } catch (requestError) {
            setFriendActionError(requestError.message || "বন্ধুকে সরানো যায়নি।");
        } finally {
            setFriendActionPending(false);
        }
    };
    const handleNotificationClick = (item) => {
        markSeen([String(item._id)]).catch(() => {});
        const action = notificationAction(item);
        if (!action) return;
        if (action.kind === "open_chat") {
            setSelectedChatUserId(action.senderId);
            setSelectedUser(null);
            setTab("chat");
            clearChatNotification(action.senderId);
            setMobileView("detail");
        } else if (action.kind === "switch_tab") {
            setTab(action.tab);
        } else if (action.kind === "route") {
            router.push(action.href);
        }
    };
    const respondFriendBattle = async (item, accept) => {
        const requestId = item?.payload?.requestId;
        if (!requestId || notificationStatus(item) === "expired") return;
        try {
            if (accept) {
                markSeen([String(item._id)]).catch(() => {});
                router.push(`/battle?battleRequestId=${encodeURIComponent(requestId)}`);
                return;
            }
            await api(`/friend-battles/${encodeURIComponent(requestId)}/reject`, { method: "POST" });
            markSeen([String(item._id)]).catch(() => {});
        } catch (requestError) {
            setFriendActionError(requestError.message || "ব্যাটল অনুরোধটি সম্পন্ন করা যায়নি।");
        }
    };
    const incomingRequests = friends.filter((item) => item.status === "requested" && String(item.requestedBy) !== String(user?._id));
    const outgoingRequests = friends.filter((item) => item.status === "requested" && String(item.requestedBy) === String(user?._id));
    const toPerson = (item, friendshipStatus) => ({ ...(item?.profile || {}), _id: String(item?.user || item?._id || ""), username: item?.profile?.username || item?.username || "শিক্ষার্থী", profile: item?.profile || item?.profile, updatedAt: item?.updatedAt, friendshipStatus });
    const acceptedFriends = friends.filter((item) => item.status === "accepted").map((item) => toPerson(item, "friends"));
    const incomingPeople = incomingRequests.map((item) => toPerson(item, "pending_in"));
    const outgoingPeople = outgoingRequests.map((item) => toPerson(item, "pending_out"));

    return <div className="flex h-[calc(100dvh-7.5rem)] flex-col overflow-hidden p-2 md:h-[calc(100dvh-3rem)] md:p-0">
        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[340px_minmax(0,1fr)]">
            <section className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14161b] ${mobileView === "detail" ? "hidden md:flex" : "flex"}`}>
                <SocialSearch query={searchQuery} onChange={setSearchQuery} loading={searchLoading}/>
                <div className="chat-scroll min-h-0 flex-1 overflow-y-auto">
                {friendsLoading ? <LoadingState compact title="তালিকা লোড হচ্ছে…"/> : friendsError ? <RequestErrorState title="সামাজিক তালিকা লোড করা যায়নি" detail={friendsError} onRetry={() => loadFriends()}/> : <SocialList
                    tab={tab}
                    onTabChange={(nextTab) => { setTab(nextTab); clearSelection(); }}
                    searching={searchQuery.trim().length >= 2}
                    searchResults={searchResults}
                    searchLoading={searchLoading}
                    selectedChatUserId={selectedChatUserId}
                    selectedChatUser={selectedChatUser}
                    selectedUser={selectedUser}
                    onSelectChat={selectChat}
                    onSelectUser={selectUser}
                    notifications={notifications}
                    onNotificationClick={handleNotificationClick}
                    onFriendBattleRespond={respondFriendBattle}
                    friends={acceptedFriends}
                    incomingRequests={incomingPeople}
                    outgoingRequests={outgoingPeople}
                    onRespond={respond}
                    onFriendAction={handleFriendAction}
                    unseenCount={unseenCount}
                />}
                </div>
            </section>
            <section className={`${mobileView === "detail" ? "fixed inset-0 z-50 flex h-[100dvh]" : "hidden"} min-h-0 flex-col overflow-hidden bg-[#18191e] md:static md:z-auto md:h-auto md:flex md:rounded-2xl md:border md:border-white/10 md:bg-[#14161b]`}>
                <SocialRightPanel
                    tab={tab}
                    selectedChatUserId={selectedChatUserId}
                    selectedChatUser={selectedChatUser}
                    selectedUser={selectedUser}
                    onClearSelection={clearSelection}
                    onStartChat={selectChat}
                    onSelectUser={selectUser}
                    onFriendAction={handleFriendAction}
                    onBack={() => setMobileView("list")}
                    unseenCount={unseenCount}
                    onMarkAllSeen={() => markSeen([])}
                    notifications={notifications}
                    onNotificationClick={handleNotificationClick}
                    mobileView={mobileView}
                    onFocusSearch={() => { setMobileView("list"); document.querySelector("[data-social-search]")?.focus(); }}
                />
            </section>
        </div>
        {friendActionError && !removeFriendTarget && <div role="alert" className="fixed bottom-5 right-5 z-40 max-w-sm rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 shadow-xl">{friendActionError}</div>}
        {removeFriendTarget && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs" onMouseDown={(event) => { if (event.target === event.currentTarget && !friendActionPending) setRemoveFriendTarget(null); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="remove-friend-title" className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#14161b] p-5 shadow-2xl">
                <h2 id="remove-friend-title" className="text-base font-semibold text-zinc-100">বন্ধু তালিকা থেকে সরাবেন?</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{removeFriendTarget.username || "এই বন্ধুকে"} কে বন্ধু তালিকা থেকে সরাতে চান?</p>
                {friendActionError && <p role="alert" className="mt-3 text-sm text-rose-300">{friendActionError}</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => setRemoveFriendTarget(null)} disabled={friendActionPending} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">বাতিল</button>
                    <button type="button" onClick={removeFriend} disabled={friendActionPending} className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/25 disabled:cursor-wait disabled:opacity-50">{friendActionPending ? "সরানো হচ্ছে…" : "সরান"}</button>
                </div>
            </div>
        </div>}
    </div>;
}
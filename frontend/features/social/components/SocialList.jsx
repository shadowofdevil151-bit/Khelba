"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, MessageCircle, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import LoadingState from "@/components/LoadingState";
import UserAvatar from "./UserAvatar";
import NotificationIcon from "./NotificationIcon";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import { formatTimeAgo } from "../utils/format";
import { groupByDay, notificationMeta, notificationStatus } from "../utils/notifications";
import { canCancelRequest, hoursUntilRetry } from "../utils/requestState";

function nameFor(item) {
    return item?.profile?.username || item?.username || "শিক্ষার্থী";
}

function friendStatusFor(item) {
    if (item?.friendStatus) return item.friendStatus;
    if (item?.friendshipStatus === "friends") return "friends";
    if (item?.friendshipStatus === "pending_out") return "pending_sent";
    if (item?.friendshipStatus === "pending_in") return "pending_received";
    return "none";
}

function FriendActionButton({ user, status, onAction }) {
    const config = {
        none: { label: "বন্ধু যোগ করুন", className: "social-btn-primary", disabled: false },
        pending_sent: { label: "অনুরোধ পাঠানো হয়েছে", className: "social-btn-ghost", disabled: true },
        pending_received: { label: "অনুরোধ গ্রহণ করুন", className: "social-btn-success", disabled: false },
        friends: { label: "বন্ধু ✓", className: "social-btn-ghost text-emerald-300", disabled: false }
    }[status] || null;
    if (!config) return null;
    return <button type="button" disabled={config.disabled} onClick={(event) => {
        event.stopPropagation();
        void onAction(user, status);
    }} className={`${config.className} max-w-40 truncate px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60`}>{config.label}</button>;
}

function Row({ avatar, title, subtitle, right, onClick, active }) {
    return <div role="button" tabIndex={0} aria-current={active ? "true" : undefined} onClick={onClick} onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
        }
    }} className={`social-row w-full text-left ${active ? "social-row-active" : ""}`}>
        {avatar}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-100">{title}</span>{subtitle && <span className="block truncate text-xs text-zinc-500">{subtitle}</span>}</span>
        {right}
    </div>;
}

function UserRow({ user, onClick, right, active }) {
    return <Row active={active} avatar={<UserAvatar user={user?.profile || user} size="sm"/>} title={nameFor(user)} subtitle={user?.profile?.education_stream || user?.profile?.institution || ""} right={right} onClick={onClick}/>;
}

export default function SocialList({
    tab, onTabChange, searching, searchResults, searchLoading, selectedChatUserId,
    selectedUser, onSelectChat, onSelectUser, notifications,     onNotificationClick,
    onFriendBattleRespond,
    friends, incomingRequests, outgoingRequests, onRespond, onFriendAction, unseenCount
}) {
    const { user: currentUser } = useAuth();
    const [filter, setFilter] = useState("all");
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);
    const tabs = [["chat", "চ্যাট"], ["requests", "অনুরোধ"], ["friends", "বন্ধু"], ["notifications", "বিজ্ঞপ্তি"]];
    const tabAccent = {
        chat: "social-tab-active-chat",
        requests: "social-tab-active-requests",
        friends: "social-tab-active-friends",
        notifications: "social-tab-active-notifications"
    };
    const chatRows = friends || [];
    const notificationItems = useMemo(() => Array.isArray(notifications) ? notifications : [], [notifications]);
    const filteredNotifications = useMemo(() => {
        if (filter === "all") return notificationItems;
        if (filter === "unread") return notificationItems.filter((item) => !item.seen);
        if (filter === "messages") return notificationItems.filter((item) => item.type === "friend_chat");
        if (filter === "requests") return notificationItems.filter((item) => item.type.startsWith("friend_request") || item.type.startsWith("friend_battle"));
        if (filter === "battles") return notificationItems.filter((item) => item.type.startsWith("battle") || item.type.startsWith("friend_battle"));
        return notificationItems;
    }, [notificationItems, filter]);
    const groupedNotifications = useMemo(() => groupByDay(filteredNotifications), [filteredNotifications]);
    const respondRequest = async (userId, accept) => {
        try {
            await api(`/users/${userId}/friend-response`, { method: "POST", body: JSON.stringify({ accept }) });
            window.dispatchEvent(new Event("social:refresh-requests"));
        } catch (error) {
            console.error("Failed to respond to request:", error);
        }
    };
    const cancelRequest = async (userId) => {
        try {
            await api(`/users/${userId}/friend-request`, { method: "DELETE" });
            window.dispatchEvent(new Event("social:refresh-requests"));
        } catch (error) {
            console.error("Failed to cancel request:", error);
        }
    };
    return <div className="flex min-h-0 flex-1 flex-col">
        <div className={`grid grid-cols-4 gap-1 p-2 ${searching ? "pointer-events-none opacity-40" : ""}`}>
            {tabs.map(([id, label]) => <button key={id} type="button" onClick={() => onTabChange(id)} className={`social-tab focus-visible:outline-zinc-400 ${tab === id ? tabAccent[id] : "text-zinc-400 hover:bg-white/[.04] hover:text-white"}`}>
                {label}
                {id === "requests" && incomingRequests?.length > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-400"/>}
                {id === "notifications" && unseenCount > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-400"/>}
            </button>)}
        </div>
        <div className="min-h-0 flex-1 p-2">
            {searching ? searchLoading ? <LoadingState compact title="খোঁজা হচ্ছে…"/> : searchResults.length === 0
                ? <div className="p-8 text-center text-lg font-semibold text-white">কোনো ব্যবহারকারী পাওয়া যায়নি</div>
                : searchResults.map((item) => {
                    return <UserRow key={item._id} user={item} active={String(selectedUser?._id) === String(item._id)} onClick={() => onSelectUser(item)} right={<FriendActionButton user={item} status={friendStatusFor(item)} onAction={onFriendAction}/>}/>;
                })
                : tab === "chat" ? chatRows.length ? chatRows.map((item) => {
                    const id = String(item.user || item._id);
                    return <Row key={id} active={selectedChatUserId === id} avatar={<UserAvatar user={item?.profile || item} size="sm"/>} title={nameFor(item)} subtitle={<span className="social-chip social-chip-emerald">বন্ধু</span>} right={<MessageCircle aria-hidden="true" size={15} className="text-zinc-600"/>} onClick={() => onSelectChat(id, { ...(item?.profile || {}), _id: id, username: nameFor(item) })}/>;
                }) : <EmptyList text="কোনো চ্যাট নেই" action="বন্ধু তালিকা" onAction={() => onTabChange("friends")}/>
                : tab === "requests" ? <div className="space-y-4">
                    {!incomingRequests?.length && !outgoingRequests?.length && <div className="p-8 text-center"><p className="text-base font-bold text-paper/80 md:text-lg md:font-semibold md:text-white">No friend requests</p><p className="mt-2 text-xs text-paper/50 md:text-sm md:text-zinc-400">আপনার কোনো আসন্ন বা পাঠানো অনুরোধ নেই।</p></div>}
                    {incomingRequests?.length > 0 && <section>
                        <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Incoming · <span className="bangla-digits">{formatBanglaNumber(incomingRequests.length)}</span></div>
                        {incomingRequests.map((item) => {
                            const target = item;
                            const selected = String(selectedUser?._id) === String(target?._id);
                            return <Row key={target._id} active={selected} avatar={<UserAvatar user={target?.profile || target} size="sm"/>} title={target.username} subtitle={<span className="bangla-digits text-xs text-zinc-500">{formatTimeAgo(target.updatedAt)}</span>} right={<span className="flex shrink-0 items-center gap-2"><button type="button" className="social-btn-success px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); respondRequest(target._id, true); }}>Accept</button><button type="button" className="social-btn-danger px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); respondRequest(target._id, false); }}>Decline</button></span>} onClick={() => onSelectUser({ ...target, friendshipStatus: "pending_in", requestSentAt: target.updatedAt })}/>;
                        })}
                    </section>}
                    {outgoingRequests?.length > 0 && <section>
                        <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Sent · <span className="bangla-digits">{formatBanglaNumber(outgoingRequests.length)}</span></div>
                        {outgoingRequests.map((item) => {
                            const target = item;
                            const selected = String(selectedUser?._id) === String(target?._id);
                            const sentAt = target.updatedAt;
                            const hours = hoursUntilRetry(sentAt);
                            return <Row key={target._id} active={selected} avatar={<UserAvatar user={target?.profile || target} size="sm"/>} title={target.username} subtitle={<span className="bangla-digits text-xs text-zinc-500">{formatTimeAgo(sentAt)}</span>} right={<span className="flex shrink-0 items-center gap-2"><span className="social-chip social-chip-amber">{hours > 0 ? `Pending · ${hours}h` : "Pending"}</span>{canCancelRequest(currentUser, target._id) && <button type="button" className="social-btn-ghost px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); cancelRequest(target._id); }}>Cancel</button>}</span>} onClick={() => onSelectUser({ ...target, friendshipStatus: "pending_out", requestSentAt: sentAt })}/>;
                        })}
                    </section>}
                </div>
                : tab === "friends" ? friends?.length ? friends.map((item) => <UserRow key={String(item._id)} user={item} onClick={() => onSelectUser(item)} right={<ChevronRight aria-hidden="true" size={16} className="text-zinc-600"/>}/>) : <EmptyList text="এখনো বন্ধু নেই · প্রথম বন্ধু খুঁজুন" action="সার্চ করুন" onAction={() => { onTabChange("chat"); document.querySelector("[data-social-search]")?.focus(); }}/>
                : <div>
                    <div className="px-2 pb-2 pt-2">
                        <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
                            {[
                                { id: "all", label: "All" },
                                { id: "unread", label: "Unread", count: notificationItems.filter((item) => !item.seen).length },
                                { id: "messages", label: "Messages" },
                                { id: "requests", label: "Requests" },
                                { id: "battles", label: "Battles" }
                            ].map((chip) => <button key={chip.id} type="button" onClick={() => setFilter(chip.id)} className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${filter === chip.id ? "border-amber-400/50 bg-amber-400/15 text-amber-200" : "border-white/10 bg-white/[.02] text-zinc-400 hover:border-white/20 hover:text-white"}`}>
                                {chip.label}
                                {chip.count > 0 && <span className="bangla-digits ml-1">({formatBanglaNumber(chip.count)})</span>}
                            </button>)}
                        </div>
                    </div>
                    {!groupedNotifications.length && <div className="px-5 py-10 text-center"><Bell aria-hidden="true" className="mx-auto text-zinc-500" size={40}/><div className="mt-3 text-base font-bold text-paper/80 md:text-lg md:font-semibold md:text-white">All caught up</div><div className="mt-2 text-xs text-paper/50 md:text-sm md:text-zinc-400">নতুন কিছু এলে এখানে দেখাবে।</div></div>}
                    {groupedNotifications.map(([label, items]) => <div key={label}>
                        <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
                        {items.map((item) => {
                            const meta = notificationMeta(item);
                            const isUnread = !item.seen;
                            const body = item.payload?.body || item.payload?.message || "";
                            const isFriendBattleInvite = item.type === "friend_battle_request";
                            const isExpired = notificationStatus(item, now) === "expired";
                            return <div key={String(item._id)} role="button" tabIndex={0} onClick={() => { if (!isFriendBattleInvite) onNotificationClick(item); }} onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    if (!isFriendBattleInvite) onNotificationClick(item);
                                }
                            }} className={`social-row w-full text-left ${isUnread && !isExpired ? "bg-white/[.02]" : ""} ${isExpired ? "opacity-55" : ""}`}>
                                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${isExpired ? "border-zinc-700 bg-zinc-800/50 text-zinc-500" : meta.toneClass}`}><NotificationIcon type={item.type} unseen={isUnread && !isExpired}/></span>
                                <div className="min-w-0 flex-1"><div className={`truncate text-sm ${isExpired ? "text-zinc-500" : isUnread ? "font-semibold text-white" : "text-zinc-300"}`}>{meta.title}</div>{body && <div className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{body}</div>}</div>
                                <div className="flex shrink-0 flex-col items-end gap-1"><span className="bangla-digits text-[11px] text-zinc-500">{formatTimeAgo(item.createdAt)}</span>{isExpired ? <span className="text-[10px] font-semibold text-zinc-500">মেয়াদ শেষ</span> : isFriendBattleInvite ? <span className="flex gap-1"><button type="button" onClick={(event) => { event.stopPropagation(); onFriendBattleRespond(item, true); }} className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300">গ্রহণ</button><button type="button" onClick={(event) => { event.stopPropagation(); onFriendBattleRespond(item, false); }} className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-300">প্রত্যাখ্যান</button></span> : isUnread && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky-400"/>}</div>
                            </div>;
                        })}
                    </div>)}
                </div>}
        </div>
    </div>;
}

function EmptyList({ text, action, onAction }) {
    return <div className="p-8 text-center"><Users aria-hidden="true" className="mx-auto mb-3 text-zinc-500" size={40}/><p className="text-base font-bold text-paper/80 md:text-lg md:font-semibold md:text-white">{text}</p>{action && <button type="button" onClick={onAction} className="social-btn-ghost mt-4 px-3 py-1.5 text-xs">{action}</button>}</div>;
}
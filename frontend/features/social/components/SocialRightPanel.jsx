"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, Bell, Check, MessageCircle, Send, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import ChatMessageBubble from "./ChatMessageBubble";
import UserAvatar from "./UserAvatar";
import { mergeMessages, messageKey } from "../utils/messages";
import { notificationMeta } from "../utils/notifications";

export default function SocialRightPanel({ tab, selectedChatUserId, selectedChatUser, selectedUser, onStartChat, onSelectUser, onFriendAction, onBack, onMarkAllSeen, notifications, onNotificationClick, mobileView, onFocusSearch }) {
    return <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14161b]">
        {mobileView === "detail" && <button type="button" onClick={onBack} className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3 text-sm text-zinc-300 md:hidden"><ArrowLeft aria-hidden="true" size={16}/> ফিরে যান</button>}
        {selectedChatUserId ? <ChatThread userId={selectedChatUserId} otherUser={selectedChatUser} onBack={onBack} onSelectUser={onSelectUser}/> : selectedUser ? <UserProfileCard user={selectedUser} onStartChat={onStartChat} onFriendAction={onFriendAction}/> : tab === "notifications" ? <NotificationsSummary items={notifications} onMarkAllSeen={onMarkAllSeen} onNotificationClick={onNotificationClick}/> : <EmptyPanel tab={tab} onFocusSearch={onFocusSearch}/>}
    </section>;
}

function dateLabel(iso) {
    const date = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const timestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    if (timestamp === today) return "Today";
    if (timestamp === today - 86400000) return "Yesterday";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ChatThread({ userId, otherUser, onBack, onSelectUser }) {
    const { user } = useAuth();
    const { clearChatNotification } = useNotifications();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [typing, setTyping] = useState(false);
    const [error, setError] = useState("");
    const [maxLength, setMaxLength] = useState(500);
    const messagesRef = useRef(null);
    const endRef = useRef(null);
    const nearBottomRef = useRef(true);
    const [showScrollFab, setShowScrollFab] = useState(false);
    const initialScrollRef = useRef(false);
    const typingTimer = useRef(null);
    const groups = useMemo(() => {
        const output = [];
        let currentLabel = null;
        for (const message of messages) {
            const label = dateLabel(message.createdAt);
            if (label !== currentLabel) {
                output.push({ type: "divider", label });
                currentLabel = label;
            }
            output.push({ type: "message", message });
        }
        return output;
    }, [messages]);

    useEffect(() => {
        const chatSocket = connectSocket("/chat");
        setSocket(chatSocket);
        const onConnect = () => { setConnected(true); chatSocket.emit("chat:open", { userId }); };
        const onDisconnect = () => setConnected(false);
        const onConfig = (config) => { if (Number.isFinite(config?.maxMessageLength)) setMaxLength(config.maxMessageLength); };
        const onSnapshot = (payload) => {
            if (String(payload.userId) !== String(userId)) return;
            setMessages(mergeMessages([], payload.messages));
            setLoading(false);
            clearChatNotification(userId);
        };
        const onMessage = (message) => {
            if (String(message.sender) === String(userId)) setMessages((current) => mergeMessages(current, [message]));
        };
        const onTyping = (payload) => {
            if (String(payload.userId) !== String(userId)) return;
            setTyping(payload.isTyping === true);
            clearTimeout(typingTimer.current);
            if (payload.isTyping) typingTimer.current = setTimeout(() => setTyping(false), 2500);
        };
        const onError = (payload) => { setError(payload?.message || "চ্যাটের অনুরোধটি সম্পন্ন করা যায়নি।"); setSending(false); setLoading(false); };
        chatSocket.on("connect", onConnect); chatSocket.on("disconnect", onDisconnect); chatSocket.on("connect_error", onDisconnect);
        chatSocket.on("chat:config", onConfig); chatSocket.on("chat:snapshot", onSnapshot); chatSocket.on("chat:message", onMessage); chatSocket.on("chat:typing", onTyping); chatSocket.on("chat:error", onError);
        return () => {
            chatSocket.emit("chat:close", { userId });
            clearTimeout(typingTimer.current);
            chatSocket.disconnect();
        };
    }, [clearChatNotification, userId]);

    const scrollToBottom = (behavior = "smooth") => {
        endRef.current?.scrollIntoView({ behavior, block: "end" });
        nearBottomRef.current = true;
        setShowScrollFab(false);
    };
    const handleScroll = () => {
        const container = messagesRef.current;
        if (!container) return;
        const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
        nearBottomRef.current = distance <= 200;
        setShowScrollFab(distance > 400);
    };
    useEffect(() => {
        if (!messages.length) return;
        if (!initialScrollRef.current) {
            initialScrollRef.current = true;
            scrollToBottom("auto");
        } else if (nearBottomRef.current) {
            scrollToBottom();
        }
    }, [messages]);
    const send = () => {
        const message = text.trim();
        if (!message || sending || !socket?.connected) return;
        setSending(true);
        socket.timeout(10000).emit("chat:send", { recipientId: userId, text: message }, (timeoutError, response) => {
            setSending(false);
            if (timeoutError || !response?.success) { setError(response?.message || "বার্তা পাঠানো যায়নি।"); return; }
            if (response.message) setMessages((current) => mergeMessages(current, [response.message]));
            setText("");
        });
    };

    return <div className="flex min-h-0 flex-1 flex-col">
        {!connected && <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-200"><span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 motion-reduce:animate-none"/>Reconnecting…</div>}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-4">{otherUser ? <button type="button" onClick={() => onSelectUser(otherUser)} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><UserAvatar user={otherUser} size="sm"/></button> : <UserAvatar user={{ _id: userId, username: "ব্যবহারকারী" }} size="sm"/>}<div>{otherUser ? <button type="button" onClick={() => onSelectUser(otherUser)} className="font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">{otherUser.username || "শিক্ষার্থী"}</button> : <div className="font-semibold text-white">কথোপকথন</div>}<div className={`text-xs ${connected ? "text-emerald-300" : "text-zinc-500"}`}>{connected ? "সংযুক্ত" : "পুনরায় সংযোগ হচ্ছে"}</div></div></div>
        {error && <div className="mx-4 mt-4 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
        <div ref={messagesRef} onScroll={handleScroll} className="chat-scroll relative min-h-0 flex-1 overflow-y-auto p-4">
            {loading ? <div className="grid h-full place-items-center text-sm text-zinc-500">কথোপকথন লোড হচ্ছে…</div> : messages.length ? groups.map((item, index) => item.type === "divider"
                ? <div key={`divider-${item.label}`} className="my-3 text-center"><span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] font-medium text-zinc-400">{item.label}</span></div>
                : <div key={messageKey(item.message)} ref={index === groups.length - 1 ? endRef : undefined} className="mb-3"><ChatMessageBubble message={item.message} own={String(item.message.sender) === String(user?._id)}/></div>
            ) : <div className="flex h-full flex-col items-center justify-center p-8 text-center"><MessageCircle aria-hidden="true" size={44} className="text-sky-300/70"/><div className="mt-4 text-lg font-semibold text-white">Say salam to start 👋</div><div className="mt-2 text-sm text-zinc-400">প্রথম মেসেজ পাঠিয়ে কথা শুরু করুন।</div></div>}
            {showScrollFab && <button type="button" onClick={() => scrollToBottom()} className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#1f232c] text-white shadow-lg transition hover:bg-[#2a2f3a] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300" aria-label="Scroll to latest"><ArrowDown aria-hidden="true" size={16}/></button>}
        </div>
        <div className="shrink-0 border-t border-white/10 p-3"><div className="mb-2 h-4 text-xs text-zinc-500">{typing ? "বন্ধু লিখছেন…" : `সর্বোচ্চ ${formatBanglaNumber(maxLength)} অক্ষর`}</div><div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#191c23] p-2 focus-within:border-cyan-500/50"><textarea className="min-h-10 max-h-24 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-zinc-600" maxLength={maxLength} value={text} onChange={(event) => { setText(event.target.value); socket?.emit("chat:typing", { recipientId: userId, isTyping: Boolean(event.target.value) }); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="বার্তা লিখুন…"/><button type="button" onClick={send} disabled={!text.trim() || sending || !connected} className="social-btn-primary h-9 w-9 shrink-0 px-0 py-0" aria-label="বার্তা পাঠান"><Send aria-hidden="true" size={16}/></button></div></div>
    </div>;
}

function UserProfileCard({ user, onStartChat, onFriendAction }) {
    const [error, setError] = useState("");
    const name = user?.username || user?.profile?.username || "শিক্ষার্থী";
    const friendStatus = user?.friendStatus
        || (user?.friendshipStatus === "friends" ? "friends"
            : user?.friendshipStatus === "pending_out" ? "pending_sent"
                : user?.friendshipStatus === "pending_in" ? "pending_received" : "none");
    const runFriendAction = async (status) => {
        setError("");
        const successful = await onFriendAction?.(user, status);
        if (!successful) setError("বন্ধুত্বের অনুরোধটি সম্পন্ন করা যায়নি।");
    };
    return <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#191c23] p-8 text-center">
        <UserAvatar user={user?.profile || user} size="xl" className="rounded-3xl"/>
        <h2 className="mt-5 text-2xl font-semibold text-white">@{name}</h2>
        <span className="mt-2 rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">{user?.profile?.education_stream || "শিক্ষার্থী"}</span>
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
            {friendStatus === "friends" && <button type="button" onClick={() => onStartChat(user._id, user)} className="social-btn-primary">Message</button>}
            {friendStatus === "none" && <button type="button" onClick={() => runFriendAction("none")} className="social-btn-primary">বন্ধু যোগ করুন</button>}
            {friendStatus === "pending_sent" && <button type="button" disabled className="social-btn-ghost cursor-not-allowed opacity-60">অনুরোধ পাঠানো হয়েছে</button>}
            {friendStatus === "pending_received" && <button type="button" className="social-btn-success" onClick={() => runFriendAction("pending_received")}>অনুরোধ গ্রহণ করুন</button>}
            {friendStatus === "friends" && <button type="button" onClick={() => runFriendAction("friends")} className="social-btn-ghost text-emerald-300">বন্ধু ✓</button>}
            <Link href={`/profile/${user._id}`} className="social-btn-ghost">View full profile</Link>
        </div>
    </div>;
}

function NotificationsSummary({ items, onMarkAllSeen, onNotificationClick }) {
    const notifications = items || [];
    const recent = notifications.filter((item) => !item.seen).slice(0, 3);
    const totalCount = notifications.length;
    const unseenCount = notifications.reduce((sum, item) => sum + (item.seen ? 0 : 1), 0);
    if (totalCount === 0) {
        return <div className="flex h-full flex-col items-center justify-center p-8 text-center"><Bell aria-hidden="true" size={44} className="text-amber-300/70"/><div className="mt-4 text-lg font-semibold text-white">No notifications yet</div><div className="mt-2 text-sm text-zinc-400">নতুন কিছু এলে এখানে দেখাবে।</div></div>;
    }
    return <div className="flex h-full flex-col">
        <div className="border-b border-white/10 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">Notifications</div>
            <div className="mt-1 flex items-baseline gap-2"><span className="bangla-digits text-3xl font-bold text-white">{formatBanglaNumber(unseenCount)}</span><span className="text-sm text-zinc-400">unread · {formatBanglaNumber(totalCount)} total</span></div>
            {unseenCount > 0 ? <button type="button" onClick={onMarkAllSeen} className="social-btn-ghost mt-4 w-full justify-center text-sm">Mark all as read</button> : <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-300"><Check aria-hidden="true" size={16}/> You're all caught up</div>}
        </div>
        {recent.length > 0 && <div className="chat-scroll min-h-0 flex-1 overflow-y-auto p-3"><div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Recent</div>{recent.map((item) => {
            const meta = notificationMeta(item);
            const Icon = meta.icon;
            return <button key={String(item._id)} type="button" onClick={() => onNotificationClick?.(item)} className="social-row w-full text-left"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${meta.toneClass}`}><Icon aria-hidden="true" size={14}/></span><span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{meta.title}</span></button>;
        })}</div>}
    </div>;
}

function EmptyPanel({ tab, onFocusSearch }) {
    const data = { chat: [MessageCircle, "একটি চ্যাট বেছে নিন", "অথবা বাঁ দিকের সার্চ থেকে নতুন কাউকে খুঁজুন", "খুঁজুন"], requests: [UserPlus, "একটি অনুরোধ বেছে নিন", "আসন্ন অনুরোধ গ্রহণ বা বাতিল করুন"], friends: [Users, "একটি বন্ধু বেছে নিন", "প্রোফাইল দেখতে কারো নাম চাপুন"] }[tab] || [Bell, "নোটিফিকেশন দেখুন", "বাঁ দিকের তালিকা থেকে একটি খুলুন"];
    const Icon = data[0];
    return <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><Icon className="mx-auto text-zinc-500" size={40}/><h2 className="mt-5 text-lg font-semibold text-white text-center">{data[1]}</h2><p className="mt-2 text-sm text-zinc-400 text-center">{data[2]}</p>{data[3] && <button type="button" onClick={onFocusSearch} className="social-btn-ghost mt-5">{data[3]}</button>}</div>;
}

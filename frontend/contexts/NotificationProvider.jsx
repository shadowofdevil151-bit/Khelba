"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import { useAuth } from "@/hooks/useAuth";

export const NotificationContext = createContext(null);

function uniqueById(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter((item) => {
        const id = String(item?._id || "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

function mergeNotification(current, item) {
    if (!item) return current;
    const newActor = String(item.actor || item.payload?.senderId || "");
    const base = item.type === "friend_battle_request" && newActor
        ? current.filter((existing) => existing.type !== item.type
            || String(existing.actor || existing.payload?.senderId || "") !== newActor)
        : current;
    return uniqueById([item, ...base]);
}

export function NotificationProvider({ children }) {
    const { user, ready } = useAuth();
    const [items, setItems] = useState([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!ready || !user?._id) {
            setItems([]);
            setConnected(false);
            return undefined;
        }
        const socket = connectSocket("/notifications");
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        const onSnapshot = (snapshot) => {
            const ordered = Array.isArray(snapshot) ? [...snapshot].reverse() : [];
            setItems(ordered.reduce((current, item) => mergeNotification(current, item), []));
        };
        const onNew = (item) => setItems((current) => mergeNotification(current, item));
        const onDeleted = (id) => setItems((current) => current.filter((item) => String(item._id) !== String(id)));
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("notification:snapshot", onSnapshot);
        socket.on("notification:new", onNew);
        socket.on("notification:deleted", onDeleted);
        socket.on("connect_error", onDisconnect);
        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("notification:snapshot", onSnapshot);
            socket.off("notification:new", onNew);
            socket.off("notification:deleted", onDeleted);
            socket.off("connect_error", onDisconnect);
            socket.disconnect();
        };
    }, [ready, user?._id]);

    const markSeen = useCallback(async (ids) => {
        const selected = Array.isArray(ids) ? ids.map(String) : [];
        try {
            await api("/notifications/seen", {
                method: "POST",
                body: JSON.stringify({ ids: selected.length ? selected : undefined })
            });
            setItems((current) => current.map((item) =>
                !selected.length || selected.includes(String(item._id))
                    ? { ...item, seen: true, seenAt: new Date().toISOString() }
                    : item
            ));
        } catch (error) {
            throw error;
        }
    }, []);

    const clearChatNotification = useCallback((senderId) => {
        setItems((current) => current.filter((item) =>
            !(item.type === "friend_chat"
                && String(item.actor || item.payload?.senderId) === String(senderId))
        ));
    }, []);

    const unseenCount = useMemo(() => items.reduce((total, item) => total + (item.seen ? 0 : 1), 0), [items]);
    const value = useMemo(() => ({
        items,
        unseenCount,
        connected,
        markSeen,
        clearChatNotification
    }), [items, unseenCount, connected, markSeen, clearChatNotification]);

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

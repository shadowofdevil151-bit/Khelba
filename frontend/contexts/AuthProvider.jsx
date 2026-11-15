"use client";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { api, authApi, tokenStore, API_ORIGIN } from "@/lib/api";

export const AuthContext = createContext(null);
const normalizeUser = (account) => account
    ? { ...account, _id: account._id || account.id }
    : null;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);
    const [authUnavailable, setAuthUnavailable] = useState(false);
    const refreshRef = useRef(null);
    const restoreSession = useCallback(async () => {
        if (refreshRef.current) return refreshRef.current;
        setReady(false);
        setAuthUnavailable(false);
        const run = (async () => {
            try {
                const session = await authApi.refresh();
                setUser(normalizeUser(session.user));
                tokenStore.set(session.accessToken);
                setAuthUnavailable(false);
            } catch (error) {
                tokenStore.clear();
                setUser(null);
                if (error.status === 409) {
                    await new Promise((resolve) => setTimeout(resolve, 120));
                    try {
                        const retry = await authApi.refresh();
                        setUser(normalizeUser(retry.user));
                        tokenStore.set(retry.accessToken);
                        setAuthUnavailable(false);
                        return;
                    } catch (retryError) {
                        setAuthUnavailable(retryError.status === 429 || !retryError.status || retryError.status >= 500);
                        return;
                    }
                }
                setAuthUnavailable(error.status === 429 || !error.status || error.status >= 500);
            } finally {
                setReady(true);
            }
        })();
        refreshRef.current = run.finally(() => { refreshRef.current = null; });
        return refreshRef.current;
    }, []);
    useEffect(() => {
        restoreSession();
    }, [restoreSession]);
    const login = async (credentials) => {
        const body = await authApi.login(credentials);
        tokenStore.set(body.data.accessToken);
        setUser(normalizeUser(body.data.userProfile));
        setAuthUnavailable(false);
        const next = new URLSearchParams(window.location.search).get("next");
        if (next) sessionStorage.setItem("auth:next", next);
        return body.data;
    };
    const logout = async () => { await api("/auth/logout", { method: "POST" }).catch(() => { }); tokenStore.clear(); setUser(null); };
    const googleLogin = () => { window.location.href = `${API_ORIGIN}/api/v1/auth/google`; };
    return <AuthContext.Provider value={{ user, setUser, ready, authUnavailable, retryAuth: restoreSession, login, logout, googleLogin }}>{children}</AuthContext.Provider>;
}

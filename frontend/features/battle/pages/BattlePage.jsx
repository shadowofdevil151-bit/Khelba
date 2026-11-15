"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeft, BookOpen, BriefcaseBusiness, Check, Crown, FlaskConical,
    Coins, LoaderCircle, MessageCircle, Send, Sparkles, Swords, Target, UserPlus, Wifi, X
} from "lucide-react";
import { api, authApi } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { connectSocket } from "@/lib/socket";
import LoadingState from "@/components/LoadingState";
import { academySubjectsForStream } from "@/lib/subjects";
import SubjectArtwork from "@/features/academy/components/SubjectArtwork";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import { McqPrompt, McqOptionBody } from "@/features/academy/components/McqQuestionContent";

const ANSWERS = ["ক", "খ", "গ", "ঘ"];
const DEFAULT_CONFIG = { timeout: 45, maxMessageLength: 500, messagesPerMinute: 40 };
const ANSWER_FEEDBACK_MS = 1400;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const STREAMS = [
    { id: "SCIENCE", label: "বিজ্ঞান", icon: FlaskConical },
    { id: "ARTS", label: "মানবিক", icon: BookOpen },
    { id: "COMMERCE", label: "ব্যবসায় শিক্ষা", icon: BriefcaseBusiness }
];
const BANGLA_SECTIONS = [
    { id: "prose", name: "গদ্য" },
    { id: "poetry", name: "পদ্য" },
    { id: "sohopath", name: "সহপাঠ" }
];
const QUICK_PHRASES = ["👋 হ্যালো!", "🔥 দারুণ খেলেছ!", "😅 কঠিন প্রশ্ন!", "⚡ দ্রুত উত্তর দাও!", "🤝 গুড গেম!"];

function createMatchRequestId() {
    return window.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function waitForSocketConnection(socket, signal, failureRef, rejectRef) {
    if (failureRef.current) return Promise.reject(failureRef.current);
    if (socket.connected) return Promise.resolve();

    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            socket.off("connect", onConnect);
            signal.removeEventListener("abort", onAbort);
            if (rejectRef.current === rejectWaiting) rejectRef.current = null;
            callback(value);
        };
        const onConnect = () => finish(resolve);
        const onAbort = () => {
            const error = new Error("Connection wait was cancelled.");
            error.name = "AbortError";
            finish(reject, error);
        };
        const rejectWaiting = (error) => finish(reject, error);

        socket.once("connect", onConnect);
        signal.addEventListener("abort", onAbort, { once: true });
        rejectRef.current = rejectWaiting;

        if (signal.aborted) {
            onAbort();
        } else if (!socket.active) {
            socket.connect();
        }
    });
}

function chatMessageKey(message) {
    return String(message?._id || `${message?.userId || ""}:${message?.createdAt || ""}:${message?.text || message?.message || ""}`);
}

function uniqueChatMessages(messages) {
    const seen = new Set();
    return (Array.isArray(messages) ? messages : []).filter((message) => {
        const key = chatMessageKey(message);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

const phaseLabel = {
    idle: "আপনি প্রস্তুত হলে শুরু করুন",
    searching: "প্রতিপক্ষ খোঁজা হচ্ছে",
    starting: "ম্যাচ পাওয়া গেছে",
    active: "রাউন্ড চলছে",
    reconnecting: "সংযোগ বিচ্ছিন্ন",
    finished: "ব্যাটল শেষ"
};

export default function BattlePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const friendId = searchParams.get("friendId");
    const battleRequestId = searchParams.get("battleRequestId");
    const battleId = searchParams.get("battleId");
    const socketRef = useRef(null);
    const timerRef = useRef(null);
    const [socketReady, setSocketReady] = useState(false);
    const [phase, setPhase] = useState(() => battleRequestId || battleId ? "starting" : "idle");
    const [status, setStatus] = useState("");
    const [stream, setStream] = useState("SCIENCE");
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [subject, setSubject] = useState("");
    const [chapter, setChapter] = useState("1");
    const [selectedChapterSection, setSelectedChapterSection] = useState("prose");
    const streamSubjects = useMemo(() => academySubjectsForStream(stream), [stream]);
    const [battle, setBattle] = useState(null);
    const [question, setQuestion] = useState(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [answerState, setAnswerState] = useState(null);
    const [answeredUsers, setAnsweredUsers] = useState({});
    const [answerResults, setAnswerResults] = useState({});
    const [seconds, setSeconds] = useState(DEFAULT_CONFIG.timeout);
    const [messages, setMessages] = useState([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [chatText, setChatText] = useState("");
    const [chatSending, setChatSending] = useState(false);
    const [final, setFinal] = useState(null);
    const [opponentFriendRelation, setOpponentFriendRelation] = useState(null);
    const [friendRequestState, setFriendRequestState] = useState("idle");
    const [isQuitConfirmOpen, setIsQuitConfirmOpen] = useState(false);
    const [disconnected, setDisconnected] = useState(false);
    const [error, setError] = useState("");
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [friendChallengeState, setFriendChallengeState] = useState("idle");
    const friendAcceptAttemptRef = useRef(null);
    const [friendInvite, setFriendInvite] = useState(null);
    const [friendInviteRemaining, setFriendInviteRemaining] = useState(0);
    const friendContextRef = useRef(false);
    const me = battle?.yourUserId;
    const opponent = useMemo(() => battle?.players?.find((item) => item.userId !== me), [battle, me]);
    const ownPlayer = useMemo(() => battle?.players?.find((item) => item.userId === me), [battle, me]);
    const ownScore = final?.scores?.[me] ?? battle?.scores?.[me] ?? 0;
    const opponentScore = final?.scores?.[opponent?.userId] ?? battle?.scores?.[opponent?.userId] ?? 0;
    const selectedPaper = selectedSubject?.papers.find((paper) => paper.code === subject)
        || selectedSubject?.papers[0]
        || null;
    const selectedChapterIndex = selectedPaper?.chapterNumbers.indexOf(Number(chapter)) ?? -1;
    const selectedChapterName = selectedChapterIndex >= 0
        ? selectedPaper.chapters[selectedChapterIndex]
        : "";
    const isBanglaFirstPaper = selectedPaper?.shortCode === "BNG" && selectedPaper.paper === 1;
    const visibleChapters = useMemo(() => {
        if (!selectedPaper) return [];
        if (!isBanglaFirstPaper) return selectedPaper.chapters.map((name, index) => ({
            name,
            chapterNumber: selectedPaper.chapterNumbers[index]
        }));
        return selectedPaper.chapters
            .map((name, index) => ({
                name,
                chapterNumber: selectedPaper.chapterNumbers[index],
                section: selectedPaper.chapterSections?.[index]
            }))
            .filter((item) => item.section === selectedChapterSection);
    }, [isBanglaFirstPaper, selectedChapterSection, selectedPaper]);
    const phaseRef = useRef(phase);
    const meRef = useRef(me);
    const configRef = useRef(config);
    const questionIndexRef = useRef(questionIndex);
    const battleIdRef = useRef(battle?.battleId);
    const answerPendingRef = useRef(false);
    const chatPendingRef = useRef(false);
    const chatOpenRef = useRef(false);
    const chatMessagesRef = useRef(null);
    const selectedRef = useRef(selected);
    const answerStateRef = useRef(answerState);
    const nextQuestionTimerRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const authRefreshRef = useRef(null);
    const connectionFailureRef = useRef(null);
    const connectionWaitRejectRef = useRef(null);
    const matchRequestRef = useRef(null);
    const matchAbortRef = useRef(null);
    const matchRequestIdRef = useRef(null);
    const matchSearchIdRef = useRef(null);
    const serverSearchStartedRef = useRef(false);
    const cancelRequestedRef = useRef(false);
    const cancelledRequestIdsRef = useRef(new Set());
    const cancelledBattleIdsRef = useRef(new Set());
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { meRef.current = me; }, [me]);
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { questionIndexRef.current = questionIndex; }, [questionIndex]);
    useEffect(() => { battleIdRef.current = battle?.battleId; }, [battle?.battleId]);
    useEffect(() => { selectedRef.current = selected; }, [selected]);
    useEffect(() => { answerStateRef.current = answerState; }, [answerState]);
    useEffect(() => { chatOpenRef.current = isChatOpen; }, [isChatOpen]);
    useEffect(() => {
        friendContextRef.current = Boolean(friendId) || Boolean(battleRequestId) || Boolean(battleId) || friendChallengeState === "sent";
    }, [friendId, battleRequestId, battleId, friendChallengeState]);
    useEffect(() => {
        if (phase !== "finished" || !opponent?.userId || opponent.isBot) {
            setOpponentFriendRelation(null);
            return undefined;
        }
        let cancelled = false;
        api("/users/friends")
            .then((response) => {
                if (!cancelled) setOpponentFriendRelation((response.data || []).find((item) => String(item.user) === String(opponent.userId)) || null);
            })
            .catch((requestError) => {
                if (!cancelled) setError(requestError.message || "বন্ধুত্বের অবস্থা জানা যায়নি।");
            });
        return () => { cancelled = true; };
    }, [phase, opponent?.userId, opponent?.isBot]);
    useEffect(() => {
        if (isChatOpen && chatMessagesRef.current) {
            chatMessagesRef.current.scrollTo({ top: chatMessagesRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [isChatOpen, messages]);

    useEffect(() => {
        if (!socketReady || !battleRequestId || friendAcceptAttemptRef.current === battleRequestId) return undefined;
        friendAcceptAttemptRef.current = battleRequestId;
        setError("");
        setPhase("starting");
        setStatus("ব্যাটল অনুরোধ গ্রহণ করা হচ্ছে…");
        api(`/friend-battles/${encodeURIComponent(battleRequestId)}/accept`, { method: "POST" })
            .then((body) => {
                const acceptedBattleId = body.data?.battleId;
                if (!acceptedBattleId) throw new Error("Accept response missing battleId.");
                setStatus("ব্যাটল শুরু হচ্ছে…");
                router.replace(`/battle?battleId=${encodeURIComponent(acceptedBattleId)}`);
            })
            .catch((requestError) => {
                friendAcceptAttemptRef.current = null;
                setPhase("idle");
                setStatus("");
                setError(requestError.message || "ব্যাটল অনুরোধ গ্রহণ করা যায়নি।");
                router.replace("/battle");
            });
        return undefined;
    }, [battleRequestId, router, socketReady]);

    useEffect(() => {
        let disposed = false;
        const socket = connectSocket("/battle", {
            auth: { reconnect: true },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 500,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });
        socketRef.current = socket;

        const scheduleReconnect = () => {
            if (
                disposed
                || connectionFailureRef.current
                || socket.connected
                || socket.active
                || reconnectTimerRef.current
            ) return;
            const attempt = Math.min(reconnectAttemptRef.current, 5);
            reconnectAttemptRef.current += 1;
            const delay = Math.min(1000 * (2 ** attempt), 15000) + Math.floor(Math.random() * 500);
            reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                if (!disposed && !connectionFailureRef.current && !socket.connected && !socket.active) {
                    socket.connect();
                }
            }, delay);
        };
        const onConnect = () => {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
            reconnectAttemptRef.current = 0;
            connectionFailureRef.current = null;
            setSocketReady(true);
            setDisconnected(false);
            setStatus(
                phaseRef.current === "searching"
                    ? "অন্য খেলোয়াড়ের অপেক্ষায়…"
                    : battleRequestId || battleId
                        ? "ব্যাটল শুরু হচ্ছে…"
                        : "ম্যাচের জন্য প্রস্তুত."
            );
        };
        const onDisconnect = () => {
            setSocketReady(false);
            if (!disposed && !connectionFailureRef.current && !socket.active) scheduleReconnect();
        };
        const onConnectError = (event) => {
            setSocketReady(false);
            if (event.data?.code === "AUTHENTICATION_FAILED") {
                if (authRefreshRef.current) return;
                const refreshPromise = authApi.refresh();
                authRefreshRef.current = refreshPromise;
                refreshPromise
                    .then(() => {
                        if (disposed) return;
                        connectionFailureRef.current = null;
                        reconnectAttemptRef.current = 0;
                        if (!socket.connected) socket.connect();
                    })
                    .catch((refreshError) => {
                        if (disposed) return;
                        if (refreshError.status && refreshError.status < 500 && refreshError.status !== 429) {
                            const failure = new Error("সেশন শেষ হয়েছে। আবার লগইন করে ব্যাটলে ফিরুন।");
                            connectionFailureRef.current = failure;
                            setError(failure.message);
                            connectionWaitRejectRef.current?.(failure);
                            socket.disconnect();
                            return;
                        }
                        scheduleReconnect();
                    })
                    .finally(() => { authRefreshRef.current = null; });
                return;
            }
            if (event.data?.retryable || event.message?.includes("already connected") || !socket.active) {
                scheduleReconnect();
            }
        };
        const onOnline = () => {
            if (!socket.connected && !socket.active) scheduleReconnect();
        };
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);
        window.addEventListener("online", onOnline);
        socket.on("CHAT_CONFIG", (data) => setConfig((old) => ({ ...old, ...data })));
        socket.on("NO_OPPONENT_FOUND", (data) => {
            if (
                cancelledRequestIdsRef.current.has(data?.searchId) ||
                (data?.searchId && data.searchId !== matchSearchIdRef.current)
            ) return;
            matchRequestIdRef.current = null;
            matchSearchIdRef.current = null;
            serverSearchStartedRef.current = false;
            cancelRequestedRef.current = false;
            setPhase("idle");
            setStatus("কোনো প্রতিপক্ষ পাওয়া যায়নি। প্রস্তুত হলে আবার চেষ্টা করুন।");
            setError("");
        });
        socket.on("STARTING_BATTLE", (data) => {
            if (cancelledBattleIdsRef.current.has(data?.battleId)) return;
            if (cancelledRequestIdsRef.current.has(data?.requestId)) return;
            const isFriendContext = friendContextRef.current;
            if (!isFriendContext) {
                if (data?.requestId && data.requestId !== matchRequestIdRef.current) return;
                if (data?.requestId && !matchRequestIdRef.current) return;
            }
            setBattle(data);
            setFinal(null);
            setMessages([]);
            setPhase("starting");
            setStatus("আপনার প্রতিপক্ষ প্রস্তুত।");
            setError("");
            if (isFriendContext) {
                setFriendInvite(null);
                setFriendChallengeState("idle");
            }
        });
        socket.on("BATTLE_STATE_SNAPSHOT", (data) => {
            if (cancelledBattleIdsRef.current.has(data?.battleId)) return;
            setBattle(data); setQuestion(data.question); setQuestionIndex(data.current_index ?? 0);
            setSeconds(Number(data.timeout_seconds ?? configRef.current.timeout));
            setSelected(data.hasAnswered ? "submitted" : null);
            setAnsweredUsers(data.hasAnswered ? { [data.yourUserId]: true } : {}); setAnswerResults({}); setMessages(uniqueChatMessages(data.chat));
            setPhase(data.phase === "active" ? "active" : data.phase === "finalizing" ? "starting" : "active");
            setDisconnected(false);
        });
        socket.on("NEXT_QUESTION", (data) => {
            if (cancelledBattleIdsRef.current.has(data?.battleId)) return;
            const showNextQuestion = () => {
                answerPendingRef.current = false;
                setQuestion(data.question); setQuestionIndex(data.index); setSelected(null); setAnswerState(null);
                matchRequestIdRef.current = null;
                serverSearchStartedRef.current = false;
                setSeconds(Number(data.timeout_seconds ?? configRef.current.timeout)); setAnsweredUsers({}); setAnswerResults({}); setPhase("active"); setStatus("");
            };
            clearTimeout(nextQuestionTimerRef.current);
            if (selectedRef.current && (answerStateRef.current?.resolved || answerStateRef.current?.pending)) {
                nextQuestionTimerRef.current = setTimeout(showNextQuestion, ANSWER_FEEDBACK_MS);
                return;
            }
            showNextQuestion();
        });
        socket.on("MATCHMAKING_CANCELLED", (data) => {
            if (
                data?.requestId &&
                data.requestId !== matchRequestIdRef.current &&
                data.battleId !== battleIdRef.current
            ) return;
            if (data?.requestId) cancelledRequestIdsRef.current.add(data.requestId);
            if (data?.battleId) cancelledBattleIdsRef.current.add(data.battleId);
            matchAbortRef.current?.abort();
            matchRequestIdRef.current = null;
            serverSearchStartedRef.current = false;
            cancelRequestedRef.current = false;
            setBattle(null);
            setQuestion(null);
            setPhase("idle");
            setStatus("");
            setError("");
        });
        socket.on("PLAYER_ANSWERED", (data) => {
            setAnsweredUsers((old) => ({ ...old, [data.userId]: true }));
            if (typeof data.correct === "boolean") setAnswerResults((old) => ({ ...old, [data.userId]: data.correct }));
            if (data.userId !== meRef.current && typeof data.correct === "boolean") {
                if (data.correct) {
                    setBattle((old) => {
                        if (!old) return old;
                        return {
                            ...old,
                            scores: {
                                ...(old.scores || {}),
                                [data.userId]: Number(old.scores?.[data.userId] || 0) + 1
                            }
                        };
                    });
                }
                setStatus(data.correct ? "আপনার প্রতিপক্ষ সঠিক উত্তর দিয়েছেন।" : "আপনার প্রতিপক্ষের উত্তর ভুল হয়েছে।");
            }
        });
        socket.on("ROUND_TIMEOUT", () => { setStatus("সময় শেষ। পরের রাউন্ডে যাওয়া হচ্ছে…"); setAnswerState((old) => old || { timeout: true }); });
        socket.on("USER_DISCONNECTED", (data) => { setDisconnected(data.userId !== meRef.current); setStatus("প্রতিপক্ষের সংযোগ বিচ্ছিন্ন হয়েছে। কিছুক্ষণ অপেক্ষা করুন…"); });
        socket.on("USER_RECONNECTED", (data) => { setDisconnected(false); setStatus(data.userId !== meRef.current ? "আপনার প্রতিপক্ষ ফিরে এসেছেন।" : "সংযোগ আবার চালু হয়েছে।"); });
        socket.on("CHAT_MESSAGE", (message) => {
            setMessages((old) => uniqueChatMessages([...old, message]));
            if (!chatOpenRef.current) setUnreadMessages((old) => old + 1);
        });
        socket.on("display_typing", (data) => {
            if (data?.userId !== meRef.current) {
                setStatus(data?.isTyping ? "আপনার প্রতিপক্ষ লিখছেন…" : "");
            }
        });
        socket.on("FINALIZE_BATTLE", (data) => { setFinal(data); setPhase("finished"); setQuestion(null); setSelected(null); setStatus(""); });
        socket.on("BATTLE_ERROR", (data) => {
            setError(data.message || "ব্যাটল চালিয়ে যাওয়া যায়নি।");
            setDisconnected(false);
            setStatus("");
            setPhase("idle");
            if (friendContextRef.current) {
                setFriendInvite(null);
                setFriendChallengeState("idle");
            }
        });
        socket.on("FRIEND_BATTLE_REJECTED", () => {
            if (!friendContextRef.current) return;
            setFriendInvite(null);
            setFriendChallengeState("idle");
            setPhase("idle");
            setStatus("বন্ধু ব্যাটল অনুরোধটি প্রত্যাখ্যান করেছেন।");
            setError("");
        });
        return () => {
            disposed = true;
            matchAbortRef.current?.abort();
            clearTimeout(reconnectTimerRef.current);
            clearInterval(timerRef.current);
            clearTimeout(nextQuestionTimerRef.current);
            window.removeEventListener("online", onOnline);
            socket.disconnect();
            socket.removeAllListeners();
            if (socketRef.current === socket) socketRef.current = null;
        };
    }, []);

    useEffect(() => {
        clearInterval(timerRef.current);
        if (phase !== "active") return undefined;
        timerRef.current = setInterval(() => setSeconds((old) => Math.max(0, old - 0.1)), 100);
        return () => clearInterval(timerRef.current);
    }, [phase, questionIndex, selected]);

    const findOpponent = async (targetChapter = chapter) => {
        if (matchRequestRef.current || !selectedSubject || !subject) return;
        const socket = socketRef.current;
        if (!socket) {
            setError("অ্যারেনা প্রস্তুত করা যাচ্ছে না। একটু পর আবার চেষ্টা করুন।");
            return;
        }

        const controller = new AbortController();
        const requestId = createMatchRequestId();
        matchRequestRef.current = controller;
        matchAbortRef.current = controller;
        matchRequestIdRef.current = requestId;
        serverSearchStartedRef.current = false;
        cancelRequestedRef.current = false;
        setError("");
        setStatus("অ্যারেনা প্রস্তুত হচ্ছে…");
        setPhase("searching");
        try {
            await waitForSocketConnection(
                socket,
                controller.signal,
                connectionFailureRef,
                connectionWaitRejectRef
            );
            if (controller.signal.aborted) return;

            setStatus("প্রতিপক্ষ খোঁজা হচ্ছে…");
            const request = () => api("/battle/start", {
                method: "POST",
                body: JSON.stringify({
                    subject_code: subject,
                    chapter: Number(targetChapter),
                    request_id: requestId
                }),
                signal: controller.signal
            });
            let response;
            serverSearchStartedRef.current = true;
            let pendingRequest = request();
            try {
                response = await pendingRequest;
            } catch (requestError) {
                if (cancelRequestedRef.current) throw requestError;
                if (requestError.status !== 409 || !/battle socket/i.test(requestError.message)) {
                    throw requestError;
                }
                serverSearchStartedRef.current = false;
                setStatus("অ্যারেনা আবার প্রস্তুত হচ্ছে…");
                await waitForSocketConnection(
                    socket,
                    controller.signal,
                    connectionFailureRef,
                    connectionWaitRejectRef
                );
                if (controller.signal.aborted) return;
                serverSearchStartedRef.current = true;
                pendingRequest = request();
                response = await pendingRequest;
            }
            if (!cancelRequestedRef.current) {
                matchSearchIdRef.current = response.data?.searchId || matchSearchIdRef.current;
                setStatus(response.data?.status === "matched"
                    ? "প্রতিপক্ষ পাওয়া গেছে। অ্যারেনা প্রস্তুত হচ্ছে…"
                    : "প্রতিপক্ষের জন্য অপেক্ষা করছি…");
            }
        } catch (requestError) {
            if (controller.signal.aborted || requestError.name === "AbortError") return;
            if (matchRequestIdRef.current === requestId) matchRequestIdRef.current = null;
            serverSearchStartedRef.current = false;
            setStatus("");
            setError(requestError.message || "ম্যাচ শুরু করা যায়নি। আবার চেষ্টা করুন।");
            setPhase("idle");
        } finally {
            if (matchRequestRef.current === controller) matchRequestRef.current = null;
            if (matchAbortRef.current === controller) matchAbortRef.current = null;
        }
    };

    const cancelSearch = () => {
        if (phaseRef.current !== "searching" && phaseRef.current !== "starting") return;
        const requestId = matchRequestIdRef.current;
        const controller = matchRequestRef.current;
        if (requestId) cancelledRequestIdsRef.current.add(requestId);
        if (matchSearchIdRef.current) cancelledRequestIdsRef.current.add(matchSearchIdRef.current);
        cancelRequestedRef.current = true;

        controller?.abort();
        if (matchRequestRef.current === controller) matchRequestRef.current = null;
        if (matchAbortRef.current === controller) matchAbortRef.current = null;
        matchRequestIdRef.current = null;
        matchSearchIdRef.current = null;
        serverSearchStartedRef.current = false;
        setPhase("idle");
        setBattle(null);
        setQuestion(null);
        setError("");
        setStatus("");
        if (!requestId) return;

        const cancelInBackground = async () => {
            const socket = socketRef.current;
            for (let attempt = 0; attempt < 4; attempt += 1) {
                if (socket?.connected) {
                    try {
                        const result = await new Promise((resolve, reject) => {
                            socket.timeout(1200).emit(
                                "CANCEL_MATCHMAKING",
                                { request_id: requestId },
                                (timeoutError, response) => {
                                    if (timeoutError) reject(timeoutError);
                                    else if (!response?.success) reject(new Error("Cancellation was rejected."));
                                    else resolve(response);
                                }
                            );
                        });
                        if (result?.battleId) cancelledBattleIdsRef.current.add(result.battleId);
                        if (["cancelled", "idle", "stale", "matched"].includes(result?.status)) return;
                    } catch {
                        // Try the HTTP endpoint if the socket cancellation is unavailable.
                    }
                }

                try {
                    const response = await api("/battle/cancel-search", {
                        method: "POST",
                        body: JSON.stringify({ request_id: requestId })
                    });
                    const result = response.data;
                    if (result?.battleId) cancelledBattleIdsRef.current.add(result.battleId);
                    if (["cancelled", "idle", "stale", "matched"].includes(result?.status)) return;
                } catch {
                    // Retry both transports silently; the UI has already returned to the picker.
                }
                await wait(250 * (2 ** attempt));
            }
        };
        void cancelInBackground();
    };

    const selectSubject = (nextSubject) => {
        const firstPaper = nextSubject.papers[0];
        const firstSectionChapter = firstPaper.shortCode === "BNG" && firstPaper.paper === 1
            ? firstPaper.chapterSections?.findIndex((section) => section === "prose")
            : -1;
        setSelectedSubject(nextSubject);
        setSubject(firstPaper.code);
        setChapter(String(firstPaper.chapterNumbers[firstSectionChapter >= 0 ? firstSectionChapter : 0] ?? 1));
        setSelectedChapterSection("prose");
        setStatus("");
        setError("");
    };

    const selectPaper = (paper) => {
        const firstSectionChapter = paper.shortCode === "BNG" && paper.paper === 1
            ? paper.chapterSections?.findIndex((section) => section === "prose")
            : -1;
        setSubject(paper.code);
        setChapter(String(paper.chapterNumbers[firstSectionChapter >= 0 ? firstSectionChapter : 0] ?? 1));
        setSelectedChapterSection("prose");
        setStatus("");
        setError("");
    };

    const startRandomChapter = () => {
        if (!selectedPaper?.chapterNumbers.length) return;
        const randomIndex = Math.floor(Math.random() * selectedPaper.chapterNumbers.length);
        const randomChapter = String(selectedPaper.chapterNumbers[randomIndex]);
        setChapter(randomChapter);
        void findOpponent(randomChapter);
    };

    const challengeFriend = async (targetChapter = chapter) => {
        if (!friendId || !selectedSubject || !subject || friendChallengeState === "sending") return;
        setFriendChallengeState("sending");
        setError("");
        try {
            const response = await api("/friend-battles", {
                method: "POST",
                body: JSON.stringify({
                    user_id: friendId,
                    subject_code: subject,
                    chapter: Number(targetChapter)
                })
            });
            setFriendChallengeState("sent");
            setFriendInvite({
                requestId: response.data.requestId,
                expiresAt: new Date(response.data.expiresAt).getTime()
            });
            setStatus("ব্যাটল অনুরোধ পাঠানো হয়েছে। বন্ধু গ্রহণ করলে ব্যাটল শুরু হবে।");
        } catch (requestError) {
            setFriendChallengeState("idle");
            setError(requestError.message || "বন্ধুকে ব্যাটল অনুরোধ পাঠানো যায়নি।");
        }
    };

    useEffect(() => {
        if (!friendInvite) {
            setFriendInviteRemaining(0);
            return undefined;
        }
        const tick = () => {
            const secs = Math.max(0, Math.ceil((friendInvite.expiresAt - Date.now()) / 1000));
            setFriendInviteRemaining(secs);
            if (secs <= 0) {
                setFriendInvite(null);
                setFriendChallengeState("idle");
                setStatus("ব্যাটল অনুরোধের সময় শেষ হয়েছে।");
            }
        };
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [friendInvite]);

    const cancelFriendChallenge = async () => {
        if (!friendInvite) return;
        const requestId = friendInvite.requestId;
        setFriendInvite(null);
        setFriendChallengeState("idle");
        setStatus("");
        try {
            await api(`/friend-battles/${requestId}/cancel`, { method: "POST" });
        } catch {
            /* best-effort — invite may have expired */
        }
    };

    const submitAnswer = (answer) => {
        const socket = socketRef.current;
        if (!socket || !socket.connected || selected || answerPendingRef.current || phase !== "active") {
            if (phase === "active" && (!socket || !socket.connected)) setError("সংযোগ প্রস্তুত নয়। একটু পরে আবার উত্তর দিন।");
            return;
        }
        const submittedIndex = questionIndex;
        const submittedBattleId = battle?.battleId;
        answerPendingRef.current = true;
        setSelected(answer); setAnswerState({ pending: true });
        socket.timeout(10000).emit("SUBMIT_ANSWER", { question_index: submittedIndex, answer }, (timeoutError, response) => {
            if (battleIdRef.current !== submittedBattleId || questionIndexRef.current !== submittedIndex) {
                answerPendingRef.current = false;
                return;
            }
            if (timeoutError) {
                answerPendingRef.current = false;
                setSelected(null);
                setAnswerState({ error: "সার্ভার উত্তরটি নিশ্চিত করেনি। আবার চেষ্টা করুন।" });
                return;
            }
            if (!response?.success) {
                answerPendingRef.current = false;
                if (response?.message?.toLowerCase().includes("already answered")) {
                    setAnswerState({ pending: false, resolved: true, message: "উত্তর আগেই জমা হয়েছে। পরের রাউন্ডের অপেক্ষা করুন।" });
                } else {
                    setSelected(null);
                    setAnswerState({ error: response?.message || "উত্তরটি গ্রহণ করা হয়নি।" });
                }
                return;
            }
            setAnswerState({ correct: response.correct === true, correctAnswer: response.correct_answer, resolved: true });
            setAnsweredUsers((old) => ({ ...old, [me]: true }));
            setAnswerResults((old) => ({ ...old, [me]: response.correct === true }));
            if (response.correct === true) {
                setBattle((old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        scores: {
                            ...(old.scores || {}),
                            [me]: Number(old.scores?.[me] || 0) + 1
                        }
                    };
                });
            }
        });
    };

    // UI-only extension: an optional literal message lets quick-phrase chips send in one tap.
    // The emitted socket payload is unchanged.
    const sendChat = (overrideText) => {
        const usingOverride = typeof overrideText === "string";
        const message = (usingOverride ? overrideText : chatText).trim();
        if (!message || !socketRef.current || chatSending || chatPendingRef.current) return;
        chatPendingRef.current = true;
        setChatSending(true);
        const clientMessageId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        socketRef.current.timeout(10000).emit("SEND_CHAT_MESSAGE", { message, client_message_id: clientMessageId }, (timeoutError, response) => {
            if (timeoutError) {
                setError("চ্যাট সার্ভার বার্তাটি নিশ্চিত করেনি।");
                chatPendingRef.current = false;
                setChatSending(false);
                return;
            }
            if (!response?.success) {
                setError(response?.message || "বার্তা পাঠানো যায়নি।");
                chatPendingRef.current = false;
                setChatSending(false);
                return;
            }
            if (!usingOverride) setChatText("");
            chatPendingRef.current = false;
            setChatSending(false);
        });
    };

    const requestOpponentFriend = async () => {
        if (!opponent?.userId || opponent.isBot || friendRequestState === "sending") return;
        setFriendRequestState("sending");
        setError("");
        try {
            await api(`/users/${opponent.userId}/friend-request`, { method: "POST", body: JSON.stringify({}) });
            setOpponentFriendRelation({ status: "requested", requestedBy: me });
            setFriendRequestState("sent");
        } catch (requestError) {
            setFriendRequestState("idle");
            setError(requestError.message || "বন্ধুত্বের অনুরোধ পাঠানো যায়নি।");
        }
    };

    const quit = () => {
        setIsQuitConfirmOpen(false);
        socketRef.current?.emit("QUIT_BATTLE", {}, (response) => {
            if (!response?.success) setError(response?.message || "ব্যাটল থেকে বের হওয়া যাচ্ছে না।");
        });
    };

    const ownAvatar = ownPlayer?.avatar_url || ownPlayer?.avatar?.url || ownPlayer?.avatar || ownPlayer?.avatarUrl || ownPlayer?.profileImage || ownPlayer?.image?.url || "/avatar-placeholder.png";
    const opponentAvatar = opponent?.avatar_url || opponent?.avatar?.url || opponent?.avatar || opponent?.avatarUrl || opponent?.profileImage || opponent?.image?.url || "/avatar-placeholder.png";

    if (phase === "idle" || phase === "searching" || phase === "starting") {
        const searching = phase === "searching";
        const starting = phase === "starting";
        return <main className="mx-auto max-w-6xl">
            <header className="mb-2 flex items-start justify-between gap-2 sm:mb-0 sm:gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">Battle</h1>
                    <p className="mt-0.5 text-xs text-zinc-400 sm:mt-1 sm:text-sm">পড়ালেখা তো জিরো, দেখি আন্দাজে কয়টা লাগে!</p>
                </div>
                <div className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] shadow-[0_0_15px_rgba(16,185,129,0.12)] sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-xs ${socketReady ? "border-emerald-500/30 bg-[#14161b] text-emerald-400" : "border-orange-500/30 bg-[#14161b] text-orange-300"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${socketReady ? "animate-pulse bg-emerald-400" : "animate-pulse bg-orange-400"}`}/>
                    {socketReady ? "সার্ভার সংযুক্ত" : "অ্যারেনা প্রস্তুত হচ্ছে"}
                </div>
            </header>

            <section className="relative mx-auto mt-2 max-w-6xl bg-[#111318] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:mt-6 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-white/10 sm:border-t-2 sm:border-t-rose-500/70 sm:p-7 md:p-10">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.14),rgba(249,115,22,0.06),transparent_60%)]"/>
                <div className="relative">
                    {error && <div role="alert" className="mb-3 rounded-xl border border-rose-400/25 bg-rose-400/10 p-2.5 text-xs text-rose-200 sm:mb-5 sm:p-3 sm:text-sm">{error}</div>}
                    {searching && <div className="mx-auto flex min-h-[58vh] max-w-xl flex-col items-center justify-center py-6 text-center sm:min-h-[420px] sm:py-12">
                        <div className="relative mb-5 grid h-32 w-32 place-items-center sm:mb-8 sm:h-36 sm:w-36">
                            <span className="absolute inset-0 animate-ping rounded-full border border-rose-400/20"/>
                            <span className="absolute inset-3 rounded-full border border-orange-400/25"/>
                            <span className="absolute inset-5 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-rose-300/25"/>
                            <span className="grid h-20 w-20 place-items-center rounded-3xl border border-rose-300/30 bg-gradient-to-br from-rose-500/20 to-orange-500/10 text-rose-200 shadow-[0_0_40px_rgba(244,63,94,0.2)]">
                                <Swords size={34} className="animate-pulse"/>
                            </span>
                            <span className="absolute right-4 top-8 h-2.5 w-2.5 animate-pulse rounded-full bg-orange-300 shadow-[0_0_18px_rgba(251,146,60,.8)]"/>
                        </div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-rose-300">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400"/>
                            {socketReady ? "অ্যারেনা লাইভ" : "অ্যারেনা প্রস্তুত হচ্ছে"}
                        </div>
                        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                            {socketReady ? "প্রতিপক্ষ খোঁজা হচ্ছে" : "অ্যারেনা প্রস্তুত হচ্ছে"}
                        </h2>
                        <p className="mx-auto mt-3 max-w-[260px] text-xs leading-relaxed text-zinc-400 sm:max-w-md sm:text-sm sm:leading-6">
                            {socketReady ? "ম্যাচ পাওয়া মাত্রই আপনাকে লড়াইয়ে নিয়ে যাওয়া হবে।" : "একটু অপেক্ষা করুন—সংযোগ তৈরি হলেই খোঁজা শুরু হবে।"}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[.04] px-3 py-1.5 text-[11px] text-zinc-300 sm:mt-6 sm:gap-2 sm:rounded-full sm:px-4 sm:py-2 sm:text-xs">
                            <span>{selectedSubject?.name}</span>
                            <span className="text-white/25">·</span>
                            <span>{selectedPaper?.paper === 2 ? "২য় পত্র" : "১ম পত্র"}</span>
                            <span className="text-white/25">·</span>
                            <span>অধ্যায় {formatBanglaNumber(Number(chapter))}{selectedChapterName ? ` · ${selectedChapterName}` : ""}</span>
                        </div>
                        <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
                            {[0, 1, 2, 3, 4].map((item) => <span key={item} className="h-1 w-6 animate-pulse rounded-full bg-gradient-to-r from-rose-500/30 to-orange-500/30 sm:w-8" style={{ animationDelay: `${item * 140}ms` }}/>)}
                        </div>
                        <button
                            type="button"
                            onClick={cancelSearch}
                            className="mt-5 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl border border-rose-300/30 bg-[#3b1420] px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] hover:bg-[#511a2a] sm:mt-8 sm:w-auto sm:rounded-xl"
                        ><X size={16}/>খোঁজা বাতিল করুন</button>
                    </div>}

                    {starting && <div className="mx-auto flex min-h-[58vh] max-w-xl flex-col items-center justify-center py-6 text-center sm:min-h-[420px] sm:py-12">
                        <div className="mb-5 grid h-20 w-20 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/[.08] text-emerald-300 shadow-[0_0_45px_rgba(16,185,129,0.15)] sm:mb-6 sm:h-24 sm:w-24">
                            <Sparkles size={32} className="animate-pulse sm:h-9 sm:w-9"/>
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-300">প্রতিপক্ষ পাওয়া গেছে</div>
                        <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">অ্যারেনায় প্রবেশ করছেন</h2>
                        <p className="mt-3 px-2 text-xs text-zinc-400 sm:text-sm">প্রশ্ন আর রাউন্ড প্রস্তুত হচ্ছে—লড়াই শুরু হতে আর বেশি দেরি নেই।</p>
                        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#171a21] px-3 py-3 sm:mt-7 sm:gap-4 sm:px-5 sm:py-4">
                            <span className="max-w-[90px] truncate text-xs font-semibold text-white sm:max-w-32 sm:text-sm">{ownPlayer?.username || "আপনি"}</span>
                            <span className="rounded-full bg-gradient-to-r from-rose-600/25 to-orange-500/25 px-2.5 py-1 text-[10px] font-black text-orange-200 sm:px-3 sm:text-xs">VS</span>
                            <span className="max-w-[90px] truncate text-xs font-semibold text-white sm:max-w-32 sm:text-sm">{opponent?.username || "প্রতিপক্ষ"}</span>
                        </div>
                        <LoaderCircle size={22} className="mt-5 animate-spin text-orange-300 sm:mt-7"/>
                        <button
                            type="button"
                            onClick={cancelSearch}
                            className="mt-5 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl border border-rose-300/30 bg-[#3b1420] px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] hover:bg-[#511a2a] sm:mt-7 sm:w-auto sm:rounded-xl"
                        ><X size={16}/>ম্যাচ বাতিল করুন</button>
                    </div>}

                    {phase === "idle" && !selectedSubject && <>
                        <nav aria-label="শিক্ষা বিভাগ" className="sticky top-14 z-20 mb-3 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-[#18181c] p-1.5 backdrop-blur-xl sm:static sm:top-auto sm:z-auto sm:mb-6 sm:flex sm:gap-6 sm:overflow-x-auto sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:border-white/10 sm:bg-transparent sm:p-0 sm:pb-3 sm:backdrop-blur-none">
                            {STREAMS.map(({ id, label }) => <button
                                key={id}
                                type="button"
                                onClick={() => setStream(id)}
                                className={`relative rounded-xl border px-3 py-2 text-xs font-medium transition-colors active:scale-[0.98] sm:shrink-0 sm:rounded-none sm:border-0 sm:border-b-2 sm:px-0 sm:py-0 sm:pb-3 sm:text-sm ${stream === id ? "border-rose-500/35 bg-rose-500/15 font-bold text-rose-100 shadow-sm sm:border-rose-500 sm:bg-transparent sm:font-semibold sm:text-white sm:shadow-none" : "border-transparent text-zinc-500 hover:text-zinc-200 sm:border-transparent"}`}
                                aria-pressed={stream === id}
                            >{label}</button>)}
                        </nav>
                        {streamSubjects.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                            {streamSubjects.map((item) => <button
                                    key={item.code}
                                    type="button"
                                    onClick={() => selectSubject(item)}
                                    className={`academy-subject-card academy-subject-card-${item.shortCode} group relative isolate flex min-h-[104px] cursor-pointer items-center overflow-hidden rounded-2xl border border-white/10 p-3.5 text-left text-white transition-all duration-200 active:scale-[0.97] active:brightness-110 hover:-translate-y-0.5 hover:border-rose-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 sm:min-h-40 sm:p-6`}
                                >
                                    <SubjectArtwork code={item.shortCode} variant="battle"/>
                                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#0a0b10]/75 via-[#0a0b10]/55 to-[#0a0b10]/75"/>
                                    <span className="relative z-10 min-w-0 max-w-[78%] text-[15px] font-bold leading-snug text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] sm:max-w-none sm:pr-16 sm:text-xl sm:font-bold md:text-2xl">
                                        {item.name}
                                    </span>
                                    <ArrowLeft className="absolute bottom-3 right-3 z-10 rotate-180 text-white/70 transition-transform group-hover:translate-x-1 group-hover:text-white sm:bottom-5 sm:right-5" size={18}/>
                                </button>)}
                        </div> : <div className="rounded-xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-zinc-400">এই বিভাগে কোনো বিষয় পাওয়া যায়নি।</div>}
                    </>}

                    {phase === "idle" && selectedSubject && selectedPaper && <>
                        <div className="mb-3 space-y-2.5 sm:mb-0 sm:space-y-0 md:grid md:items-center md:gap-4 md:grid-cols-[1fr_auto_1fr]">
                            <button
                                type="button"
                                onClick={() => { setSelectedSubject(null); setStatus(""); setError(""); }}
                                className="flex w-fit items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-paper/85 transition-colors hover:bg-white/10 sm:gap-2 sm:rounded-lg sm:border sm:border-white/10 sm:bg-white/5 sm:px-3.5 sm:py-2 sm:font-medium sm:text-zinc-200"
                            ><ArrowLeft size={15}/> বিষয় পরিবর্তন</button>
                            <div className="flex items-center justify-between gap-3 md:contents">
                                <h2 className="text-left text-lg font-bold text-white sm:text-xl md:text-center">{selectedSubject.name}</h2>
                                <div className="flex w-fit shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-[#171a21] p-1 sm:justify-self-start md:justify-self-end">
                                    {[1, 2].map((paperNumber) => {
                                        const paper = selectedSubject.papers.find((item) => item.paper === paperNumber);
                                        const active = paper?.code === subject;
                                        return <button
                                            key={paperNumber}
                                            type="button"
                                            disabled={!paper}
                                            onClick={() => paper && selectPaper(paper)}
                                            className={`rounded-lg px-2.5 py-1.5 text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-30 active:scale-95 sm:px-3 sm:py-2 sm:text-xs ${active ? "bg-gradient-to-r from-rose-700 to-orange-600 font-semibold text-white shadow-md" : "text-zinc-400 hover:text-white"}`}
                                        >{paperNumber === 1 ? "১ম পত্র" : "২য় পত্র"}</button>;
                                    })}
                                </div>
                            </div>
                        </div>

                        {isBanglaFirstPaper && <section aria-label="বাংলা প্রথম পত্রের বিভাগ" className="mb-3 flex flex-wrap gap-2 sm:mb-6">
                            {BANGLA_SECTIONS.map(({ id, name }) => {
                                const active = selectedChapterSection === id;
                                const sectionChapter = selectedPaper.chapterSections?.findIndex((section) => section === id) ?? -1;
                                return <button
                                    key={id}
                                    type="button"
                                    aria-pressed={active}
                                    disabled={sectionChapter < 0}
                                    onClick={() => {
                                        if (sectionChapter < 0) return;
                                        setSelectedChapterSection(id);
                                        setChapter(String(selectedPaper.chapterNumbers[sectionChapter]));
                                        setStatus("");
                                        setError("");
                                    }}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:px-4 sm:py-2 sm:text-sm ${active ? "border-sky-200/35 bg-sky-200/[.12] text-sky-50" : "border-white/10 text-white/65 hover:border-white/20 hover:text-white"}`}
                                >{name}</button>;
                            })}
                        </section>}

                        <div className="mb-3 grid grid-cols-1 gap-2 sm:mb-8 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {visibleChapters.map(({ name, chapterNumber }) => {
                                const active = Number(chapter) === chapterNumber;
                                return <button
                                    key={`${chapterNumber}-${name}`}
                                    type="button"
                                    onClick={() => { setChapter(String(chapterNumber)); setStatus(""); setError(""); }}
                                    aria-pressed={active}
                                    className={`flex min-h-[60px] items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left transition-all active:scale-[0.99] sm:block sm:min-h-24 sm:rounded-xl sm:px-5 sm:py-5 ${active ? "border-2 border-rose-400/70 bg-gradient-to-r from-rose-500/[0.18] to-orange-500/10 font-semibold text-white shadow-[0_0_20px_rgba(244,63,94,0.18)] sm:border-rose-400 sm:from-rose-500/20 sm:to-orange-500/15 sm:shadow-[0_0_24px_rgba(244,63,94,0.24)]" : "border border-white/10 bg-[#26262a] font-medium text-paper/85 hover:border-orange-300/40 hover:bg-[#1d212a] sm:bg-[#171a21] sm:text-zinc-200"}`}
                                >
                                    <div className="min-w-0">
                                        <span className={`mb-0.5 block text-[11px] tracking-normal sm:mb-1 sm:text-xs sm:uppercase sm:tracking-[.14em] ${active ? "font-bold text-rose-300 sm:font-normal sm:text-orange-200" : "text-paper/45 sm:text-zinc-500"}`}>অধ্যায় {formatBanglaNumber(chapterNumber)}</span>
                                        <span className="block text-[15px] font-bold leading-snug sm:text-base sm:font-normal sm:leading-7 md:text-lg">{name}</span>
                                    </div>
                                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs sm:hidden ${active ? "bg-rose-500 text-white" : "border border-white/20"}`}>{active && <Check size={12}/>}</span>
                                </button>;
                            })}
                        </div>

                        {status && <div role="status" className="mb-3 rounded-xl border border-orange-400/20 bg-orange-400/[.07] px-4 py-2.5 text-center text-sm text-orange-100 sm:mb-5 sm:py-3">{status}</div>}
                        <div className="sticky bottom-[76px] z-20 mt-3 flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-rose-500/25 bg-[#1e1e24]/95 p-2.5 shadow-2xl backdrop-blur-xl sm:static sm:bottom-auto sm:z-auto sm:mt-0 sm:flex-wrap sm:items-center sm:justify-center sm:gap-3.5 sm:rounded-none sm:border-0 sm:border-t sm:border-white/10 sm:bg-transparent sm:p-0 sm:pt-5 sm:shadow-none sm:backdrop-blur-none">
                            {friendId ? <button
                                type="button"
                                onClick={() => void challengeFriend()}
                                disabled={phase !== "idle" || !selectedPaper.chapterNumbers.length || friendChallengeState !== "idle"}
                                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(244,63,94,0.35)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-12 sm:flex-none sm:gap-2 sm:from-rose-700 sm:to-orange-600 sm:px-7 sm:py-3.5 sm:shadow-lg sm:shadow-rose-600/25 sm:hover:scale-[1.02] sm:hover:from-rose-600 sm:hover:to-orange-500"
                            ><Swords size={17}/>{friendChallengeState === "sending" ? "অনুরোধ পাঠানো হচ্ছে…" : friendChallengeState === "sent" ? "অনুরোধ পাঠানো হয়েছে" : "বন্ধুকে চ্যালেঞ্জ করুন"}</button> : <button
                                type="button"
                                onClick={() => void findOpponent()}
                                disabled={phase !== "idle" || !selectedPaper.chapterNumbers.length}
                                className="flex h-12 flex-[1.45] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(244,63,94,0.35)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-12 sm:flex-none sm:gap-2 sm:from-rose-700 sm:to-orange-600 sm:px-7 sm:py-3.5 sm:shadow-lg sm:shadow-rose-600/25 sm:hover:scale-[1.02] sm:hover:from-rose-600 sm:hover:to-orange-500"
                            ><Swords size={17}/> প্রতিপক্ষ খুঁজুন</button>}
                            {!friendId && <button
                                type="button"
                                onClick={startRandomChapter}
                                disabled={phase !== "idle" || !selectedPaper.chapterNumbers.length}
                                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-xs font-semibold text-paper/90 transition active:scale-95 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-12 sm:flex-none sm:gap-2 sm:border-white/15 sm:bg-[#171a21] sm:px-5 sm:py-3.5 sm:text-sm sm:font-medium sm:text-zinc-200 sm:hover:bg-[#1f242e]"
                            ><Sparkles size={16}/> র‍্যান্ডম অধ্যায়</button>}
                        </div>
                        {friendChallengeState === "sent" && friendInvite && (
                            <div className="mt-3 flex w-full flex-col items-center gap-2 rounded-2xl border border-orange-500/25 bg-orange-500/[.05] px-3 py-2.5 sm:mt-4 sm:gap-3 sm:px-4 sm:py-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-orange-300/80 sm:text-xs">বন্ধুর উত্তরের অপেক্ষায়</span>
                                    <span className="bangla-digits rounded-full bg-orange-500/20 px-2.5 py-1 text-xs font-bold text-orange-200 sm:px-3 sm:text-sm">
                                        {formatBanglaNumber(friendInviteRemaining)} সেকেন্ড
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={cancelFriendChallenge}
                                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                                >
                                    অনুরোধ বাতিল করুন
                                </button>
                            </div>
                        )}
                    </>}
                </div>
            </section>
        </main>;
    }

    if (phase === "finished" && final) {
        const result = final.playerResults?.[me] || {};
        const myScore = Number(final.scores?.[me] || 0);
        const rivalScore = Number(final.scores?.[opponent?.userId] || 0);
        const won = myScore > rivalScore;
        const draw = myScore === rivalScore;
        const accuracy = Math.max(0, Math.min(100, Number(result.accuracy || 0)));
        const earnedPoints = Number.isFinite(Number(result.matchPoints)) ? Number(result.matchPoints) : 0;
        const forfeitPenalty = Number.isFinite(Number(result.forfeitPenalty)) ? Number(result.forfeitPenalty) : 0;
        const netPoints = earnedPoints - forfeitPenalty;
        const relationStatus = opponentFriendRelation?.status;
        const iRequested = relationStatus === "requested"
            && String(opponentFriendRelation.requestedBy) === String(me);
        return <div className="mx-auto w-full max-w-5xl px-3 pb-24 pt-3 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
            <div className="mb-3 flex items-center justify-between">
                <button className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-paper/85 transition-colors hover:bg-white/10 sm:gap-2 sm:border sm:border-white/10 sm:bg-[#14161b] sm:px-4 sm:py-2 sm:font-medium sm:text-zinc-300" onClick={() => { setPhase("idle"); setBattle(null); setFinal(null); }}><ArrowLeft size={15}/> নতুন ব্যাটল</button>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400 sm:px-3.5 sm:py-1.5 sm:text-xs">ব্যাটল শেষ</span>
            </div>
            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111318] p-4 shadow-2xl sm:p-8 lg:p-10">
                <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,${won ? "rgba(16,185,129,0.20)" : draw ? "rgba(245,158,11,0.16)" : "rgba(244,63,94,0.20)"},transparent_70%)]`}/>
                <div className="relative text-center">
                    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border bg-[#171a21] shadow-[0_0_25px_rgba(244,63,94,0.25)] sm:h-14 sm:w-14 ${won ? "border-emerald-500/35 text-emerald-300" : draw ? "border-amber-500/35 text-amber-300" : "border-rose-500/35 text-rose-300"}`}><Swords size={22} className="sm:hidden"/><Swords size={25} className="hidden sm:block"/></div>
                    <h1 className="mx-auto mt-2.5 max-w-[280px] px-1 text-xl font-extrabold leading-tight text-white sm:mt-3 sm:max-w-none sm:text-3xl md:text-4xl">{draw ? "বাল খেলছো!" : won ? "তুই-ই আসল পুরুষ!" : "তোর দ্বারা কিছুই সম্ভব না.."}</h1>
                </div>
                {error && <div role="alert" className="relative mb-3 mt-3 rounded-xl border border-rose-400/25 bg-rose-400/10 p-2.5 text-xs text-rose-200 sm:mb-5 sm:p-3 sm:text-sm">{error}</div>}

                <div className="relative mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-4">
                    {[{ player: ownPlayer, score: myScore, own: true, winner: won }, { player: opponent, score: rivalScore, own: false, winner: !draw && !won }].map(({ player, score, own, winner }) => {
                        const avatar = player?.avatar_url || player?.avatar?.url || player?.avatar || "";
                        return <div key={own ? "own" : "opponent"} className={`flex flex-col items-center gap-1.5 rounded-2xl border bg-[#15181e] p-3 text-center sm:gap-2 sm:p-5 ${winner ? "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]" : "border-white/10"}`}>
                            <div className="relative">
                                <img src={avatar || "/avatar-placeholder.png"} alt="" className={`h-12 w-12 rounded-full border object-cover sm:h-16 sm:w-16 ${winner ? "border-amber-400/60 ring-2 ring-amber-400/30" : "border-white/15"}`}/>
                                {winner && <Crown size={14} className="absolute -right-1 -top-1 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.7)]"/>}
                            </div>
                            <div className={`max-w-full truncate text-xs font-bold sm:text-sm ${winner ? "text-amber-200" : "text-zinc-100"}`}>{own ? "আপনি" : player?.username || "প্রতিপক্ষ"}</div>
                            <div className={`text-2xl font-black leading-none sm:text-3xl ${winner ? "text-amber-300" : "text-white"}`}>{formatBanglaNumber(score)}</div>
                            <div className={`text-[10px] sm:text-[11px] ${winner ? "text-amber-300/75" : "text-zinc-500"}`}>{own ? "আপনার ফলাফল" : winner ? "বিজয়ী" : "প্রতিপক্ষ"}</div>
                            {!own && !player?.isBot && relationStatus !== "accepted" && (iRequested || friendRequestState === "sent")
                                ? <div className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-[11px] font-medium text-emerald-400 sm:mt-2 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs"><Check size={12}/> রিকোয়েস্ট পাঠানো হয়েছে</div>
                                : !own && !player?.isBot && relationStatus === "requested" && !iRequested
                                    ? <div className="mt-1 text-center text-[11px] text-amber-300 sm:mt-2 sm:text-xs">অনুরোধ এসেছে · নোটিফিকেশন থেকে গ্রহণ করুন</div>
                                : !own && !player?.isBot && relationStatus !== "accepted" && relationStatus !== "requested"
                                    ? <button type="button" onClick={requestOpponentFriend} disabled={friendRequestState === "sending"} className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-medium text-zinc-200 transition-all hover:border-sky-500/40 hover:bg-sky-500/15 hover:text-sky-300 disabled:cursor-wait disabled:opacity-60 sm:mt-2 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs"><UserPlus size={12}/>{friendRequestState === "sending" ? "পাঠানো হচ্ছে…" : "+ ফ্রেন্ড রিকোয়েস্ট"}</button>
                                    : null}
                        </div>;
                    })}
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 lg:grid-cols-4">
                    <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300 sm:h-10 sm:w-10">
                            <Check size={16} className="sm:hidden"/>
                            <Check size={20} className="hidden sm:block"/>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-lg font-extrabold leading-none text-white sm:text-xl md:text-2xl">{formatBanglaNumber(result.correctAnswers ?? 0)}</div>
                            <div className="mt-1 truncate text-[10px] font-medium text-emerald-200/70 sm:text-xs">সঠিক</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/25 bg-rose-500/[0.07] px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-300 sm:h-10 sm:w-10">
                            <X size={16} className="sm:hidden"/>
                            <X size={20} className="hidden sm:block"/>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-lg font-extrabold leading-none text-white sm:text-xl md:text-2xl">{formatBanglaNumber(result.wrongAnswers ?? 0)}</div>
                            <div className="mt-1 truncate text-[10px] font-medium text-rose-200/70 sm:text-xs">ভুল</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.07] px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300 sm:h-10 sm:w-10">
                            <Target size={16} className="sm:hidden"/>
                            <Target size={20} className="hidden sm:block"/>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-lg font-extrabold leading-none text-cyan-200 sm:text-xl md:text-2xl">{formatBanglaNumber(accuracy)}%</div>
                            <div className="mt-1 truncate text-[10px] font-medium text-cyan-200/70 sm:text-xs">নির্ভুলতা</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-300 sm:h-10 sm:w-10">
                            <Coins size={16} className="sm:hidden"/>
                            <Coins size={20} className="hidden sm:block"/>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className={`text-lg font-extrabold leading-none sm:text-xl md:text-2xl ${netPoints < 0 ? "text-rose-300" : "text-amber-300"}`}>{netPoints > 0 ? "+" : ""}{formatBanglaNumber(netPoints)}</div>
                            <div className="mt-1 truncate text-[10px] font-medium sm:text-xs">
                                {forfeitPenalty > 0
                                    ? <span className="text-rose-300">জরিমানা −{formatBanglaNumber(forfeitPenalty)}</span>
                                    : <span className="text-amber-200/70">পয়েন্ট</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-3 space-y-2 sm:mt-5 sm:flex sm:justify-center sm:space-x-3 sm:space-y-0">
                    <button type="button" onClick={() => { setPhase("idle"); setBattle(null); setFinal(null); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-sm font-bold text-white shadow-[0_8px_24px_rgba(244,63,94,0.35)] transition-all active:scale-[0.98] hover:from-rose-600 hover:to-orange-600 sm:h-11 sm:w-auto sm:rounded-xl sm:from-rose-600 sm:to-red-600 sm:px-8 sm:py-3.5 sm:shadow-[0_8px_25px_rgba(225,29,72,0.3)] sm:hover:from-rose-500 sm:hover:to-red-500">আবার ব্যাটল খেলুন ⚔️</button>
                    <button type="button" onClick={() => { setPhase("idle"); setSelectedSubject(null); setBattle(null); setFinal(null); }} className="flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-paper/75 transition active:scale-[0.98] hover:bg-white/10 sm:hidden">অন্য বিষয় বেছে নিন</button>
                </div>
            </section>
        </div>;
    }

    return <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-3 py-2 sm:overflow-hidden sm:px-8 sm:py-6 lg:px-12">
        {/* Mobile sticky HUD — compact 3-row battle bar */}
        <div className="sticky top-14 z-30 -mx-3 mb-2 flex flex-col gap-1.5 border-b border-white/10 bg-[#1a1a1f]/95 px-3 pb-2 pt-1.5 backdrop-blur-xl md:hidden">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-rose-400">রাউন্ড</span>
                    <span className="bangla-digits rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-bold text-paper">{formatBanglaNumber(questionIndex + 1)}/১০</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={`bangla-digits text-xs font-bold ${seconds <= 10 ? "animate-pulse text-amber-300" : "text-cyan-300"}`}>{formatBanglaNumber(Math.ceil(seconds))} সে</span>
                    <button type="button" onClick={() => { setIsChatOpen((old) => !old); setUnreadMessages(0); }} className="relative grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-zinc-300 active:scale-95" aria-label="চ্যাট খুলুন">
                        <MessageCircle size={14}/>
                        {!isChatOpen && unreadMessages > 0 && <span className="bangla-digits absolute -right-1 -top-1 grid h-3.5 min-w-[14px] place-items-center rounded-full bg-sky-500 px-0.5 text-[9px] font-bold text-white">{formatBanglaNumber(unreadMessages)}</span>}
                    </button>
                    <button type="button" onClick={() => setIsQuitConfirmOpen(true)} className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-300 active:scale-95">ছাড়ুন</button>
                </div>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, (seconds / config.timeout) * 100))}%` }}/>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex min-w-0 items-center justify-between gap-1.5 rounded-lg border px-2 py-1 ${answeredUsers[me] ? (answerResults[me] ? "border-emerald-500/45 bg-emerald-500/12" : "border-rose-500/45 bg-rose-500/12") : "border-rose-500/35 bg-rose-500/12"}`}>
                    <div className="flex min-w-0 items-center gap-1.5">
                        <img src={ownAvatar} alt="" className="h-5 w-5 shrink-0 rounded-full border border-rose-500/40 object-cover"/>
                        <span className="truncate text-[10px] font-bold text-white">আপনি</span>
                    </div>
                    <span className="bangla-digits text-sm font-extrabold text-sky-300">{formatBanglaNumber(ownScore)}</span>
                </div>
                <div className={`flex min-w-0 items-center justify-between gap-1.5 rounded-lg border px-2 py-1 ${answeredUsers[opponent?.userId] ? (answerResults[opponent?.userId] ? "border-emerald-500/45 bg-emerald-500/12" : "border-rose-500/45 bg-rose-500/12") : "border-emerald-500/35 bg-emerald-500/12"}`}>
                    <span className="bangla-digits text-sm font-extrabold text-emerald-300">{formatBanglaNumber(opponentScore)}</span>
                    <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[10px] font-bold text-white">{opponent?.username || "প্রতিপক্ষ"}</span>
                        <img src={opponentAvatar} alt="" className="h-5 w-5 shrink-0 rounded-full border border-emerald-500/40 object-cover"/>
                    </div>
                </div>
            </div>
        </div>

        {/* Desktop top bar (hidden below md) */}
        <div className="mx-auto hidden w-full max-w-5xl items-center gap-4 md:flex sm:gap-5">
            <button type="button" onClick={() => setIsQuitConfirmOpen(true)} className="shrink-0 rounded-xl border border-rose-500/25 bg-[#111318] px-3.5 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/15 sm:text-sm">ব্যাটল ছাড়ুন</button>
            <div className="flex flex-1 items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full border border-white/10 bg-[#14161b]"><div className="h-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.45)] transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, (seconds / config.timeout) * 100))}%` }}/></div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-200 sm:text-sm">{formatBanglaNumber(Math.ceil(seconds))} সেকেন্ড</span>
            </div>
            <span className="shrink-0 rounded-xl border border-white/10 bg-[#111318] px-3.5 py-2 text-xs font-semibold text-zinc-300 sm:text-sm">{formatBanglaNumber(questionIndex + 1)}/১০</span>
        </div>
        {error && <div className="mb-2 shrink-0 rounded-xl border border-red-400/25 bg-red-400/10 p-2.5 text-xs text-red-200 sm:mb-4 sm:p-3 sm:text-sm">{error}</div>}
        {disconnected && <div className="mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 p-2.5 text-xs text-red-200 sm:mb-4 sm:p-3 sm:text-sm"><Wifi size={16}/> {status || "প্রতিপক্ষের সংযোগ বিচ্ছিন্ন হয়েছে।"}</div>}
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col py-1 sm:py-4">
            <main className="flex w-full flex-1 flex-col gap-2 sm:gap-4">
                {/* Desktop bottom VS scoreboard */}
                <div className="order-2 hidden w-full items-stretch gap-3 pb-2 md:flex">
                    <div className="grid flex-1 grid-cols-2 gap-3.5">
                        <div className={`flex min-w-0 items-center gap-3 rounded-2xl border px-5 py-4 ${answeredUsers[me] ? (answerResults[me] ? "border-emerald-500/45 bg-emerald-950/35" : "border-rose-500/45 bg-rose-950/35") : ownScore > opponentScore ? "border-sky-500/40 bg-gradient-to-r from-sky-950/45 to-[#111318] shadow-[0_0_20px_rgba(14,165,233,0.1)]" : "border-white/10 bg-[#111318]"}`}>
                            <img src={ownAvatar} alt="" className="h-11 w-11 rounded-full border border-sky-500/40 object-cover"/>
                            <span className="max-w-[90px] truncate text-base font-semibold text-zinc-100 sm:max-w-[140px] sm:text-lg">আপনি</span>
                            <span className="text-2xl font-bold text-sky-400 sm:text-3xl">{formatBanglaNumber(ownScore)}</span>
                        </div>
                        <div className={`flex min-w-0 items-center justify-end gap-3 rounded-2xl border px-5 py-4 ${answeredUsers[opponent?.userId] ? (answerResults[opponent?.userId] ? "border-emerald-500/45 bg-emerald-950/35" : "border-rose-500/45 bg-rose-950/35") : opponentScore > ownScore ? "border-cyan-500/40 bg-gradient-to-l from-cyan-950/45 to-[#111318] shadow-[0_0_20px_rgba(6,182,212,0.1)]" : "border-white/10 bg-[#111318]"}`}>
                            <span className={`text-2xl font-bold sm:text-3xl ${opponentScore > ownScore ? "text-cyan-400" : "text-rose-400"}`}>{formatBanglaNumber(opponentScore)}</span>
                            <span className="max-w-[90px] truncate text-base font-semibold text-zinc-100 sm:max-w-[140px] sm:text-lg">{opponent?.username || "প্রতিপক্ষ"}</span>
                            <img src={opponentAvatar} alt="" className="h-11 w-11 rounded-full border border-rose-500/40 object-cover"/>
                        </div>
                    </div>
                    <button type="button" onClick={() => { setIsChatOpen((old) => !old); setUnreadMessages(0); }} className="relative shrink-0 rounded-xl border border-white/10 bg-[#111318] px-4 text-zinc-300 transition-colors hover:bg-[#161920]" aria-label="চ্যাট খুলুন"><MessageCircle size={18}/>{!isChatOpen && unreadMessages > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"/>}</button>
                </div>
                <div className="order-1 flex w-full flex-1 flex-col rounded-2xl border border-white/10 bg-[#111318] p-3 shadow-xl sm:p-6 md:p-8">
                    {question ? <>
                        <div className="mb-1.5 shrink-0 text-[10px] text-zinc-500 sm:mb-2 sm:text-xs">প্রশ্ন {formatBanglaNumber(questionIndex + 1)} · বোর্ড প্রশ্ন</div>
                        <div className="max-h-[30vh] min-h-0 shrink-0 overflow-y-auto pr-0.5 sm:max-h-none sm:overflow-visible">
                            <McqPrompt question={question} large/>
                        </div>
                        <div className="mt-2.5 grid shrink-0 grid-cols-1 gap-2 sm:mt-4 sm:gap-3 md:grid-cols-2">{(question.options || []).map((option, index) => { const key = ANSWERS[index]; const chosen = selected === key; const correct = answerState?.resolved && (answerState.correctAnswer === key || (chosen && answerState.correctAnswer == null && answerState.correct === true)); const wrong = answerState?.resolved && chosen && answerState.correct === false; return <button key={key} disabled={Boolean(selected) || seconds <= 0} onClick={() => submitAnswer(key)} className={`flex min-h-[44px] items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-[15px] font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-90 sm:min-h-[48px] sm:gap-4 sm:px-4 sm:py-3 sm:text-base md:text-lg ${correct ? "border-emerald-500/50 bg-emerald-950/35 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.12)]" : wrong ? "border-rose-500/50 bg-rose-950/35 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.12)]" : chosen ? "border-sky-500/50 bg-sky-950/25 text-sky-200" : "border-white/10 bg-[#111318] text-zinc-200 hover:border-white/25 hover:bg-[#161920]"}`}><McqOptionBody value={option} label={key} selected={chosen} large status={correct ? "correct" : wrong ? "incorrect" : "selected"}/></button>; })}</div>
                    </> : <LoadingState compact title="পরের রাউন্ড আসছে" detail="নতুন প্রশ্ন প্রস্তুত হচ্ছে…" className="grid min-h-[280px] content-center sm:min-h-[380px]"/>}
                </div>
            </main>
            {isChatOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"><aside className="flex h-[56dvh] max-h-[80vh] min-h-0 w-full flex-col overflow-hidden rounded-t-3xl border-t border-white/15 bg-[#1e2026]/98 shadow-2xl backdrop-blur-2xl sm:h-[420px] sm:max-w-md sm:rounded-2xl sm:border sm:border-white/15 sm:bg-[#111318] sm:backdrop-blur-none">
                <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-white/20 sm:hidden"/>
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5 sm:py-3"><div><div className="flex items-center gap-2 text-sm font-bold sm:font-semibold"><MessageCircle size={16} className="text-sky-300"/>ব্যাটল চ্যাট</div><div className="mt-0.5 text-[11px] text-paper/45 sm:mt-1 sm:text-xs sm:text-paper/35">সৌহার্দ্যপূর্ণ থাকুন</div></div><div className="flex items-center gap-2"><span className="bangla-digits rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-paper/60 sm:px-2.5 sm:py-1 sm:text-xs sm:text-paper/45">{formatBanglaNumber(messages.length)}</span><button type="button" onClick={() => setIsChatOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-zinc-400 transition hover:bg-white/10 hover:text-white sm:bg-transparent" aria-label="চ্যাট বন্ধ করুন"><X size={16}/></button></div></div>
                <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/[0.05] px-3.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
                    {QUICK_PHRASES.map((phrase) => <button key={phrase} type="button" onClick={() => sendChat(phrase)} disabled={chatSending} className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-paper/85 transition active:scale-95 hover:bg-white/10 disabled:opacity-50">{phrase}</button>)}
                </div>
                <div ref={chatMessagesRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3.5 sm:p-4">{messages.length === 0 && <div className="grid h-full place-items-center px-5 text-center"><div><MessageCircle className="mx-auto mb-3 text-paper/20" size={30}/><p className="text-xs font-semibold text-paper/60 sm:text-sm">এখনো কোনো বার্তা নেই</p><p className="mt-1 text-[11px] text-paper/40 sm:text-xs">খেলার ফাঁকে শুভেচ্ছা জানান।</p></div></div>}{messages.map((message) => <div key={chatMessageKey(message)} className={`flex ${message.userId === me ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-5 shadow-sm sm:max-w-[88%] sm:px-4 sm:py-3 sm:text-sm sm:leading-6 ${message.userId === me ? "rounded-br-sm bg-[#3b82f6] text-white sm:rounded-br-md sm:bg-brass-400/20 sm:text-paper" : "rounded-bl-sm bg-[#2a2d36] text-paper/95 sm:rounded-bl-md sm:bg-white/[.06] sm:text-paper/80"}`}><div className="mb-0.5 text-[10px] font-medium tracking-wider text-white/70 sm:mb-1 sm:text-paper/35">{message.username || (message.userId === me ? "আপনি" : "প্রতিপক্ষ")}</div>{message.text || message.message}</div></div>)}</div>
                <div className="flex shrink-0 items-center gap-2 border-t border-white/[0.08] bg-[#18191e] px-3.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 sm:border-white/10 sm:bg-transparent sm:p-3"><textarea className="min-h-10 max-h-24 flex-1 resize-none rounded-xl border border-white/10 bg-[#252730] px-3.5 text-base text-white outline-none placeholder:text-paper/40 focus:border-sky-400/60 sm:rounded-2xl sm:bg-white/[.04] sm:px-3 sm:text-sm sm:text-paper sm:placeholder:text-paper/30 sm:focus:border-brass-400/50" maxLength={config.maxMessageLength} value={chatText} onChange={(event) => setChatText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendChat(); } }} placeholder="বার্তা লিখুন…"/><button className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#3b82f6] text-white transition active:scale-95 hover:bg-blue-500 disabled:opacity-40 sm:h-9 sm:w-9 sm:bg-brass-400 sm:text-ink-950 sm:hover:bg-brass-300" disabled={chatSending || !chatText.trim()} onClick={sendChat} aria-label="চ্যাট বার্তা পাঠান"><Send size={16}/></button></div>
            </aside></div>}
            {isQuitConfirmOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsQuitConfirmOpen(false); }}>
                <div role="dialog" aria-modal="true" aria-labelledby="quit-battle-title" className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#14161b] p-5 shadow-2xl">
                    <h2 id="quit-battle-title" className="text-base font-semibold text-zinc-100">ব্যাটল ছেড়ে যাবেন?</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">আপনি চলে গেলে এই ম্যাচটি শেষ হয়ে যাবে।</p>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsQuitConfirmOpen(false)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">বাতিল</button>
                        <button type="button" onClick={quit} className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/25">ছেড়ে দিন</button>
                    </div>
                </div>
            </div>}
        </div>
    </div>;
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import LoadingState from "@/components/LoadingState";
import { api } from "@/lib/api";
import { subjectByCode } from "@/lib/subjects";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import { McqOptionBody, McqPrompt } from "@/features/academy/components/McqQuestionContent";

const keys = ["ক", "খ", "গ", "ঘ"];

export default function WrongReview() {
    const { subject, chapter } = useParams();
    const info = subjectByCode(subject);
    const subjectCode = info?.code || subject;
    const chapterPosition = info?.chapterNumbers?.indexOf(Number(chapter));
    const chapterTitle = chapterPosition >= 0 ? info.chapters[chapterPosition] : "অধ্যায়ের অনুশীলন";
    const [items, setItems] = useState([]);
    const [feedback, setFeedback] = useState({});
    const [showAnswers, setShowAnswers] = useState({});
    const [pending, setPending] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const load = async (signal) => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams({
                subject_code: subjectCode,
                chapter: String(chapter),
                randomize: "true"
            });
            const body = await api(`/academic/wrong-questions?${params}`, { signal });
            if (signal?.aborted) return;
            setItems(body.data.questions || []);
            setFeedback({});
            setShowAnswers({});
        } catch (requestError) {
            if (requestError.name === "AbortError") return;
            if (requestError.status === 404) {
                setItems([]);
                return;
            }
            setError(requestError.message);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [subject, chapter]);

    const answerQuestion = async (item, answer) => {
        if (pending[item._id] || feedback[item._id]?.correct) return;
        setPending((current) => ({ ...current, [item._id]: true }));
        setError("");
        try {
            const body = await api("/academic/submit-answer", {
                method: "POST",
                body: JSON.stringify({
                    subject_code: subjectCode,
                    chapter: Number(chapter),
                    answers: [{ question_id: item._id, answer }]
                })
            });
            const result = body.data.results[0];
            setFeedback((current) => ({ ...current, [item._id]: result }));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setPending((current) => ({ ...current, [item._id]: false }));
        }
    };

    return <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500">{info?.shortName || subject} · ভুল উত্তর</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="bangla-digits rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-semibold text-sky-400">অধ্যায় {formatBanglaNumber(chapter)}</span>
                    <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{chapterTitle}</h1>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {!loading && <p className="bangla-digits mr-1 text-xs text-zinc-400">ভুল প্রশ্ন {formatBanglaNumber(items.length)}টি</p>}
                <Link href={`/academy/${subject}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/10"><ArrowLeft size={14}/> ফিরে যান</Link>
            </div>
        </header>
        {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200"><span>{error}</span><button type="button" onClick={() => load()} className="rounded-lg border border-red-200/20 bg-red-200/10 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-200/15">আবার চেষ্টা করুন</button></div>}
        {loading ? <LoadingState title="ভুল প্রশ্নগুলো খুঁজে আনা হচ্ছে" detail="প্রশ্নগুলো প্রতিবার নতুনভাবে সাজানো হচ্ছে…"/> : items.length > 0 ? <div className="space-y-4">
            {items.map((item, index) => {
                const result = feedback[item._id];
                const selectedAnswer = result?.selected_answer;
                const correctAnswer = result?.correct_answer || item.correct_answer;
                const isPending = Boolean(pending[item._id]);
                return <article key={item._id} className="rounded-2xl border border-white/10 bg-[#14161b] p-5 shadow-xl sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="bangla-digits grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/15 text-xs font-bold text-sky-400">{formatBanglaNumber(index + 1)}</span>
                        <span className="bangla-digits rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400">{item.board || "প্রশ্ন"}{item.year ? ` ${formatBanglaNumber(item.year)}` : ""}</span>
                    </div>
                    <div className="mb-5"><McqPrompt question={item}/></div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{keys.map((key, optionIndex) => {
                        if (item.options?.[optionIndex] === undefined) return null;
                        const selected = selectedAnswer === key;
                        const isCorrect = Boolean(result) && key === correctAnswer;
                        const className = isCorrect
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                            : selected && result && !result.correct
                                ? "border-rose-500/50 bg-rose-500/10 text-rose-100"
                                : "border-white/10 bg-[#191c23] text-zinc-200 hover:border-white/25 hover:bg-[#1f232c]";
                        return <button key={key} type="button" aria-pressed={selected} disabled={isPending || result?.correct} onClick={() => answerQuestion(item, key)} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3.5 text-left transition-colors duration-100 disabled:cursor-default ${className}`}>
                            <McqOptionBody value={item.options[optionIndex]} label={key} selected={selected || (Boolean(result) && isCorrect)} status={isCorrect && result ? "correct" : selected && result && !result.correct ? "incorrect" : undefined}/>
                        </button>;
                    })}</div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <button type="button" aria-expanded={Boolean(showAnswers[item._id])} onClick={() => setShowAnswers((current) => ({ ...current, [item._id]: !current[item._id] }))} className="inline-flex items-center gap-2 rounded-lg border border-sky-400/20 bg-sky-400/[.07] px-3 py-2 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-400/[.12]">
                            {showAnswers[item._id] ? <EyeOff size={15}/> : <Eye size={15}/>} {showAnswers[item._id] ? "উত্তর লুকান" : "আগের ও সঠিক উত্তর"}
                        </button>
                        {isPending && <span className="text-xs text-sky-200 animate-pulse">উত্তর সংরক্ষণ হচ্ছে…</span>}
                        {result && <span className={`text-xs ${result.correct ? "text-emerald-300" : "text-rose-300"}`}>{result.correct ? "সঠিক—প্রশ্নটি ভুলের তালিকা থেকে সরানো হয়েছে।" : "ভুল—আবার চেষ্টা করুন।"}</span>}
                    </div>
                    {showAnswers[item._id] && <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[.06] p-3">
                            <div className="text-xs font-medium text-rose-300">আগের ভুল উত্তর</div>
                            <div className="mt-2 text-sm text-zinc-100">{keys.includes(item.selected_answer) && item.options?.[keys.indexOf(item.selected_answer)] !== undefined
                                ? <McqOptionBody value={item.options[keys.indexOf(item.selected_answer)]} label={item.selected_answer} selected status="incorrect"/>
                                : item.selected_answer || "তথ্য নেই"}</div>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] p-3">
                            <div className="text-xs font-medium text-emerald-300">সঠিক উত্তর</div>
                            <div className="mt-2 text-sm text-zinc-100">{keys.includes(item.correct_answer) && item.options?.[keys.indexOf(item.correct_answer)] !== undefined
                                ? <McqOptionBody value={item.options[keys.indexOf(item.correct_answer)]} label={item.correct_answer} selected status="correct"/>
                                : item.correct_answer || "তথ্য নেই"}</div>
                        </div>
                    </div>}
                </article>;
            })}
        </div> : error ? null : <main className="flex min-h-[calc(100vh-3rem)] items-center justify-center py-8">
            <section className="mx-auto w-full max-w-lg rounded-2xl border border-emerald-500/25 bg-[#14161b] p-10 text-center shadow-[0_0_30px_rgba(16,185,129,0.08)] sm:p-12">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400"><ShieldCheck size={26}/></div>
                <h2 className="text-2xl font-bold text-white">কোনো ভুল উত্তর নেই!</h2>
                <p className="mt-1.5 text-sm text-zinc-400">সব প্রশ্নের সঠিক উত্তর দিয়েছ!</p>
            </section>
        </main>}
    </div>;
}

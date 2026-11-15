"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { subjectByCode, subjectCodeForPaper } from "@/lib/subjects";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import { McqOptionBody, McqPrompt } from "@/features/academy/components/McqQuestionContent";
import LoadingState from "@/components/LoadingState";

const keys = ["ক", "খ", "গ", "ঘ"];
const batchSizes = [5, 10, 20, 50];
const shuffle = (items) => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
};

export default function Practice() {
    const { subject, chapter } = useParams();
    const routeInfo = subjectByCode(subject);
    const [subjectCode, setSubjectCode] = useState(routeInfo?.code || subject);
    const info = subjectByCode(subjectCode);
    const chapterPosition = info?.chapterNumbers?.indexOf(Number(chapter));
    const chapterTitle = chapterPosition >= 0 ? info.chapters[chapterPosition] : undefined;
    const [subjectHref, setSubjectHref] = useState(`/academy/${subject}`);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [size, setSize] = useState(10);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const recentQuestionIds = useRef([]);

    const load = async (requestedLimit, signal, requestedSubjectCode = subjectCode) => {
        setLoading(true);
        setError("");
        setQuestions([]);
        try {
            const limit = batchSizes.includes(requestedLimit) ? requestedLimit : 10;
            const params = new URLSearchParams({
                subject_code: requestedSubjectCode,
                chapter: String(chapter),
                limit: String(limit),
                randomize: "true"
            });
            if (recentQuestionIds.current.length) params.set("exclude_ids", recentQuestionIds.current.join(","));
            const body = await api(`/academic/remaining-questions?${params}`, { signal });
            if (signal?.aborted) return;
            const nextQuestions = shuffle(body.data.questions || []);
            recentQuestionIds.current = nextQuestions.map((question) => question._id);
            setQuestions(nextQuestions);
        } catch (requestError) {
            if (requestError.name !== "AbortError") setError(requestError.message);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const requestedSubjectCode = subjectCodeForPaper(subject, params.get("paper"));
        const requestedSize = Number(params.get("size"));
        const hasStartParam = params.has("start");
        const controller = new AbortController();
        setSubjectCode(requestedSubjectCode);
        params.delete("start");
        params.delete("size");
        const subjectQuery = params.toString();
        setSubjectHref(`/academy/${subject}${subjectQuery ? `?${subjectQuery}` : ""}`);
        const selectedSize = batchSizes.includes(requestedSize) ? requestedSize : 10;
        setSize(selectedSize);
        setAnswers({});
        setResult(null);
        recentQuestionIds.current = [];
        if (hasStartParam) {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("start");
            window.history.replaceState(window.history.state, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
        }
        load(selectedSize, controller.signal, requestedSubjectCode);
        return () => controller.abort();
    }, [subject, chapter]);

    const current = useMemo(() => questions.slice(0, size), [questions, size]);
    const answeredCount = current.filter((question) => answers[question._id]).length;
    const resultById = useMemo(() => new Map((result?.results || []).map((item) => [item.question_id, item])), [result]);
    const correctCount = result?.results.filter((item) => item.correct).length || 0;
    const wrongCount = (result?.results.length || 0) - correctCount;
    const accuracy = result?.results.length ? Math.round((correctCount / result.results.length) * 100) : 0;

    const submit = async () => {
        if (submitting || answeredCount !== current.length || current.length === 0) return;
        window.scrollTo({ top: 0, behavior: "smooth" });
        setSubmitting(true);
        setError("");
        try {
            const submittedAnswers = { ...answers };
            const body = await api("/academic/submit-answer", {
                method: "POST",
                body: JSON.stringify({
                    subject_code: subjectCode,
                    chapter: Number(chapter),
                    answers: current.map((question) => ({
                        question_id: question._id,
                        answer: submittedAnswers[question._id]
                    }))
                })
            });
            setResult({ ...body.data, selectedAnswers: submittedAnswers });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-4 sm:mb-6 sm:gap-5 sm:pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500">{info?.shortName || subject}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="bangla-digits rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-semibold text-sky-400">অধ্যায় {formatBanglaNumber(chapter)}</span>
                    <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{chapterTitle || "অধ্যায়ের অনুশীলন"}</h1>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <p className="bangla-digits mr-1 w-full text-xs text-zinc-400 sm:w-auto">মোট {formatBanglaNumber(current.length)}টি · উত্তর দিয়েছেন {formatBanglaNumber(answeredCount)}/{formatBanglaNumber(current.length)}টি</p>
                <Link href={`/academy/${subjectCode}/${chapter}/wrong`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-400 transition-colors hover:bg-rose-500/20 sm:min-h-0 sm:flex-none">ভুল উত্তর অনুশীলন</Link>
                <Link href={subjectHref} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/10 sm:min-h-0 sm:flex-none"><ArrowLeft size={14}/> ফিরে যান</Link>
            </div>
        </header>
        {result && <section aria-label="এই অনুশীলনের ফলাফল" className="mb-6 grid gap-3 rounded-2xl border border-white/10 border-t-2 border-t-sky-500/50 bg-[#14161b] p-4 shadow-xl sm:grid-cols-3 sm:p-5">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.07] p-4">
                <div className="bangla-digits text-2xl font-bold text-emerald-300">{formatBanglaNumber(correctCount)}</div>
                <div className="mt-1 text-xs text-zinc-400">সঠিক উত্তর</div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[.07] p-4">
                <div className="bangla-digits text-2xl font-bold text-rose-300">{formatBanglaNumber(wrongCount)}</div>
                <div className="mt-1 text-xs text-zinc-400">ভুল উত্তর</div>
            </div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/[.07] p-4">
                <div className="bangla-digits text-2xl font-bold text-sky-300">{formatBanglaNumber(accuracy)}%</div>
                <div className="mt-1 text-xs text-zinc-400">সঠিক উত্তরের হার · {formatBanglaNumber(result.results.length)}টি প্রশ্ন</div>
            </div>
        </section>}
        {loading ? <LoadingState title="প্রশ্ন প্রস্তুত হচ্ছে" detail="আপনার জন্য নতুন প্রশ্ন সাজাচ্ছি…"/> : error ? <div role="alert" className="panel flex flex-col items-center gap-4 p-8 text-center"><p className="text-rose-300">{error}</p><button type="button" onClick={() => load(size)} className="rounded-xl bg-blue-700 px-4 py-2.5 font-medium text-white transition hover:bg-blue-600">আবার চেষ্টা করুন</button></div> : <>
            <div className="space-y-4">{current.map((question, index) => <article key={question._id} className="rounded-2xl border border-white/10 bg-[#14161b] p-4 shadow-xl sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="bangla-digits grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/15 text-xs font-bold text-sky-400">{formatBanglaNumber(index + 1)}</span>
                    <span className="bangla-digits rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-200 sm:rounded-md sm:border-white/10 sm:bg-white/5 sm:px-2.5 sm:py-1 sm:text-xs sm:font-normal sm:tracking-normal sm:text-zinc-400">{question.board || "প্রশ্ন"}{question.year ? ` ${formatBanglaNumber(question.year)}` : ""}</span>
                </div>
                <div className="mb-5"><McqPrompt question={question}/></div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{keys.map((key, optionIndex) => {
                    if (question.options?.[optionIndex] === undefined) return null;
                    const selected = answers[question._id] === key;
                    const outcome = resultById.get(question._id);
                    const isCorrect = Boolean(outcome) && outcome.correct_answer === key;
                    const isWrongSelection = Boolean(outcome) && selected && !outcome.correct;
                    const isHighlighted = selected || isCorrect;
                    const status = isCorrect ? "correct" : isWrongSelection ? "incorrect" : "selected";
                    const optionClass = isCorrect
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                        : isWrongSelection
                            ? "border-rose-500/50 bg-rose-500/10 text-rose-100"
                            : selected
                                ? "border-sky-500/50 bg-sky-500/[.12] text-white"
                                : "border-white/10 bg-[#191c23] text-zinc-200 hover:border-white/25 hover:bg-[#1f232c]";
                    return <button key={key} type="button" aria-pressed={selected} disabled={Boolean(outcome)} onClick={() => setAnswers((old) => ({ ...old, [question._id]: key }))} className={`flex min-h-[48px] min-w-0 items-center gap-3 rounded-xl border p-3.5 text-left transition-colors duration-75 disabled:cursor-default ${optionClass}`}><McqOptionBody value={question.options[optionIndex]} label={key} selected={isHighlighted} status={status}/></button>;
                })}</div>
            </article>)}
            {!loading && !current.length && <div className="panel p-10 text-center"><h2 className="font-serif text-2xl">এই অধ্যায়ের অনুশীলন সম্পন্ন।</h2><p className="muted mt-2">ফলাফল দেখুন অথবা ভুল হওয়া প্রশ্নগুলো আবার অনুশীলন করুন।</p></div>}
            {current.length > 0 && (result
                ? <button type="button" className="bangla-digits primary mt-6 w-full md:w-auto" onClick={() => { setResult(null); setAnswers({}); load(size); }}>আরেকটি ব্যাচ শুরু করুন</button>
                : <button className="bangla-digits primary mt-6 w-full md:w-auto" onClick={submit} disabled={submitting || answeredCount !== current.length}>{submitting ? "ফলাফল সংরক্ষণ হচ্ছে…" : answeredCount === current.length ? `${formatBanglaNumber(current.length)}টি উত্তর জমা দিন` : <>সব প্রশ্নের উত্তর দিন ({formatBanglaNumber(answeredCount)}/{formatBanglaNumber(current.length)})</>}</button>)}</div>
            </>}
    </div>;
}
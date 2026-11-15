"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import LoadingState from "@/components/LoadingState";
import RequestErrorState from "@/components/RequestErrorState";
import { McqOptionBody, McqPrompt } from "@/features/academy/components/McqQuestionContent";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import { api } from "@/lib/api";
import { subjectByCode, subjectCodeForPaper } from "@/lib/subjects";

const keys = ["ক", "খ", "গ", "ঘ"];

export default function ChapterQuestionsPage() {
    const { subject, chapter } = useParams();
    const info = subjectByCode(subject);
    const chapterPosition = info?.chapterNumbers?.indexOf(Number(chapter));
    const chapterTitle = chapterPosition >= 0 ? info.chapters[chapterPosition] : "অধ্যায়ের সব প্রশ্ন";
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [loadedCount, setLoadedCount] = useState(0);

    const loadQuestions = async (signal) => {
        const params = new URLSearchParams(window.location.search);
        const requestedSubjectCode = subjectCodeForPaper(subject, params.get("paper"));
        let cursor = null;
        const seenCursors = new Set();
        const allQuestions = [];
        setLoading(true);
        setError("");
        setLoadedCount(0);
        try {
            while (true) {
                const pageParams = new URLSearchParams({
                    subject_code: requestedSubjectCode,
                    chapter: String(chapter),
                    limit: "50"
                });
                if (cursor) pageParams.set("cursor", cursor);
                const body = await api(`/academic/chapter-questions?${pageParams}`, { signal });
                if (signal?.aborted) return;
                const page = body.data?.questions;
                if (!Array.isArray(page)) {
                    throw new Error("প্রশ্নের তালিকা সঠিকভাবে পাওয়া যায়নি।");
                }
                allQuestions.push(...page);
                setLoadedCount(allQuestions.length);
                if (typeof body.data.has_more !== "boolean") {
                    if (body.data.total_questions === page.length) break;
                    throw new Error("প্রশ্নের তালিকা সঠিকভাবে পাওয়া যায়নি।");
                }
                if (!body.data.has_more) break;
                const nextCursor = body.data.next_cursor;
                if (!nextCursor || seenCursors.has(nextCursor) || page.length === 0) {
                    throw new Error("প্রশ্নগুলো সম্পূর্ণভাবে লোড করা যায়নি। আবার চেষ্টা করুন।");
                }
                seenCursors.add(nextCursor);
                cursor = nextCursor;
            }
            setQuestions(allQuestions);
        } catch (requestError) {
            if (requestError.name !== "AbortError") {
                console.error("Could not load all chapter questions.", requestError);
                setError(true);
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        loadQuestions(controller.signal);
        return () => controller.abort();
    }, [subject, chapter]);

    return <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-5 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500">{info?.shortName || subject} · সব প্রশ্ন</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="bangla-digits rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-semibold text-sky-400">অধ্যায় {formatBanglaNumber(chapter)}</span>
                    <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{chapterTitle}</h1>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {!loading && !error && <span className="bangla-digits text-xs text-zinc-400">{formatBanglaNumber(questions.length)}টি প্রশ্ন</span>}
                <Link href={`/academy/${subject}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/10"><ArrowLeft size={14}/> ফিরে যান</Link>
            </div>
        </header>
        {loading ? <LoadingState title="অধ্যায়ের প্রশ্ন সাজানো হচ্ছে" detail={`${formatBanglaNumber(loadedCount)}টি প্রশ্ন প্রস্তুত · শেষ হলে সবগুলো একসঙ্গে দেখাবে`}/> : error
            ? <RequestErrorState title="প্রশ্নগুলো লোড করা যায়নি" detail="সংযোগে সাময়িক সমস্যা হয়েছে। আবার চেষ্টা করলে পুরো অধ্যায়ের প্রশ্ন একসঙ্গে দেখানো হবে।" onRetry={() => loadQuestions()}/>
            : questions.length === 0
                ? <div className="rounded-2xl border border-white/10 bg-[#14161b] p-10 text-center text-zinc-400">এই অধ্যায়ে কোনো প্রশ্ন পাওয়া যায়নি।</div>
                : <div className="space-y-4">{questions.map((question, index) => <article key={question._id} className="rounded-2xl border border-white/10 bg-[#14161b] p-4 shadow-xl sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="bangla-digits grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/15 text-xs font-bold text-sky-400">{formatBanglaNumber(index + 1)}</span>
                        <span className="bangla-digits rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-200 sm:rounded-md sm:border-white/10 sm:bg-white/5 sm:px-2.5 sm:py-1 sm:text-xs sm:font-normal sm:tracking-normal sm:text-zinc-400">{question.board || "প্রশ্ন"}{question.year ? ` ${formatBanglaNumber(question.year)}` : ""}</span>
                    </div>
                    <div className="mb-5"><McqPrompt question={question}/></div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{keys.map((key, optionIndex) => {
                        if (question.options?.[optionIndex] === undefined) return null;
                        const correct = question.answer === key;
                        return <div key={key} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3.5 ${correct ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-[#191c23] text-zinc-200"}`}>
                            <McqOptionBody value={question.options[optionIndex]} label={key} selected={correct} status={correct ? "correct" : undefined}/>
                        </div>;
                    })}</div>
                </article>)}
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-emerald-300"><BookOpenCheck size={17}/> পড়ার জন্য—কোনো উত্তর জমা হয় না</div>
                </div>}
    </div>;
}
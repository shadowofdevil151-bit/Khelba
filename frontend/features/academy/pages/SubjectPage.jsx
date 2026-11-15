"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { academyPapersForSubject } from "@/lib/subjects";
import { useAuth } from "@/hooks/useAuth";
import SubjectArtwork from "@/features/academy/components/SubjectArtwork";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import { noteStreams } from "@/lib/notesCatalog";

const banglaSections = [
    { id: "prose", name: "গদ্য" },
    { id: "poetry", name: "কবিতা" },
    { id: "sohopath", name: "সহপাঠ" }
];

export default function SubjectPage() {
    const { subject } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const papers = useMemo(() => academyPapersForSubject(subject), [subject]);
    const profileStream = user?.profile?.education_stream || "SCIENCE";
    const [selectedPaper, setSelectedPaper] = useState(null);
    const [stream, setStream] = useState(profileStream);
    const [selectedSection, setSelectedSection] = useState("poetry");
    const [practiceChapter, setPracticeChapter] = useState(null);
    const [batchSize, setBatchSize] = useState(10);
    const routePaper = papers.find((paper) => paper.code === subject)?.paper;
    const activePaper = papers.find((paper) => paper.paper === selectedPaper)
        || papers.find((paper) => paper.paper === routePaper)
        || papers[0];

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const queryPaper = Number(query.get("paper"));
        const initialPaper = papers.find((paper) => paper.paper === queryPaper)
            || papers.find((paper) => paper.paper === routePaper)
            || papers[0];
        setSelectedPaper(initialPaper?.paper ?? null);
        const queryStream = query.get("stream")?.toUpperCase();
        setStream(noteStreams.find((item) => item.id === queryStream)?.id || profileStream);
        setSelectedSection("poetry");
    }, [papers, profileStream, routePaper, subject]);

    useEffect(() => {
        if (practiceChapter === null) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setPracticeChapter(null);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [practiceChapter]);

    const selectPaper = (paper) => {
        setSelectedPaper(paper.paper);
        setSelectedSection("poetry");
        window.history.replaceState(null, "", `/academy/${subject}?stream=${stream.toLowerCase()}&paper=${paper.paper}`);
    };

    if (!activePaper) return <div className="panel p-10 text-center">বিষয়টি পাওয়া যায়নি।</div>;

    const returnUrl = `/academy?stream=${stream.toLowerCase()}`;
    const chapterEntries = activePaper.chapters.map((chapter, index) => ({
        chapter,
        index: activePaper.chapterNumbers[index] ?? index + 1,
        section: activePaper.chapterSections?.[index] || null
    }));
    const isBanglaFirstPaper = activePaper.shortCode === "BNG" && activePaper.paper === 1;
    const visibleChapterEntries = isBanglaFirstPaper
        ? chapterEntries.filter((entry) => entry.section === selectedSection)
        : chapterEntries;
    const selectedChapter = chapterEntries.find((entry) => entry.index === practiceChapter);
    const startPractice = () => {
        if (practiceChapter === null) return;
        router.push(`/academy/${activePaper.code}/${practiceChapter}?stream=${stream.toLowerCase()}&paper=${activePaper.paper}&size=${batchSize}`);
        setPracticeChapter(null);
    };

    return <>
        <header className={`academy-subject-card academy-subject-card-${activePaper.shortCode} group relative isolate mb-6 overflow-hidden rounded-2xl border border-white/10 border-t p-4 sm:p-7`}>
            <SubjectArtwork code={activePaper.shortCode} variant="academy"/>
            <div className="relative z-10 flex min-h-28 items-start">
                <div className="max-w-2xl">
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">{activePaper.name}</h1>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">বিষয়ভিত্তিক অধ্যায় থেকে অনুশীলন বেছে নিন।</p>
                    <Link href={returnUrl} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 sm:min-h-0"><ArrowLeft size={16}/> Back</Link>
                </div>
            </div>
        </header>
        {papers.length > 1 && <section aria-label="পত্র বেছে নিন" className="mb-6 grid grid-cols-2 gap-2 sm:gap-4">
            {papers.map((paper) => {
                const active = paper.paper === activePaper.paper;
                const paperLabel = paper.paper === 1 ? "১ম" : "২য়";
                return <button key={paper.code} type="button" aria-pressed={active} onClick={() => selectPaper(paper)}
                    className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors sm:min-h-[76px] sm:gap-3 sm:px-4 sm:py-3 ${active ? "border-cyan-500/60 bg-[#161b22] text-white shadow-[0_0_20px_rgba(6,182,212,0.12)]" : "border-white/10 bg-[#14161b] text-zinc-400 hover:border-white/20"}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold sm:h-10 sm:w-10 ${active ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-zinc-500"}`}>{paperLabel}</span>
                    <span className="font-semibold">{paperLabel} পত্র</span>
                </button>;
            })}
        </section>}
        {isBanglaFirstPaper && <section aria-label="বাংলা প্রথম পত্রের বিভাগ" className="mb-6 flex flex-wrap gap-2">
            {banglaSections.map(({ id, name }) => {
                const active = selectedSection === id;
                return <button key={id} type="button" aria-pressed={active} onClick={() => setSelectedSection(id)}
                    className={`inline-flex min-h-11 items-center justify-center rounded-full border px-3.5 py-2 text-xs font-medium transition sm:min-h-0 sm:px-4 sm:text-sm ${active ? "border-rose-200/35 bg-rose-200/[.12] text-rose-50" : "border-white/10 text-white/65 hover:border-white/20 hover:text-white"}`}>
                    {name}
                </button>;
            })}
        </section>}
        <div id="chapters" className="mb-4 flex items-center justify-between gap-3">
            <div><div className="eyebrow">পাঠ্যক্রম</div><h2 className="mt-1 font-serif text-2xl text-white">সব অধ্যায়</h2></div>
            <span className="bangla-digits rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-400">{formatBanglaNumber(visibleChapterEntries.length)}টি অধ্যায়</span>
        </div>
        <div className="grid gap-3">{visibleChapterEntries.map(({ chapter, index }, visibleIndex) => {
            const displayIndex = isBanglaFirstPaper ? visibleIndex + 1 : index;
            return <article key={`${activePaper.code}-${index}`} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#14161b] p-3.5 transition-all hover:border-white/20 hover:bg-[#191c23] sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                <span className="bangla-digits grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-zinc-300 sm:h-11 sm:w-11 sm:text-sm">{formatBanglaNumber(String(displayIndex).padStart(2, "0"))}</span>
                <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-medium leading-6 text-zinc-100 sm:text-base">{chapter}</h3>
                    <p className="mt-1 text-[11px] text-zinc-500 sm:text-xs">অধ্যায় {formatBanglaNumber(displayIndex)} · MCQ অনুশীলন</p>
                </div>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-1.5 border-t border-white/[0.06] pt-3 sm:flex sm:gap-2 sm:border-0 sm:pt-0">
                <button type="button" onClick={() => setPracticeChapter(index)} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-blue-700 px-1.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 sm:min-h-0 sm:gap-1.5 sm:px-4 sm:text-sm">অনুশীলন <ArrowRight size={15}/></button>
                <Link href={`/academy/${activePaper.code}/${index}/all?stream=${stream.toLowerCase()}&paper=${activePaper.paper}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 px-1.5 py-2 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20 sm:min-h-0 sm:px-3.5 sm:text-sm">সব প্রশ্ন</Link>
                <Link href={`/academy/${activePaper.code}/${index}/wrong`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 px-1.5 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20 sm:min-h-0 sm:px-3.5 sm:text-sm">ভুল উত্তর</Link>
            </div>
        </article>;
        })}</div>
        {practiceChapter !== null && <div role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPracticeChapter(null);
        }} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" aria-labelledby="practice-modal-title" className="w-full max-w-lg rounded-2xl border border-white/10 border-t-2 border-t-sky-500/60 bg-[#14161b] p-5 shadow-2xl sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div><p className="text-xs font-medium uppercase tracking-[.18em] text-sky-300">অনুশীলন প্রস্তুতি</p><h2 id="practice-modal-title" className="mt-2 text-xl font-bold text-white">{selectedChapter?.chapter || "অধ্যায়"}</h2><p className="mt-1 text-sm text-zinc-400">কয়টি প্রশ্ন দিয়ে শুরু করবেন?</p></div>
                    <button type="button" onClick={() => setPracticeChapter(null)} aria-label="বন্ধ করুন" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 sm:h-auto sm:w-auto sm:p-2"><X size={18}/></button>
                </div>
                <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">{[5, 10, 20, 50].map((value) => <button key={value} type="button" aria-pressed={batchSize === value} onClick={() => setBatchSize(value)} className={`relative rounded-xl py-3 transition-all ${batchSize === value ? "border-2 border-sky-400 bg-sky-500/15 text-white shadow-[0_0_20px_rgba(56,189,248,0.18)]" : "border border-white/10 bg-[#191c23] text-zinc-300 hover:border-white/25"}`}>
                    {batchSize === value && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,.9)]"/>}
                    <span className="bangla-digits block text-xl font-bold">{formatBanglaNumber(value)}</span><span className="mt-1 block text-xs text-zinc-400">টি প্রশ্ন</span>
                </button>)}</div>
                <button type="button" onClick={startPractice} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3.5 font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:bg-blue-600">অনুশীলন শুরু করুন <ArrowRight size={17}/></button>
            </section>
        </div>}
    </>;
}
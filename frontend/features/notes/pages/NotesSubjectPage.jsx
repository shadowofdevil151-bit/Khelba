"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import { noteStreams, notesPapersForSubject } from "@/lib/notesCatalog";
import SubjectArtwork from "@/features/academy/components/SubjectArtwork";

const banglaSections = [
    { id: "poetry", name: "কবিতা" },
    { id: "prose", name: "গল্প ও প্রবন্ধ" },
    { id: "sohopath", name: "সহপাঠ" }
];

// Display-only: strip leading "অধ্যায় ১:" / "Chapter 1:" prefixes.
const CHAPTER_PREFIX = /^\s*(?:অধ্যায়|Chapter)\s*[০-৯0-9]+\s*[::：.\-–—)]\s*/i;

function formatChapterTitle(title) {
    if (!title) return "";
    return title.replace(CHAPTER_PREFIX, "").trim() || title;
}

export default function NotesSubjectPage({ subjectCode }) {
    const { user } = useAuth();
    const papers = useMemo(() => notesPapersForSubject(subjectCode), [subjectCode]);
    const [stream, setStream] = useState(user?.profile?.education_stream || "SCIENCE");
    const [selectedPaper, setSelectedPaper] = useState(1);
    const [selectedSection, setSelectedSection] = useState("poetry");

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const requestedStream = query.get("stream")?.toUpperCase();
        const availableStreams = papers.flatMap((paper) => paper.streams);
        const validStream = availableStreams.find((item) => item === requestedStream);
        const profileStream = availableStreams.find((item) => item === user?.profile?.education_stream);
        setStream(validStream || profileStream || papers[0]?.streams[0] || "SCIENCE");

        const requestedPaper = Number(query.get("paper"));
        setSelectedPaper(papers.some((paper) => paper.paper === requestedPaper) ? requestedPaper : 1);
    }, [papers, user?.profile?.education_stream]);

    const subject = papers.find((paper) => paper.paper === selectedPaper) || papers[0];
    const isBanglaFirstPaper = subject?.shortCode === "BNG" && subject.paper === 1;
    const visibleChapters = useMemo(() => {
        if (!subject) return [];
        return isBanglaFirstPaper
            ? subject.chapters.filter((chapter) => chapter.section === selectedSection)
            : subject.chapters;
    }, [subject, isBanglaFirstPaper, selectedSection]);

    if ((user?.profile?.education_level || "HSC") !== "HSC") return <NoNotes level={user?.profile?.education_level}/>;
    if (!subject) return <NotFound/>;

    const streamName = noteStreams.find((item) => item.id === stream)?.name || "HSC";
    const backHref = `/notes?stream=${stream.toLowerCase()}`;
    const selectPaper = (paper) => {
        setSelectedPaper(paper);
        setSelectedSection("poetry");
        window.history.replaceState(null, "", `/notes/${subject.shortCode}?stream=${stream.toLowerCase()}&paper=${paper}`);
    };

    return <>
        <Link href={backHref} className="ghost mb-5 hidden items-center gap-2 sm:inline-flex"><ArrowLeft size={16}/> সব বিষয়</Link>
        <header className="panel relative isolate mb-4 overflow-hidden p-4 sm:mb-6 sm:p-8">
            <div className={`notes-subject-backdrop notes-subject-backdrop-${subject.shortCode} absolute inset-0 z-0`}/>
            <SubjectArtwork code={subject.shortCode}/>
            <div className="relative z-10 max-w-2xl">
                <Link href={backHref} className="mb-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white/85 sm:hidden">
                    <ArrowLeft size={12}/> সব বিষয়
                </Link>
                <div className="eyebrow text-[10px] tracking-wider sm:text-xs">HSC Notes · {streamName}</div>
                <h1 className="mt-1 text-xl font-bold leading-tight text-white sm:mt-2 sm:text-4xl sm:font-semibold">{subject.name}</h1>
                <p className="mt-0.5 text-xs text-white/70 sm:mt-3 sm:text-sm sm:text-white/75">পত্র বেছে নিয়ে অধ্যায়ভিত্তিক নোট পড়ো।</p>
            </div>
        </header>

        <div className="mb-4 grid grid-cols-[1fr_auto] items-center gap-2 sm:mb-0 sm:block">
            {papers.length > 1 && (
                <div
                    role="group"
                    aria-label="পত্র বেছে নিন"
                    className="order-1 flex items-center gap-1 rounded-xl border border-white/10 bg-[#18181c] p-1 sm:mb-6 sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
                >
                    {papers.map((paper) => {
                        const active = paper.paper === subject.paper;
                        return <button
                            key={paper.code}
                            type="button"
                            aria-pressed={active}
                            onClick={() => selectPaper(paper.paper)}
                            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition sm:rounded-xl sm:px-5 sm:py-3 ${active ? "border-sky-200/30 bg-[#2c2e36] text-white shadow-[0_6px_24px_rgba(56,189,248,.09)] sm:bg-sky-200/[.1]" : "border-transparent text-white/65 hover:text-white sm:border-white/10 sm:bg-white/[.025] sm:hover:border-white/20"}`}
                        >{paper.paper === 1 ? "১ম পত্র" : "২য় পত্র"}</button>;
                    })}
                </div>
            )}
            {isBanglaFirstPaper && (
                <section
                    aria-label="বাংলা প্রথম পত্রের বিভাগ"
                    className="order-3 col-span-2 flex flex-wrap gap-1.5 sm:mb-6 sm:col-span-1 sm:gap-2"
                >
                    {banglaSections.map(({ id, name }) => {
                        const active = selectedSection === id;
                        return <button
                            key={id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelectedSection(id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm ${active ? "border-rose-200/35 bg-rose-200/[.12] text-rose-50" : "border-white/10 text-white/65 hover:border-white/20 hover:text-white"}`}
                        >{name}</button>;
                    })}
                </section>
            )}
            <div className="order-2 inline-flex items-center gap-1.5 justify-self-end rounded-xl border border-white/10 bg-white/[.05] px-2.5 py-1.5 text-xs font-semibold text-paper/75 bangla-digits sm:mb-5 sm:rounded-full sm:border-white/15 sm:bg-white/[.035] sm:px-3 sm:py-1.5 sm:text-sm sm:font-normal sm:text-white/80">
                <BookOpen size={13} className="sm:hidden"/>
                <BookOpen size={15} className="hidden sm:block"/>
                {formatBanglaNumber(visibleChapters.length)}টি অধ্যায়
            </div>
        </div>

        {visibleChapters.length ? <section>
            <div className="mb-2 sm:mb-3">
                <div className="eyebrow text-[10px] sm:text-xs">Chapter list · অধ্যায় তালিকা</div>
                <h2 className="mt-0.5 text-base font-bold text-white sm:mt-1 sm:text-2xl sm:font-semibold">যে অধ্যায়টি পড়বে</h2>
            </div>
            <div className="grid gap-2.5 sm:gap-3">
                {visibleChapters.map((chapter, index) => <Link
                    key={chapter.slug}
                    href={`/notes/${subject.code}/${chapter.slug}?stream=${stream.toLowerCase()}`}
                    className="notes-chapter-row panel group flex min-h-16 items-center gap-3 rounded-2xl px-3.5 py-3 transition active:scale-[0.99] hover:-translate-y-0.5 hover:border-sky-200/25 hover:bg-white/[.035] sm:min-h-0 sm:gap-4 sm:p-4 sm:px-5"
                >
                    <span className="bangla-digits grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sky-100/10 bg-sky-100/[.05] text-xs font-semibold text-sky-100 sm:h-11 sm:w-11 sm:text-sm">{formatBanglaNumber(index + 1)}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[14.5px] font-medium leading-snug text-white/90 sm:text-base sm:leading-relaxed sm:text-lg">{formatChapterTitle(chapter.title)}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/55 sm:mt-1 sm:text-xs">
                            <FileText size={11} className="sm:hidden"/>
                            <FileText size={13} className="hidden sm:block"/>
                            Study note
                        </span>
                    </span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[.04] text-white/50 transition sm:h-auto sm:w-auto sm:bg-transparent sm:p-0 sm:group-hover:text-sky-100">
                        <ArrowRight size={14} className="sm:hidden"/>
                        <ArrowRight size={18} className="hidden text-white/40 transition group-hover:translate-x-1 group-hover:text-sky-100 sm:block"/>
                    </span>
                </Link>)}
            </div>
        </section> : <EmptyState title="এই বিষয়ের অধ্যায় এখনো যোগ করা হয়নি" detail="নোট তৈরি হলে এখানে অধ্যায়ের তালিকা দেখা যাবে।"/>}
    </>;
}

function NoNotes({ level }) {
    const label = level === "SSC" ? "SSC" : "স্কুল";
    return <EmptyState title={`${label} নোট এখনো প্রস্তুত নয়`} detail="এখনো এই স্তরের নোট যোগ করা হয়নি। আপাতত HSC নোটস দেখা যাবে।"/>;
}

function NotFound() {
    return <EmptyState title="বিষয়টি পাওয়া যায়নি" detail="এই বিষয়ের নোট ক্যাটালগে নেই বা লিংকটি ঠিক নয়।"/>;
}

function EmptyState({ title, detail }) {
    return <section className="notes-empty panel mx-auto my-8 max-w-2xl p-6 text-center sm:p-12">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sky-100/15 bg-sky-100/[.05] text-sky-100"><BookOpen size={25}/></div>
        <h1 className="mt-5 text-xl font-semibold text-white sm:text-2xl">{title}</h1>
        <p className="mt-2 text-sm leading-7 text-white/60">{detail}</p>
        <Link href="/notes" className="ghost mt-5 inline-flex items-center gap-2"><ArrowLeft size={15}/> নোটসে ফিরুন</Link>
    </section>;
}
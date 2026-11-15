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
        <Link href={backHref} className="ghost mb-5 inline-flex items-center gap-2"><ArrowLeft size={16}/> সব বিষয়</Link>
        <header className="panel relative isolate mb-6 overflow-hidden p-6 sm:p-8">
            <div className={`notes-subject-backdrop notes-subject-backdrop-${subject.shortCode} absolute inset-0 z-0`}/>
            <SubjectArtwork code={subject.shortCode}/>
            <div className="relative z-10 max-w-2xl">
                <div className="eyebrow">HSC Notes · {streamName}</div>
                <h1 className="mt-2 text-3xl font-semibold leading-tight text-white sm:text-4xl">{subject.name}</h1>
                <p className="mt-3 text-sm text-white/75">পত্র বেছে নিয়ে অধ্যায়ভিত্তিক নোট পড়ো।</p>
            </div>
        </header>

        {papers.length > 1 && <section aria-label="পত্র বেছে নিন" className="mb-6 flex gap-2">
            {papers.map((paper) => {
                const active = paper.paper === subject.paper;
                return <button
                    key={paper.code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectPaper(paper.paper)}
                    className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${active ? "border-sky-200/30 bg-sky-200/[.1] text-white shadow-[0_6px_24px_rgba(56,189,248,.09)]" : "border-white/10 bg-white/[.025] text-white/65 hover:border-white/20 hover:text-white"}`}
                >{paper.paper === 1 ? "১ম পত্র" : "২য় পত্র"}</button>;
            })}
        </section>}

        {isBanglaFirstPaper && <section aria-label="বাংলা প্রথম পত্রের বিভাগ" className="mb-6 flex flex-wrap gap-2">
            {banglaSections.map(({ id, name }) => {
                const active = selectedSection === id;
                return <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedSection(id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-rose-200/35 bg-rose-200/[.12] text-rose-50" : "border-white/10 text-white/65 hover:border-white/20 hover:text-white"}`}
                >{name}</button>;
            })}
        </section>}

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.035] px-3 py-1.5 text-sm text-white/80">
            <BookOpen size={15}/><span className="bangla-digits">{formatBanglaNumber(visibleChapters.length)}টি অধ্যায়</span>
        </div>

        {visibleChapters.length ? <section>
            <div className="mb-3"><div className="eyebrow">Chapter list · অধ্যায় তালিকা</div><h2 className="mt-1 text-2xl font-semibold text-white">যে অধ্যায়টি পড়বে</h2></div>
            <div className="grid gap-3">
                {visibleChapters.map((chapter, index) => <Link
                    key={chapter.slug}
                    href={`/notes/${subject.code}/${chapter.slug}?stream=${stream.toLowerCase()}`}
                    className="notes-chapter-row panel group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-sky-200/25 hover:bg-white/[.035] sm:px-5"
                >
                    <span className="bangla-digits grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-100/10 bg-sky-100/[.05] text-sm font-semibold text-sky-100">{formatBanglaNumber(index + 1)}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium leading-relaxed text-white/90 sm:text-lg">{chapter.title}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-white/55"><FileText size={13}/> Study note</span>
                    </span>
                    <ArrowRight className="shrink-0 text-white/40 transition group-hover:translate-x-1 group-hover:text-sky-100" size={18}/>
                </Link>)}
            </div>
        </section> : <EmptyState title="এই বিষয়ের অধ্যায় এখনো যোগ করা হয়নি" detail="নোট তৈরি হলে এখানে অধ্যায়ের তালিকা দেখা যাবে।"/>}
    </>;
}

function NoNotes({ level }) {
    const label = level === "SSC" ? "SSC" : "স্কুল";
    return <EmptyState title={`${label} নোট এখনো প্রস্তুত নয়`} detail="এখনো এই স্তরের নোট যোগ করা হয়নি। আপাতত HSC নোটস দেখা যাবে।"/>;
}

function NotFound() {
    return <EmptyState title="বিষয়টি পাওয়া যায়নি" detail="এই বিষয়ের নোট ক্যাটালগে নেই বা লিংকটি ঠিক নয়।"/>;
}

function EmptyState({ title, detail }) {
    return <section className="notes-empty panel mx-auto my-8 max-w-2xl p-8 text-center sm:p-12">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sky-100/15 bg-sky-100/[.05] text-sky-100"><BookOpen size={25}/></div>
        <h1 className="mt-5 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-7 text-white/60">{detail}</p>
        <Link href="/notes" className="ghost mt-5 inline-flex items-center gap-2"><ArrowLeft size={15}/> নোটসে ফিরুন</Link>
    </section>;
}

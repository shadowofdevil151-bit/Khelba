"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, FlaskConical } from "lucide-react";
import SubjectArtwork from "@/features/academy/components/SubjectArtwork";
import { useAuth } from "@/hooks/useAuth";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import { noteStreams, notesPapersForSubject, notesSubjectsForStream } from "@/lib/notesCatalog";

const streamIcons = {
    SCIENCE: FlaskConical,
    ARTS: BookOpen,
    COMMERCE: BriefcaseBusiness
};

const levelNames = { SSC: "এসএসসি", SCHOOL: "স্কুল" };

export default function NotesHome() {
    const { user } = useAuth();
    const level = user?.profile?.education_level || "HSC";
    const profileStream = user?.profile?.education_stream || "SCIENCE";
    const [selectedStream, setSelectedStream] = useState(profileStream);

    useEffect(() => {
        const queryStream = new URLSearchParams(window.location.search).get("stream")?.toUpperCase();
        const selected = noteStreams.find((stream) => stream.id === queryStream)?.id || profileStream;
        setSelectedStream(selected);
    }, [profileStream]);

    const selectStream = (stream) => {
        setSelectedStream(stream);
        window.history.replaceState(null, "", `/notes?stream=${stream.toLowerCase()}`);
    };

    const subjects = notesSubjectsForStream(selectedStream);

    return <>
        <header className="mb-3 flex items-center justify-between gap-3 sm:mb-6 sm:block">
            <div className="flex min-w-0 items-baseline gap-2 sm:block">
                <h1 className="text-lg font-bold text-white sm:text-3xl">
                    <span className="sm:hidden">নোটস</span>
                    <span className="hidden sm:inline">Notes</span>
                </h1>
                <p className="text-xs text-zinc-400 sm:mt-1 sm:block sm:text-sm">পাঁচ মিনিটে রিভিশন</p>
            </div>
            {level === "HSC" && subjects.length > 0 && (
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[.06] px-2.5 py-1 text-[11px] font-semibold text-paper/75 bangla-digits sm:hidden">
                    {formatBanglaNumber(subjects.length)}টি বিষয়
                </span>
            )}
        </header>
        {level !== "HSC" ? <section className="notes-empty panel mx-auto max-w-2xl p-6 text-center sm:p-12">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sky-200/15 bg-sky-200/[.06] text-sky-100 sm:h-16 sm:w-16">
                <BookOpen size={24} className="sm:hidden"/>
                <BookOpen size={28} className="hidden sm:block"/>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-white sm:mt-5 sm:text-2xl">{levelNames[level] || "এই স্তরের"} নোট আসছে</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-white/65">এখনো {levelNames[level] || "এই স্তরের"} নোট যোগ করা হয়নি। বর্তমানে HSC-এর বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা বিভাগের নোট পড়া যাবে।</p>
        </section> : <>
            <section aria-label="বিভাগ বেছে নিন" className="sticky top-14 z-20 mb-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-[#18181c]/95 p-1.5 backdrop-blur-xl sm:static sm:mb-8 sm:gap-3 sm:bg-white/[.025] sm:p-3">
                {noteStreams.map(({ id, name }) => {
                    const Icon = streamIcons[id];
                    const active = selectedStream === id;
                    return <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectStream(id)}
                        className={`group flex min-h-14 items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 text-center text-xs font-semibold transition sm:min-h-[72px] sm:gap-3 sm:px-2 sm:py-3 sm:text-base ${active ? "border-sky-200/30 bg-[#2c2e36] text-white shadow-[0_6px_24px_rgba(56,189,248,.09)] sm:bg-sky-200/[.1]" : "border-transparent text-white/65 hover:border-white/10 hover:bg-white/[.04] hover:text-white"}`}
                    >
                        <Icon className={`h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${active ? "text-sky-100" : "text-white/45"}`}/>
                        <span className="min-w-0 truncate sm:whitespace-normal">
                            <span className="block">{name}</span>
                            <span className="mt-0.5 hidden text-[10px] font-medium tracking-wide text-white/45 sm:block">{id === "SCIENCE" ? "Science" : id === "ARTS" ? "Arts" : "Commerce"}</span>
                        </span>
                    </button>;
                })}
            </section>

            {subjects.length ? <section aria-live="polite">
                <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
                    <div>
                        <div className="eyebrow text-[10px] sm:text-xs">তোমার পাঠ্যক্রম · HSC Notes</div>
                        <h2 className="mt-1 text-lg font-semibold text-white sm:text-2xl">{noteStreams.find((stream) => stream.id === selectedStream)?.name} বিভাগ</h2>
                    </div>
                    <span className="bangla-digits hidden whitespace-nowrap text-sm text-white/60 sm:inline">{formatBanglaNumber(subjects.length)}টি বিষয়</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                    {subjects.map((subject) => {
                        const papers = notesPapersForSubject(subject.shortCode);
                        const totalChapters = papers.reduce((count, item) => count + item.chapterCount, 0);
                        return <Link
                            key={subject.shortCode}
                            href={`/notes/${subject.shortCode}?stream=${selectedStream.toLowerCase()}&paper=1`}
                            className="notes-subject-card panel group relative isolate min-h-[108px] overflow-hidden p-0 transition-[transform,border-color,box-shadow] duration-300 active:scale-[0.99] hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_14px_38px_rgba(0,0,0,.24)] sm:min-h-56"
                        >
                            <div className={`notes-subject-backdrop notes-subject-backdrop-${subject.shortCode} absolute inset-0 z-0`}/>
                            {/* Dark scrim improves white-text contrast over warm gradients */}
                            <div className="pointer-events-none absolute inset-0 z-0 bg-black/35" aria-hidden="true"/>
                            <SubjectArtwork code={subject.shortCode}/>
                            <div className="relative z-10 flex min-h-[108px] flex-col justify-between p-4 sm:min-h-56 sm:p-6">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold text-white/90 sm:px-3 sm:py-1 sm:text-xs sm:font-medium">HSC · নোটস</span>
                                    <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-black/25 text-white/90 transition group-hover:scale-105 group-hover:text-white sm:h-10 sm:w-10 sm:rounded-xl">
                                        <BookOpen size={14} className="sm:hidden"/>
                                        <BookOpen size={19} className="hidden sm:block"/>
                                    </span>
                                </div>
                                <div className="mt-3 sm:mt-0 sm:pr-10">
                                    <h3 className="text-[17px] font-bold leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.6)] sm:text-xl sm:font-semibold lg:text-2xl">{subject.name}</h3>
                                    <div className="mt-0.5 flex items-center justify-between gap-3 text-xs text-white/70 sm:mt-3 sm:text-sm sm:text-white/80">
                                        <span className="bangla-digits">{formatBanglaNumber(totalChapters)}টি অধ্যায়</span>
                                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold text-white transition group-hover:gap-1.5 sm:gap-1.5 sm:text-sm sm:font-medium sm:group-hover:gap-2.5">নোট পড়ো <ArrowRight size={13} className="sm:hidden"/><ArrowRight size={15} className="hidden sm:block"/></span>
                                    </div>
                                </div>
                            </div>
                        </Link>;
                    })}
                </div>
            </section> : <section className="notes-empty panel p-6 text-center sm:p-8">
                <BookOpen className="mx-auto text-white/40" size={30}/>
                <h2 className="mt-3 text-lg font-semibold text-white sm:text-xl">এই বিভাগে নোট পাওয়া যায়নি</h2>
                <p className="mt-2 text-sm text-white/60">এই বিভাগের নোট যোগ হলে এখানে দেখা যাবে।</p>
            </section>}
        </>}
    </>;
}
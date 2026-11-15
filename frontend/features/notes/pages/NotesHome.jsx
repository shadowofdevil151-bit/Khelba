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
        <header className="mb-6">
            <h1 className="text-3xl font-bold text-white">Notes</h1>
            <p className="mt-1 text-sm text-zinc-400">পাঁচ মিনিটে রিভিশন</p>
        </header>
        {level !== "HSC" ? <section className="notes-empty panel mx-auto max-w-2xl p-8 text-center sm:p-12">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-sky-200/15 bg-sky-200/[.06] text-sky-100"><BookOpen size={28}/></div>
            <h2 className="mt-5 text-2xl font-semibold text-white">{levelNames[level] || "এই স্তরের"} নোট আসছে</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-white/65">এখনো {levelNames[level] || "এই স্তরের"} নোট যোগ করা হয়নি। বর্তমানে HSC-এর বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা বিভাগের নোট পড়া যাবে।</p>
        </section> : <>
            <section aria-label="বিভাগ বেছে নিন" className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-2 sm:mb-8 sm:gap-3 sm:p-3">
                {noteStreams.map(({ id, name }) => {
                    const Icon = streamIcons[id];
                    const active = selectedStream === id;
                    return <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectStream(id)}
                        className={`group flex min-h-16 items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-sm font-semibold transition sm:min-h-[72px] sm:gap-3 sm:text-base ${active ? "border-sky-200/30 bg-sky-200/[.1] text-white shadow-[0_6px_24px_rgba(56,189,248,.09)]" : "border-transparent text-white/65 hover:border-white/10 hover:bg-white/[.04] hover:text-white"}`}
                    >
                        <Icon size={18} className={active ? "text-sky-100" : "text-white/45"}/>
                        <span><span className="block">{name}</span><span className="mt-0.5 hidden text-[10px] font-medium tracking-wide text-white/45 sm:block">{id === "SCIENCE" ? "Science" : id === "ARTS" ? "Arts" : "Commerce"}</span></span>
                    </button>;
                })}
            </section>

            {subjects.length ? <section aria-live="polite">
                <div className="mb-4 flex items-end justify-between gap-3">
                    <div><div className="eyebrow">তোমার পাঠ্যক্রম · HSC Notes</div><h2 className="mt-1 text-2xl font-semibold text-white">{noteStreams.find((stream) => stream.id === selectedStream)?.name} বিভাগ</h2></div>
                    <span className="bangla-digits whitespace-nowrap text-sm text-white/60">{formatBanglaNumber(subjects.length)}টি বিষয়</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {subjects.map((subject) => {
                        const papers = notesPapersForSubject(subject.shortCode);
                        return <Link
                            key={subject.shortCode}
                            href={`/notes/${subject.shortCode}?stream=${selectedStream.toLowerCase()}&paper=1`}
                            className="notes-subject-card panel group relative isolate min-h-56 overflow-hidden p-0 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_14px_38px_rgba(0,0,0,.24)]"
                        >
                            <div className={`notes-subject-backdrop notes-subject-backdrop-${subject.shortCode} absolute inset-0 z-0`}/>
                            <SubjectArtwork code={subject.shortCode}/>
                            <div className="relative z-10 flex min-h-56 flex-col justify-between p-5 sm:p-6">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-medium text-white/90">HSC · নোটস</span>
                                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-black/15 text-white/80 transition group-hover:scale-105 group-hover:text-white"><BookOpen size={19}/></span>
                                </div>
                                <div className="pr-10">
                                    <h3 className="text-xl font-semibold leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.5)] sm:text-2xl">{subject.name}</h3>
                                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white/75">
                                        <span className="bangla-digits">{formatBanglaNumber(papers.reduce((count, item) => count + item.chapterCount, 0))}টি অধ্যায়</span>
                                        <span className="flex items-center gap-1.5 font-medium text-white transition group-hover:gap-2.5">নোট পড়ো <ArrowRight size={15}/></span>
                                    </div>
                                </div>
                            </div>
                        </Link>;
                    })}
                </div>
            </section> : <section className="notes-empty panel p-8 text-center">
                <BookOpen className="mx-auto text-white/40" size={30}/>
                <h2 className="mt-3 text-xl font-semibold text-white">এই বিভাগে নোট পাওয়া যায়নি</h2>
                <p className="mt-2 text-sm text-white/60">এই বিভাগের নোট যোগ হলে এখানে দেখা যাবে।</p>
            </section>}
        </>}
    </>;
}

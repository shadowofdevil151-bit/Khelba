"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Atom, BookOpen, Brain, BriefcaseBusiness, Calculator, FlaskConical, Landmark, Layers3, Target, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { academySubjectsForStream } from "@/lib/subjects";
import AcademyMetric from "@/features/academy/components/AcademyMetric";
import SubjectArtwork from "@/features/academy/components/SubjectArtwork";
import { useAuth } from "@/hooks/useAuth";
import { formatBanglaNumber } from "@/lib/formatBanglaNumber";
import { noteStreams } from "@/lib/notesCatalog";

const streamIcons = { SCIENCE: FlaskConical, ARTS: BookOpen, COMMERCE: BriefcaseBusiness };
const subjectMetricIcons = [Atom, BookOpen, Calculator, FlaskConical, Landmark, Brain];

function boundedPercent(value) {
    const percentage = Number(value);
    return Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
}

function AccuracyRing({ percentage }) {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - boundedPercent(percentage) / 100);
    return <div aria-hidden="true" className="relative grid h-[76px] w-[76px] place-items-center">
        <span className="absolute inset-3 rounded-full bg-cyan-400/5 blur-md"/>
        <svg viewBox="0 0 72 72" className="relative h-[68px] w-[68px] drop-shadow-[0_0_3px_rgba(34,211,238,.18)]">
            <circle cx="36" cy="36" r={radius} fill="none" strokeWidth="6" className="stroke-zinc-700"/>
            <circle cx="36" cy="36" r={radius} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 36 36)" className="stroke-cyan-300 transition-[stroke-dashoffset] duration-700"/>
            <circle cx="36" cy="6" r="2.5" fill="#22d3ee"/>
        </svg>
    </div>;
}

function CompletionSegments({ percentage }) {
    const progress = boundedPercent(percentage) / 20;
    return <div aria-hidden="true" className="flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[.035] px-2.5 py-3">
        {Array.from({ length: 5 }, (_, index) => {
            const fill = Math.min(1, Math.max(0, progress - index));
            return <span key={index} className="h-3 w-4 overflow-hidden rounded-full border border-white/10 bg-zinc-700 sm:w-5">
                <span className="block h-full rounded-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${fill * 100}%` }}/>
            </span>;
        })}
    </div>;
}

function SubjectIconGrid() {
    return <div aria-hidden="true" className="grid grid-cols-3 gap-1.5">
        {subjectMetricIcons.map((Icon, index) => <span key={index} className="grid h-8 w-8 place-items-center rounded-lg border border-violet-400/20 bg-violet-500/10 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,.12)]"><Icon size={14}/></span>)}
    </div>;
}

function MobileAccuracyBar({ percentage }) {
    return <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
        <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-700" style={{ width: `${boundedPercent(percentage)}%` }}/>
    </div>;
}

function MobileCompletionSegments({ percentage }) {
    const progress = boundedPercent(percentage) / 20;
    return <div aria-hidden="true" className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => {
            const fill = Math.min(1, Math.max(0, progress - index));
            return <span key={index} className="h-1.5 w-3 overflow-hidden rounded-full border border-white/10 bg-zinc-700">
                <span className="block h-full rounded-full bg-emerald-400" style={{ width: `${fill * 100}%` }}/>
            </span>;
        })}
    </div>;
}

function MobileStreamBadge({ name }) {
    return <span className="inline-flex max-w-full items-center truncate rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] leading-tight text-violet-200">{name || "এইচএসসি"}</span>;
}

export default function Academy() {
    const { user } = useAuth();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportError, setReportError] = useState(false);
    const profileStream = user?.profile?.education_stream || "SCIENCE";
    const [selectedStream, setSelectedStream] = useState(profileStream);
    const subjects = academySubjectsForStream(selectedStream);
    const subjectCodesQuery = subjects.flatMap((subject) => subject.papers.map((paper) => paper.code)).join(",");

    useEffect(() => {
        const controller = new AbortController();
        setReport(null);
        setReportError(false);
        setLoading(true);
        api(`/academic/report/summary?subject_codes=${encodeURIComponent(subjectCodesQuery)}`, { signal: controller.signal })
            .then((body) => setReport(body.data))
            .catch((error) => {
                if (error.name !== "AbortError") setReportError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [subjectCodesQuery]);

    useEffect(() => {
        const queryStream = new URLSearchParams(window.location.search).get("stream")?.toUpperCase();
        const selected = noteStreams.find((stream) => stream.id === queryStream)?.id || profileStream;
        setSelectedStream(selected);
    }, [profileStream]);

    const selectStream = (stream) => {
        setSelectedStream(stream);
        window.history.replaceState(null, "", `/academy?stream=${stream.toLowerCase()}`);
    };

    const totals = report || {};
    const accuracyValue = report
        ? `${formatBanglaNumber(totals.accuracy || 0)}%`
        : reportError ? "—" : "…";
    const completionValue = report
        ? `${formatBanglaNumber(totals.completion_percentage || 0)}%`
        : reportError ? "—" : "…";
    const subjectCount = subjects.length;
    const currentStream = noteStreams.find((stream) => stream.id === selectedStream);

    return <>
        <header className="mb-5 sm:mb-6">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Academic</h1>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">পড়াশোনা বাদ দিয়ে আগে নিজের অবস্থাটা দেখে নাও।</p>
        </header>
        <div className="mb-8 grid grid-cols-3 items-stretch gap-2 sm:gap-4">
            <AcademyMetric accent="cyan" icon={Target} label="সঠিক উত্তরের হার" value={accuracyValue} detail={reportError ? "রিপোর্ট লোড হয়নি" : `মোট চেষ্টা: ${formatBanglaNumber(totals.total_attempts || 0)}`} visual={<AccuracyRing percentage={totals.accuracy}/>} mobileVisual={<MobileAccuracyBar percentage={totals.accuracy}/>}/>
            <AcademyMetric accent="emerald" icon={TrendingUp} label="সম্পন্ন প্রশ্ন" value={completionValue} detail={reportError ? "রিপোর্ট লোড হয়নি" : `চর্চিত অধ্যায়ে: ${formatBanglaNumber(totals.completed_questions || 0)}/${formatBanglaNumber(totals.total_questions || 0)}`} visual={<CompletionSegments percentage={totals.completion_percentage}/>} mobileVisual={<MobileCompletionSegments percentage={totals.completion_percentage}/>}/>
            <AcademyMetric accent="violet" icon={Layers3} label="বিষয়" value={formatBanglaNumber(subjectCount)} detail={currentStream?.name || "এইচএসসি পাঠ্যক্রম"} visual={<SubjectIconGrid/>} mobileVisual={<MobileStreamBadge name={currentStream?.name}/>}/>
        </div>
        <section aria-label="বিভাগ বেছে নিন" className="mb-7 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-2 sm:gap-3 sm:p-3">
            {noteStreams.map(({ id, name }) => {
                const Icon = streamIcons[id];
                const active = selectedStream === id;
                return <button key={id} type="button" aria-pressed={active} onClick={() => selectStream(id)}
                    className={`group flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center text-xs font-semibold transition sm:min-h-[72px] sm:flex-row sm:items-center sm:justify-center sm:gap-3 sm:px-2 sm:py-3 sm:text-base ${active ? "border-sky-200/30 bg-sky-200/[.1] text-white shadow-[0_6px_24px_rgba(56,189,248,.09)]" : "border-transparent text-white/65 hover:border-white/10 hover:bg-white/[.04] hover:text-white"}`}>
                    <Icon size={18} className={active ? "text-sky-100" : "text-white/45"}/>
                    <span><span className="block">{name}</span><span className="mt-0.5 hidden text-[10px] font-medium tracking-wide text-white/45 sm:block">{id === "SCIENCE" ? "Science" : id === "ARTS" ? "Arts" : "Commerce"}</span></span>
                </button>;
            })}
        </section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">আপনার পাঠ্যক্রম</div><h2 className="mt-1 font-serif text-2xl">একটি বিষয় বেছে নিন</h2></div><div className="flex items-center gap-3">{currentStream && <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs text-white/70">{currentStream.name} · {formatBanglaNumber(subjects.length)}টি বিষয়</span>}</div></div>
        {subjects.length ? <div className="grid gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">{subjects.map((subject) => <Link key={subject.code} href={`/academy/${subject.code}?stream=${selectedStream.toLowerCase()}&paper=1`} className={`academy-subject-card academy-subject-card-${subject.shortCode} group relative isolate overflow-hidden rounded-2xl border border-white/10 border-t px-0 transition-all duration-300 hover:-translate-y-0.5`}>
            <SubjectArtwork code={subject.shortCode} variant="academy"/>
            <div className="relative z-10 flex min-h-[112px] flex-col justify-between p-4 sm:min-h-64 sm:p-7">
                <div className="flex items-center justify-between"><span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-widest text-white/75 backdrop-blur-sm sm:px-3 sm:py-1 sm:text-xs sm:text-white/85">এইচএসসি · {formatBanglaNumber(subject.papers.length)} পত্র</span><BookOpen className="text-white/60 transition group-hover:scale-110 group-hover:text-white sm:text-white/75" size={22}/></div>
                <div><h3 className="max-w-full font-serif text-[26px] leading-tight text-white sm:max-w-[18rem] sm:text-3xl sm:leading-tight">{subject.name}</h3><div className="mt-2 flex items-center justify-between text-[10px] text-white/60 sm:mt-4 sm:text-sm sm:text-white/75"><span className="bangla-digits">{formatBanglaNumber(subject.totalChapters)}টি অধ্যায়</span><span className="flex items-center gap-1 text-white/80 transition group-hover:gap-2 group-hover:text-white sm:text-white">বিষয় খুলুন <ArrowRight size={13}/></span></div></div>
            </div>
        </Link>)}</div> : <div className="panel p-10 text-center"><BookOpen className="mx-auto text-white/35" size={30}/><h3 className="mt-3 text-lg font-semibold">এই বিভাগে এখনো অনুশীলন নেই</h3><p className="muted mt-2">এই বিভাগের MCQ যোগ হলে এখানে দেখা যাবে।</p></div>}
    </>;
}
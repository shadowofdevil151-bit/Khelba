"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ArrowLeft, ArrowRight, BookOpen, RotateCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { findNotesChapter, findNotesSubject, noteStreams } from "@/lib/notesCatalog";
import LoadingState from "@/components/LoadingState";

export default function NotesChapterPage({ subjectCode, chapterSlug }) {
    const { user } = useAuth();
    const subject = findNotesSubject(subjectCode);
    const chapter = findNotesChapter(subject, chapterSlug);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [stream, setStream] = useState(user?.profile?.education_stream || "SCIENCE");
    const level = user?.profile?.education_level || "HSC";
    const chapterIndex = subject?.chapters.findIndex((item) => item.slug === chapterSlug) ?? -1;

    useEffect(() => {
        const queryStream = new URLSearchParams(window.location.search).get("stream")?.toUpperCase();
        const selected = subject?.streams.find((item) => item === queryStream || item === user?.profile?.education_stream);
        setStream(selected || subject?.streams[0] || "SCIENCE");
    }, [subject, user?.profile?.education_stream]);

    useEffect(() => {
        if (!chapter || level !== "HSC") {
            setLoading(false);
            return undefined;
        }
        const controller = new AbortController();
        setLoading(true);
        setFailed(false);
        const fileUrl = `/hsc-notes/${chapter.file.split("/").map(encodeURIComponent).join("/")}`;
        fetch(fileUrl, { signal: controller.signal })
            .then((response) => {
                if (!response.ok) throw new Error("Note file was not found.");
                return response.text();
            })
            .then((markdown) => setContent(markdown))
            .catch((error) => {
                if (error.name !== "AbortError") setFailed(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [chapter, level, retryKey]);

    if (level !== "HSC") return <EmptyState title="এই স্তরের নোট এখনো প্রস্তুত নয়" detail="বর্তমানে শুধু HSC নোটস পাওয়া যাচ্ছে।"/>;
    if (!subject || !chapter) return <EmptyState title="অধ্যায়টি পাওয়া যায়নি" detail="এই অধ্যায়ের নোট ক্যাটালগে নেই বা লিংকটি ঠিক নয়।"/>;

    const streamName = noteStreams.find((item) => item.id === stream)?.name || "HSC";
    const chapterHref = `/notes/${subject.shortCode}?stream=${stream.toLowerCase()}&paper=${subject.paper}`;
    const previous = subject.chapters[chapterIndex - 1];
    const next = subject.chapters[chapterIndex + 1];
    const markdownBody = content.replace(/^#{1,2}\s+[^\r\n]*(?:\r?\n)+/, "");

    return <>
        <Link href={chapterHref} className="ghost mb-5 inline-flex items-center gap-2"><ArrowLeft size={16}/> অধ্যায় তালিকা</Link>
        <header className="panel mb-5 p-5 sm:p-7">
            <div className="eyebrow">{subject.name} · {streamName}</div>
            <h1 className="mt-2 text-2xl font-semibold leading-snug text-white sm:text-3xl">{chapter.title}</h1>
            <p className="mt-2 text-sm text-white/55">HSC Notes · {subject.paper === 1 ? "১ম পত্র" : "২য় পত্র"}</p>
        </header>

        <article className="notes-reader panel min-w-0 overflow-hidden p-4 sm:p-7 lg:p-10">
            {loading ? <LoadingState compact title="নোট প্রস্তুত হচ্ছে" detail="অধ্যায়ের পাঠ খুলছি…" className="min-h-64"/>
                : failed ? <div role="status" className="notes-empty mx-auto max-w-lg py-12 text-center">
                    <BookOpen className="mx-auto text-white/40" size={30}/>
                    <h2 className="mt-4 text-xl font-semibold text-white">নোটটি এখন খোলা যাচ্ছে না</h2>
                    <p className="mt-2 text-sm text-white/60">ফাইলটি সাময়িকভাবে পাওয়া যাচ্ছে না। আবার চেষ্টা করো।</p>
                    <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="primary mt-5 inline-flex items-center gap-2"><RotateCw size={15}/> আবার লোড করো</button>
                </div> : <div className="notes-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                        img: ({ src, alt }) => <figure><img src={src} alt={alt || ""} loading="lazy" decoding="async"/>{alt && <figcaption>{alt}</figcaption>}</figure>,
                        a: ({ href, children }) => <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer" : undefined}>{children}</a>,
                        table: ({ children }) => <div className="notes-table-wrap"><table>{children}</table></div>
                    }}>{markdownBody}</ReactMarkdown>
                </div>}
        </article>

        <nav aria-label="অধ্যায় নেভিগেশন" className="mt-4 flex items-stretch justify-between gap-3">
            {previous ? <Link href={`/notes/${subject.code}/${previous.slug}?stream=${stream.toLowerCase()}`} className="ghost flex min-w-0 items-center gap-2"><ArrowLeft size={16}/><span className="truncate">{previous.title}</span></Link> : <span/>}
            {next && <Link href={`/notes/${subject.code}/${next.slug}?stream=${stream.toLowerCase()}`} className="ghost flex min-w-0 items-center gap-2 text-right"><span className="truncate">{next.title}</span><ArrowRight size={16}/></Link>}
        </nav>
    </>;
}

function EmptyState({ title, detail }) {
    return <section className="notes-empty panel mx-auto my-8 max-w-2xl p-8 text-center sm:p-12">
        <BookOpen className="mx-auto text-white/40" size={30}/>
        <h1 className="mt-4 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-7 text-white/60">{detail}</p>
        <Link href="/notes" className="ghost mt-5 inline-flex items-center gap-2"><ArrowLeft size={15}/> নোটসে ফিরুন</Link>
    </section>;
}

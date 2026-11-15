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

// Display-only: strip leading "অধ্যায় ১:" / "Chapter 1:" prefixes.
const CHAPTER_PREFIX = /^\s*(?:অধ্যায়|Chapter)\s*[০-৯0-9]+\s*[::：.\-–—)]\s*/i;

function formatChapterTitle(title) {
    if (!title) return "";
    return title.replace(CHAPTER_PREFIX, "").trim() || title;
}

const mobileReaderStyles = `
@media (max-width: 639px) {
    .notes-reader.panel {
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        padding: 0.75rem 1rem 7rem;
    }
    .notes-reader .notes-markdown p,
    .notes-reader .notes-markdown li {
        font-size: 15.5px;
        line-height: 1.78;
        color: rgba(231,237,247,0.9);
        margin-bottom: 0.875rem;
    }
    .notes-reader .notes-markdown li { margin-bottom: 0.5rem; }
    .notes-reader .notes-markdown h1 {
        font-size: 22px; line-height: 1.3; font-weight: 700; color: #fff;
        margin: 1.5rem 0 0.75rem;
    }
    .notes-reader .notes-markdown h2 {
        font-size: 18px; line-height: 1.4; font-weight: 700; color: #fff;
        margin: 1.75rem 0 0.75rem; padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .notes-reader .notes-markdown h3 {
        font-size: 15.5px; font-weight: 700; color: #bae6fd;
        margin: 1.25rem 0 0.5rem;
    }
    .notes-reader .notes-markdown blockquote {
        border-radius: 0.75rem; border-left: 4px solid #38bdf8;
        background: rgba(255,255,255,0.04);
        padding: 0.75rem 0.875rem; margin: 1rem 0;
        font-size: 14.5px; line-height: 1.7;
    }
    .notes-reader .notes-markdown strong { color: #fff; font-weight: 700; }
    .notes-reader .notes-markdown code {
        background: rgba(255,255,255,0.07); padding: 0.1em 0.35em;
        border-radius: 4px; font-size: 0.9em;
    }
    .notes-reader .notes-markdown pre {
        overflow-x: auto; border-radius: 0.75rem;
        background: #18181c; border: 1px solid rgba(255,255,255,0.1);
        padding: 0.75rem 1rem; margin: 1rem 0;
        font-size: 13px; line-height: 1.5;
        -webkit-overflow-scrolling: touch;
    }
    .notes-reader .notes-markdown figure {
        margin: 1rem 0; display: flex; flex-direction: column; align-items: center;
    }
    .notes-reader .notes-markdown figcaption {
        margin-top: 0.375rem; text-align: center;
        font-size: 11.5px; color: rgba(231,237,247,0.55);
    }
    .notes-reader .notes-markdown .katex-display {
        margin: 1rem 0; overflow-x: auto; overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1);
        background: #18181c; padding: 0.75rem 1rem; text-align: center;
    }
    .notes-reader .notes-markdown .katex { font-size: 0.95em; }
    .notes-reader .notes-markdown table { font-size: 13px; }
    .notes-reader .notes-markdown th {
        background: rgba(255,255,255,0.06);
        padding: 0.5rem 0.75rem;
        text-align: left; font-weight: 700; color: #fff;
        white-space: nowrap;
    }
    .notes-reader .notes-markdown td {
        border-top: 1px solid rgba(255,255,255,0.06);
        padding: 0.5rem 0.75rem;
        color: rgba(231,237,247,0.85);
        line-height: 1.4;
    }
    .notes-reader .notes-markdown .notes-table-wrap {
        margin: 1rem 0; width: 100%; overflow-x: auto;
        border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1);
        background: #1a1a1f;
        -webkit-overflow-scrolling: touch;
    }
    .notes-reader .notes-markdown .katex-display::-webkit-scrollbar,
    .notes-reader .notes-markdown .notes-table-wrap::-webkit-scrollbar {
        height: 6px;
    }
    .notes-reader .notes-markdown .katex-display::-webkit-scrollbar-thumb,
    .notes-reader .notes-markdown .notes-table-wrap::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.15); border-radius: 3px;
    }
}
`;

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

    if (level !== "HSC") return <EmptyState title="এই স্তরের নোট এখনো প্রস্তুত নয়" detail="বর্তমানে শুধু HSC নোটস পাওয়া যাচ্ছে।"/>;
    if (!subject || !chapter) return <EmptyState title="অধ্যায়টি পাওয়া যায়নি" detail="এই অধ্যায়ের নোট ক্যাটালগে নেই বা লিংকটি ঠিক নয়।"/>;

    const streamName = noteStreams.find((item) => item.id === stream)?.name || "HSC";
    const chapterHref = `/notes/${subject.shortCode}?stream=${stream.toLowerCase()}&paper=${subject.paper}`;
    const previous = subject.chapters[chapterIndex - 1];
    const next = subject.chapters[chapterIndex + 1];
    const displayTitle = formatChapterTitle(chapter.title);
    const markdownBody = content.replace(/^#{1,2}\s+[^\r\n]*(?:\r?\n)+/, "");

    return <>
        <style>{mobileReaderStyles}</style>

        {/* Mobile sticky reading sub-header */}
        <div className="sticky top-14 z-20 -mx-4 mb-3 flex items-center gap-2 border-b border-white/[0.08] bg-[#202020]/92 px-4 py-2.5 backdrop-blur-xl sm:hidden">
            <Link href={chapterHref} aria-label="অধ্যায় তালিকায় ফিরুন" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.06] text-white/85">
                <ArrowLeft size={14}/>
            </Link>
            <span className="truncate text-xs font-bold text-white">{displayTitle}</span>
        </div>

        {/* Desktop back link */}
        <Link href={chapterHref} className="ghost mb-5 hidden items-center gap-2 sm:inline-flex"><ArrowLeft size={16}/> অধ্যায় তালিকা</Link>

        {/* Desktop header */}
        <header className="panel mb-5 hidden p-5 sm:block sm:p-7">
            <div className="eyebrow">{subject.name} · {streamName}</div>
            <h1 className="mt-2 text-2xl font-semibold leading-snug text-white sm:text-3xl">{displayTitle}</h1>
            <p className="mt-2 text-sm text-white/55">HSC Notes · {subject.paper === 1 ? "১ম পত্র" : "২য় পত্র"}</p>
        </header>

        <article className="notes-reader panel min-w-0 overflow-hidden sm:p-7 lg:p-10">
            {loading ? <LoadingState compact title="নোট প্রস্তুত হচ্ছে" detail="অধ্যায়ের পাঠ খুলছি…" className="min-h-64"/>
                : failed ? <div role="status" className="notes-empty mx-auto max-w-lg py-12 text-center">
                    <BookOpen className="mx-auto text-white/40" size={30}/>
                    <h2 className="mt-4 text-xl font-semibold text-white">নোটটি এখন খোলা যাচ্ছে না</h2>
                    <p className="mt-2 text-sm text-white/60">ফাইলটি সাময়িকভাবে পাওয়া যাচ্ছে না। আবার চেষ্টা করো।</p>
                    <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="primary mt-5 inline-flex items-center gap-2"><RotateCw size={15}/> আবার লোড করো</button>
                </div> : <div className="notes-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                        img: ({ src, alt }) => <figure>
                            <img
                                src={src}
                                alt={alt || ""}
                                loading="lazy"
                                decoding="async"
                                className="w-full max-w-[440px] max-h-[300px] object-contain rounded-xl border border-white/10 bg-[#18181c] p-2 mx-auto"
                            />
                            {alt && <figcaption className="mt-1.5 text-center text-[11.5px] text-paper/55">{alt}</figcaption>}
                        </figure>,
                        a: ({ href, children }) => <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer" : undefined}>{children}</a>,
                        table: ({ children }) => <div className="notes-table-wrap"><table>{children}</table></div>
                    }}>{markdownBody}</ReactMarkdown>
                </div>}
        </article>

        <nav aria-label="অধ্যায় নেভিগেশন" className="mt-4 flex items-stretch justify-between gap-3">
            {previous ? <Link href={`/notes/${subject.code}/${previous.slug}?stream=${stream.toLowerCase()}`} className="ghost flex min-w-0 items-center gap-2"><ArrowLeft size={16}/><span className="truncate">{formatChapterTitle(previous.title)}</span></Link> : <span/>}
            {next && <Link href={`/notes/${subject.code}/${next.slug}?stream=${stream.toLowerCase()}`} className="ghost flex min-w-0 items-center gap-2 text-right"><span className="truncate">{formatChapterTitle(next.title)}</span><ArrowRight size={16}/></Link>}
        </nav>
    </>;
}

function EmptyState({ title, detail }) {
    return <section className="notes-empty panel mx-auto my-8 max-w-2xl p-6 text-center sm:p-12">
        <BookOpen className="mx-auto text-white/40" size={30}/>
        <h1 className="mt-4 text-xl font-semibold text-white sm:text-2xl">{title}</h1>
        <p className="mt-2 text-sm leading-7 text-white/60">{detail}</p>
        <Link href="/notes" className="ghost mt-5 inline-flex items-center gap-2"><ArrowLeft size={15}/> নোটসে ফিরুন</Link>
    </section>;
}
import { memo } from "react";
import { Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const statementIndexes = ["i", "ii", "iii", "iv"];

const imageMarker = /\[IMG:\s*(https?:\/\/[^\]\s]+)\s*\]/gi;
const optionPrefix = /^(?:\s*[কখগঘ]\s*[).ঃ:-]\s*)+/;
const statementPrefix = /^(?:\s*(?:\(?[ivxlcdm]+\)?|[০-৯0-9]+|[কখগঘ])\s*[).ঃ:-]\s*)+/i;

function preserveHtmlAsText() {
    return (tree) => {
        const visit = (node) => {
            if (!Array.isArray(node.children)) return;
            node.children = node.children.map((child) => {
                if (child.type === "html") return { type: "text", value: child.value };
                visit(child);
                return child;
            });
        };
        visit(tree);
    };
}

function stripUnmatchedMathDelimiters(value) {
    const matches = [...value.matchAll(/\\?(\${1,2})/g)];
    const pending = new Map();
    for (const match of matches) {
        if (match[0].startsWith("\\")) continue;
        const token = match[1];
        const index = (match.index ?? 0) + match[0].length - token.length;
        if (pending.has(token)) {
            pending.delete(token);
        } else {
            pending.set(token, index);
        }
    }
    const unmatched = [...pending].map(([token, index]) => ({ index, length: token.length }))
        .sort((left, right) => left.index - right.index);
    if (!unmatched.length) return value;
    let result = "";
    let cursor = 0;
    for (const { index, length } of unmatched) {
        result += value.slice(cursor, index);
        cursor = index + length;
    }
    return result + value.slice(cursor);
}

function isInsideMath(value, index) {
    const pending = new Set();
    for (const match of value.slice(0, index).matchAll(/\\?(\${1,2})/g)) {
        if (match[0].startsWith("\\")) continue;
        const delimiter = match[1];
        if (pending.has(delimiter)) pending.delete(delimiter);
        else pending.add(delimiter);
    }
    return [...pending].some((delimiter) => value.indexOf(delimiter, index) !== -1);
}

function normalizeRepeatedUnitVariants(value) {
    const number = "[0-9০-৯]+(?:[.,][0-9০-৯]+)?";
    const unit = "[A-Za-zµμΩ°]+(?:/[A-Za-zµμΩ°]+)*";
    const pattern = new RegExp(
        String.raw`(${number}\s*${unit})\s*(\$?)(${number}\\\s*\\text\{(?:${unit})\})(\$?)\s*(${number}\s*${unit})`,
        "g"
    );
    const normalize = (text) => text
        .replace(/\\\s+/g, " ")
        .replace(/\\text\{([^{}]*)\}/g, "$1")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    return value.replace(pattern, (match, before, opening, math, closing, after) => {
        if (opening !== closing || normalize(before) !== normalize(math) || normalize(math) !== normalize(after)) {
            return match;
        }
        return `$${math.trim()}$`;
    });
}

function normalizeBareTexUnits(value) {
    const number = "[0-9০-৯]+(?:[.,][0-9০-৯]+)?";
    const unit = "[A-Za-zµμΩ°]+(?:/[A-Za-zµμΩ°]+)*";
    const pattern = new RegExp(String.raw`(${number}\\\s*\\text\{(?:${unit})\})`, "g");
    return value.replace(pattern, (match, expression, offset, source) =>
        isInsideMath(source, offset) ? match : `$${expression}$`
    );
}

function normalizeMathSource(value) {
    const delimited = value
        .replace(/\\\(([\s\S]+?)\\\)/g, (_, expression) => `$${expression}$`)
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, expression) => `$$${expression}$$`);
    const matrix = /([A-Za-z]\s*=\s*)?((?:\\left\s*(?:\[|\()\s*)?\\begin\{(bmatrix|pmatrix|Bmatrix|vmatrix|Vmatrix|matrix|smallmatrix|array)\}(?:\{[^{}]*\})?[\s\S]*?\\end\{\3\}(?:\s*\\right\s*(?:\]|\)))?)/g;
    return normalizeBareTexUnits(normalizeRepeatedUnitVariants(delimited)).replace(matrix, (expression, prefix = "", _whole, _environment, offset, source) =>
        isInsideMath(source, offset + prefix.length) ? expression : `$${prefix}${_whole}$`
    );
}

function isSafeImageUrl(value) {
    try {
        return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
        return false;
    }
}

function markdownComponents(option, compact) {
    return {
        p: ({ children }) => option
            ? <span>{children}</span>
            : <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
        code: ({ children, className }) => <code className={`rounded bg-black/25 px-1 py-0.5 font-mono text-[.9em] text-sky-200 ${className || ""}`}>{children}</code>,
        pre: ({ children }) => <pre className="my-2 max-w-full overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-zinc-200">{children}</pre>,
        a: ({ href, children }) => <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer" : undefined} className="text-sky-300 underline decoration-sky-300/40 underline-offset-2">{children}</a>,
        img: ({ src, alt }) => isSafeImageUrl(src) ? <img
            src={src}
            alt={alt || "প্রশ্নের চিত্র"}
            loading="lazy"
            decoding="async"
            className={`mx-auto my-2 h-auto max-w-full rounded-lg bg-white p-2 object-contain ${compact ? "max-h-36" : "max-h-80"}`}
        /> : null,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-sky-500/40 pl-3 text-zinc-300">{children}</blockquote>,
        table: ({ children }) => <div className="my-2 max-w-full overflow-x-auto"><table className="border-collapse text-left">{children}</table></div>
    };
}

export function normalizeOption(value) {
    return String(value ?? "").replace(optionPrefix, "");
}

export const McqContent = memo(function McqContent({ value, option = false, compact = false }) {
    const source = option ? normalizeOption(value) : String(value ?? "");
    const text = stripUnmatchedMathDelimiters(normalizeMathSource(source));
    const parts = [];
    let lastIndex = 0;

    for (const match of text.matchAll(imageMarker)) {
        const index = match.index ?? 0;
        if (index > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, index), key: `text-${lastIndex}` });
        if (isSafeImageUrl(match[1])) parts.push({ type: "image", value: match[1], key: `image-${index}` });
        lastIndex = index + match[0].length;
    }
    if (lastIndex < text.length || parts.length === 0) {
        parts.push({ type: "text", value: text.slice(lastIndex), key: `text-${lastIndex}` });
    }

    return <div className="min-w-0 break-words [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto">
        {parts.map((part) => part.type === "image"
            ? <div key={part.key} className="my-2">
                <img
                    src={part.value}
                    alt="প্রশ্নের চিত্র"
                    loading="lazy"
                    decoding="async"
                    className={`mx-auto h-auto max-w-full rounded-lg bg-white p-2 object-contain ${compact ? "max-h-36" : "max-h-80"}`}
                />
            </div>
            : <ReactMarkdown
                key={part.key}
                remarkPlugins={[remarkMath, remarkGfm, preserveHtmlAsText]}
                rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
                components={markdownComponents(option, compact)}
            >{part.value}</ReactMarkdown>)}
    </div>;
});

export const McqPrompt = memo(function McqPrompt({ question, large = false }) {
    return <>
        {question.context && <div className={`mb-5 rounded-xl border border-white/10 bg-white/[.03] p-4 leading-relaxed text-zinc-300 sm:p-5 ${large ? "text-base sm:text-lg" : "text-sm leading-7"}`}>
            <div className="mb-2 text-xs font-semibold text-zinc-500">উদ্দীপক</div>
            <McqContent value={question.context}/>
        </div>}
        <div className={large ? "text-xl font-semibold leading-snug text-white sm:text-2xl" : "text-base font-medium leading-relaxed text-zinc-100 md:text-[17px]"}>
            <McqContent value={question.question}/>
            {isSafeImageUrl(question.image?.url) && <img
                src={question.image.url}
                alt="প্রশ্নের চিত্র"
                loading="lazy"
                decoding="async"
                className="mx-auto mt-4 h-auto max-h-96 max-w-full rounded-xl bg-white p-2 object-contain"
            />}
        </div>
        {question.sub_statements?.length > 0 && <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-[#191c23] p-4 sm:p-5">
            {question.sub_statements.map((statement, index) => (
                <div key={`${index}-${statement}`} className={`flex items-start gap-3 leading-7 text-zinc-200 ${large ? "text-base sm:text-lg" : "text-sm md:text-base"}`}>
                    <span className="mt-0.5 grid h-6 min-w-6 place-items-center rounded-md border border-sky-500/20 bg-sky-500/10 px-1 text-[11px] font-semibold text-sky-300">
                        {statementIndexes[index] || index + 1}
                    </span>
                    <div className="min-w-0 flex-1"><McqContent value={String(statement).replace(statementPrefix, "")}/></div>
                </div>
            ))}
        </div>}
        {question.sub_question && <div className={`mt-5 rounded-xl border border-white/10 bg-white/[.03] p-4 leading-7 text-zinc-200 sm:p-5 ${large ? "text-base sm:text-lg" : "text-sm"}`}>
            <div className="mb-2 text-xs font-semibold text-zinc-500">প্রশ্ন</div>
            <McqContent value={question.sub_question}/>
        </div>}
    </>;
});

export const McqOptionBody = memo(function McqOptionBody({ value, label, selected = false, status = "selected", large = false }) {
    const toneClasses = {
        selected: "bg-sky-500 text-white",
        correct: "bg-emerald-500 text-white",
        incorrect: "bg-rose-500 text-white"
    };
    const statusClasses = {
        selected: "text-sky-300",
        correct: "text-emerald-300",
        incorrect: "text-rose-300"
    };
    return <>
        <span className={`grid ${large ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs"} shrink-0 place-items-center rounded-lg font-semibold ${selected ? toneClasses[status] : "bg-white/5 text-zinc-400"}`}>
            {label}
        </span>
        <div className={`min-w-0 flex-1 leading-6 ${large ? "text-base sm:text-lg" : "text-sm md:text-base"}`}>
            <McqContent value={value} option compact/>
        </div>
        {selected && <span className={`shrink-0 ${statusClasses[status]}`}>{status === "incorrect" ? <X size={16}/> : <Check size={16}/>}</span>}
    </>;
});

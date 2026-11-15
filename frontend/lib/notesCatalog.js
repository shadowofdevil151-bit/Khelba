import catalog from "@/data/notesCatalog.json";

export const noteStreams = catalog.streams;

export function notesForStream(stream) {
    return catalog.subjects.filter((subject) => subject.streams.includes(stream));
}

export function notesSubjectsForStream(stream) {
    const subjects = new Map();
    for (const paper of notesForStream(stream)) {
        if (!subjects.has(paper.shortCode)) subjects.set(paper.shortCode, paper);
    }
    return [...subjects.values()];
}

export function notesPapersForSubject(shortCode) {
    return catalog.subjects
        .filter((subject) => subject.shortCode === String(shortCode).toUpperCase())
        .sort((left, right) => left.paper - right.paper);
}

export function findNotesSubject(code) {
    const normalized = String(code ?? "").trim().toUpperCase();
    return catalog.subjects.find((subject) => subject.code.toUpperCase() === normalized)
        || catalog.subjects.find((subject) => subject.shortCode.toUpperCase() === normalized && subject.paper === 1)
        || null;
}

export function findNotesChapter(subject, slug) {
    const normalized = String(slug ?? "").trim().toLowerCase();
    return subject?.chapters.find((chapter) =>
        chapter.slug.toLowerCase() === normalized
        || chapter.file.split("/").at(-1).replace(/\.md$/i, "").toLowerCase() === normalized
    ) || null;
}

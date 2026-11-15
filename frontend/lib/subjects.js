import chapterIndex from "@/data/hscNotesChapterIndex.json";
import notesCatalog from "@/data/notesCatalog.json";

const normalizeCode = (code) => {
    const value = String(code ?? "").trim().toUpperCase();
    return /^\d+$/.test(value) ? `HSC-${value}` : value;
};

const indexedSubjects = chapterIndex.map((subject) => {
    const metadata = notesCatalog.subjects.find((item) =>
        item.name === subject.subject_name && item.paper === subject.paper
    );
    const streams = metadata?.streams || ["SCIENCE", "ARTS", "COMMERCE"];
    const shortCode = metadata?.shortCode || (subject.subject_name === "পরিসংখ্যান" ? "STAT" : subject.subject_code);
    const orderedChapters = [...subject.chapters]
        .sort((left, right) => left.chapter_index - right.chapter_index);
    const chapterSections = new Map((metadata?.chapters || []).map((chapter) => [
        String(chapter.title ?? "").normalize("NFC").trim(),
        chapter.section || null
    ]));
    const chapters = orderedChapters.map((chapter) => chapter.chapter_name);

    return {
        code: subject.subject_code,
        shortCode,
        paper: subject.paper,
        streams,
        name: subject.subject_name,
        shortName: subject.subject_name,
        totalChapters: chapters.length,
        chapterSections: orderedChapters.map((chapter) =>
            chapterSections.get(chapter.chapter_name.normalize("NFC").trim()) || null
        ),
        chapterNumbers: orderedChapters.map((chapter) => chapter.chapter_index),
        chapters
    };
});

function groupSubjects(subjects) {
    const groups = new Map();
    for (const paper of subjects) {
        if (!groups.has(paper.name)) {
            groups.set(paper.name, {
                code: paper.shortCode,
                shortCode: paper.shortCode,
                name: paper.name,
                streams: [],
                papers: []
            });
        }
        const group = groups.get(paper.name);
        group.papers.push(paper);
        group.streams = [...new Set([...group.streams, ...paper.streams])];
    }

    return [...groups.values()].map((subject) => {
        subject.papers.sort((left, right) => left.paper - right.paper);
        subject.totalChapters = subject.papers.reduce((count, paper) => count + paper.totalChapters, 0);
        return subject;
    });
}

export const subjectsFor = () => {
    const multiPaperSubjects = new Set(
        groupSubjects(indexedSubjects)
            .filter((subject) => subject.papers.length > 1)
            .map((subject) => subject.name)
    );
    return indexedSubjects.map((subject) => ({
        ...subject,
        name: multiPaperSubjects.has(subject.name)
            ? `${subject.name} (${subject.paper === 1 ? "১ম" : "২য়"} পত্র)`
            : subject.name
    }));
};

export const academySubjectsForStream = (stream) =>
    groupSubjects(indexedSubjects.filter((subject) => subject.streams.includes(stream)));

export const subjectByCode = (code) =>
    indexedSubjects.find((subject) => subject.code === normalizeCode(code));

export const academyPapersForSubject = (code) => {
    const normalized = normalizeCode(code);
    const indexed = indexedSubjects.find((subject) => subject.code === normalized);
    const shortCode = indexed?.shortCode || normalized;
    const names = new Set(indexedSubjects
        .filter((subject) => subject.shortCode === shortCode)
        .map((subject) => subject.name));

    return indexedSubjects
        .filter((subject) => names.has(subject.name))
        .sort((left, right) => left.paper - right.paper);
};

export const subjectCodeForPaper = (code, paper) => {
    const papers = academyPapersForSubject(code);
    const selectedPaper = Number(paper);
    return papers.find((item) => item.paper === selectedPaper)?.code
        || subjectByCode(code)?.code
        || normalizeCode(code);
};

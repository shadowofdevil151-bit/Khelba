import NotesChapterPage from "@/features/notes/pages/NotesChapterPage";

export default function Page({ params }) {
    return <NotesChapterPage subjectCode={params.subject} chapterSlug={params.chapter}/>;
}

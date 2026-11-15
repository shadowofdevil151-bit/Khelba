import NotesSubjectPage from "@/features/notes/pages/NotesSubjectPage";

export default function Page({ params }) {
    return <NotesSubjectPage subjectCode={params.subject}/>;
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(scriptDirectory, "..");
const notesDirectory = path.join(frontendDirectory, "public", "hsc-notes");
const outputFile = path.join(frontendDirectory, "data", "notesCatalog.json");
const definitions = JSON.parse(fs.readFileSync(path.join(frontendDirectory, "data", "notesSubjects.json"), "utf8"));

const streamNames = {
    SCIENCE: "বিজ্ঞান",
    ARTS: "মানবিক",
    COMMERCE: "ব্যবসায় শিক্ষা"
};
const filesIn = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(fullPath);
    return entry.isFile() && entry.name.endsWith(".md") ? [fullPath] : [];
});

const subjects = fs.readdirSync(notesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
        const match = entry.name.match(/^([A-Z]+)(?:-(\d+)(?:st|nd))?$/i);
        if (!match) return [];
        const [, folderCode, paperText] = match;
        const shortCode = folderCode.toUpperCase();
        const definition = definitions[shortCode];
        if (!definition) throw new Error(`Missing subject name for ${shortCode}.`);
        const paper = paperText ? Number(paperText) : 1;
        const subjectDirectory = path.join(notesDirectory, entry.name);
        const chapters = filesIn(subjectDirectory).map((file) => {
            const contents = fs.readFileSync(file, "utf8");
            const heading = contents.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim();
            const section = shortCode === "BNG" && paper === 1
                ? path.basename(path.dirname(file)).toLowerCase()
                : null;
            const poemTitle = section === "poetry"
                ? contents.match(/^\|\s*\*\*কবিতার নাম\*\*\s*\|\s*(.+?)\s*\|$/m)?.[1]?.trim()
                : null;
            const title = poemTitle || heading?.replace(/^📌\s*/, "").replace(/^📘\s*/, "").trim();
            if (!title) throw new Error(`Missing chapter heading: ${path.relative(notesDirectory, file)}.`);
            const relativeFile = path.relative(subjectDirectory, file).replace(/\\/g, "/");
            return {
                slug: relativeFile.replace(/\.md$/i, "").replace(/\//g, "-").toLowerCase(),
                title,
                ...(section ? { section } : {}),
                file: path.relative(notesDirectory, file).replace(/\\/g, "/")
            };
        }).sort((left, right) => left.slug.localeCompare(right.slug, "en", { numeric: true }));

        return [{
            code: paperText ? entry.name : `${shortCode}-1st`,
            shortCode,
            paper,
            name: definition.name,
            streams: definition.streams,
            chapterCount: chapters.length,
            chapters
        }];
    })
    .sort((left, right) => left.shortCode.localeCompare(right.shortCode) || left.paper - right.paper);

if (!subjects.length) throw new Error("No HSC note folders were found.");

const catalog = {
    level: "HSC",
    streams: Object.entries(streamNames).map(([id, name]) => ({ id, name })),
    subjects
};
fs.writeFileSync(outputFile, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(frontendDirectory, outputFile)} with ${subjects.length} papers and ${subjects.reduce((total, subject) => total + subject.chapterCount, 0)} chapters.`);

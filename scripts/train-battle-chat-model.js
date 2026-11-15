import { mkdir, writeFile } from "node:fs/promises";
import natural from "natural";
import {
    BOT_CHAT_INTENT_EXAMPLES,
    normalizeIntentText,
    tokenizeIntent
} from "../src/modules/battle/battle.bot-chat.dialogues.js";

const typoVariants = (phrase) => {
    const wordIndex = phrase.split(" ").findIndex((word) => word.length >= 5);
    if (wordIndex === -1) return [phrase];
    const words = phrase.split(" ");
    const word = words[wordIndex];
    const typo = word.length > 5 ? word.slice(0, 3) + word.slice(4) : `${word}${word.at(-1)}`;
    words[wordIndex] = typo;
    return [phrase, words.join(" ")];
};

const buildTrainingPhrases = () => {
    const phrases = [];
    const wrappers = [
        "",
        "bhai ",
        "bro ",
        "arey ",
        "oi ",
        "yaar "
    ];
    const endings = ["", " bhai", " re"];

    for (const [intent, examples] of Object.entries(BOT_CHAT_INTENT_EXAMPLES)) {
        for (const example of examples) {
            const normalized = normalizeIntentText(example);
            const variants = new Set();
            for (const typoVariant of typoVariants(normalized)) {
                for (const wrapper of wrappers) {
                    for (const ending of endings) {
                        variants.add(`${wrapper}${typoVariant}${ending}`.trim());
                    }
                }
            }
            for (const text of variants) {
                if (text) phrases.push({ intent, text });
            }
        }
    }
    return phrases;
};

const trainingPhrases = buildTrainingPhrases();
const classifier = new natural.BayesClassifier();

for (const { intent, text } of trainingPhrases) {
    classifier.addDocument(tokenizeIntent(text), intent);
}

classifier.train();
await mkdir(new URL("../models/", import.meta.url), { recursive: true });
await writeFile(
    new URL("../models/battle-bot-intent.json", import.meta.url),
    JSON.stringify(classifier)
);

console.log(`Saved ${trainingPhrases.length} training phrases.`);

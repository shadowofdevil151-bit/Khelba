import test from "node:test";
import assert from "node:assert/strict";
import {
    BOT_CHAT_DIALOGUE_BANK,
    BOT_CHAT_INTENT_EXAMPLES,
    BOT_CHAT_PERSONALITIES,
    BOT_CHAT_TRAINING_PHRASE_COUNT,
    classifyBotChatIntent,
    contextualizeBotChatCategory,
    createBotChatProfile,
    getBotChatCandidates,
    getBotChatReplyDelay,
    getBotChatReadDelay,
    getBotChatTypingDelay,
    getBotReplyChancePercent
} from "../src/modules/battle/battle.bot-chat.dialogues.js";
import { BATTLE_BOT_CHAT } from "../src/modules/battle/battle.constants.js";
import { createBattleState } from "../src/modules/battle/battle.state.js";

test("bot chat profile uses the lower talkative probability and one match personality", () => {
    let calls = 0;
    const talkative = createBotChatProfile(() => [1, 14][calls++]);
    assert.equal(talkative.personality, BOT_CHAT_PERSONALITIES[1]);
    assert.equal(talkative.canProactivelyChat, true);

    calls = 0;
    const quiet = createBotChatProfile(() => [2, 15][calls++]);
    assert.equal(quiet.personality, BOT_CHAT_PERSONALITIES[2]);
    assert.equal(quiet.canProactivelyChat, false);
    assert.equal(BATTLE_BOT_CHAT.TALKATIVE_CHANCE_PERCENT, 15);
    assert.deepEqual(
        BATTLE_BOT_CHAT.REACTIVE_REPLY_CHANCES_PERCENT,
        [90, 84, 78, 72, 67, 62, 57, 52, 48, 44, 40, 36]
    );
    assert.deepEqual(BATTLE_BOT_CHAT.PROACTIVE_CHANCES_PERCENT, {
        opening: 8,
        "mid-game": 5,
        "final-question": 8,
        "round-result": 35
    });
});

test("bot chat profile is stored in bot battle state", () => {
    const state = createBattleState({
        battleId: "battle-test",
        subjectCode: "275",
        chapter: 5,
        questions: [{ answer: "ক" }],
        players: [{ _id: "player" }, { _id: "bot" }],
        botUserId: "bot",
        botChatProfile: {
            personality: "laid_back_gamer",
            canProactivelyChat: true
        }
    });

    assert.equal(state.bot_chat_personality, "laid_back_gamer");
    assert.equal(state.bot_can_proactively_chat, true);
});

test("chat input maps common Bangla, Banglish, and English intents", () => {
    assert.equal(classifyBotChatIntent("hello bhai"), "greeting");
    assert.equal(classifyBotChatIntent("tumi kon class e poro?"), "social");
    assert.equal(classifyBotChatIntent("exam er jonno pori"), "study");
    assert.equal(classifyBotChatIntent("question ta tough"), "difficulty");
    assert.equal(classifyBotChatIntent("thanks bhai"), "thanks");
    assert.equal(classifyBotChatIntent("amar bhul hoyeche sorry"), "apology");
    assert.equal(classifyBotChatIntent("you are cute"), "compliment");
    assert.equal(classifyBotChatIntent("will you go out with me?"), "flirt");
    assert.equal(classifyBotChatIntent("good luck, you can do it"), "encouragement");
    assert.equal(classifyBotChatIntent("challenge accepted"), "challenge");
    assert.equal(classifyBotChatIntent("this is so boring"), "boredom");
    assert.equal(classifyBotChatIntent("you stupid idiot"), "boundary");
    assert.equal(classifyBotChatIntent("ajke ki korcho?"), "social");
    assert.equal(classifyBotChatIntent("oh i lost this round also"), "round_result");
    assert.equal(classifyBotChatIntent("tomar sathe coffee date e jabo?"), "flirt");
    assert.equal(classifyBotChatIntent("tell me about your hobbies"), "social");
    assert.equal(classifyBotChatIntent("ami answer ta bujhi nai"), "difficulty");
    assert.equal(classifyBotChatIntent("ami ektu tired"), "feeling");
    assert.equal(classifyBotChatIntent("bye, see you later"), "farewell");
    assert.equal(classifyBotChatIntent("noob, too easy"), "teasing");
    assert.equal(classifyBotChatIntent("hmm accha"), "fallback");
    assert.equal(classifyBotChatIntent("thanks, you are cute"), "compliment");
    assert.equal(classifyBotChatIntent("i lost this round also"), "round_result");
    assert.equal(classifyBotChatIntent("valo khelo"), "compliment");
    assert.equal(classifyBotChatIntent("kmn aso"), "greeting");
    assert.equal(classifyBotChatIntent("hmm", ["tell me about your hobbies"]), "social");
    assert.equal(classifyBotChatIntent("hmm", ["random words", "unrecognized"]), "fallback");
    for (const [intent, examples] of Object.entries(BOT_CHAT_INTENT_EXAMPLES)) {
        assert.ok(examples.length >= 3, `${intent} should have multilingual example phrases`);
        for (const example of examples) {
            assert.equal(classifyBotChatIntent(example), intent, `failed to classify: ${example}`);
        }
    }

    const candidates = getBotChatCandidates("casual_college_student", "greeting");
    assert.ok(candidates.some(({ id }) => id.startsWith("casual-greeting-")));
    assert.ok(candidates.every(({ id }) => id.startsWith("casual-greeting-")));
    assert.ok(getBotChatCandidates("casual_college_student", "fallback").every(
        ({ text }) => {
            const wordCount = text.trim().split(/\s+/u).length;
            return wordCount >= BATTLE_BOT_CHAT.MIN_REPLY_WORDS &&
                wordCount <= BATTLE_BOT_CHAT.MAX_REPLY_WORDS;
        }
    ));
    assert.throws(() => getBotChatCandidates("unknown", "greeting"), TypeError);
});

test("Natural.js classifier generalizes to unseen English and Bangla phrases", () => {
    const heldOut = {
        greeting: ["hey friend", "নমস্কার কেমন আছো"],
        social: ["which music do you listen to", "তোমার বাড়ি কোথায়"],
        thanks: ["i appreciate the help", "তোমাকে অনেক কৃতজ্ঞতা জানাই"],
        apology: ["please pardon my mistake", "আমার ভুলটা ক্ষমা করো"],
        compliment: ["you played that so well", "তোমার খেলা দারুণ ছিল"],
        flirt: ["i would take you on a date", "তোমার সাথে কথা বলতে ভালো লাগে"],
        encouragement: ["keep your head up you can win", "হাল ছেড়ো না, জিতে যাবে"],
        challenge: ["prove you can beat me", "দেখি আমায় হারাতে পারো কিনা"],
        boredom: ["im bored out of my mind", "কোনো কিছুতেই মন বসছে না"],
        boundary: ["dont speak to me that way", "আমার সাথে খারাপ ব্যবহার কোরো না"],
        feeling: ["i feel drained after today", "আজ মনটা একদম ভালো নেই"],
        farewell: ["see you next match", "আবার কথা হবে, এখন যাই"],
        teasing: ["youre such a noob haha", "আরে নুব, মজা করছি"],
        study: ["got to study for my test", "আজকে পড়াশোনা করতে হবে"],
        difficulty: ["this one has me confused", "এই উত্তরটা মিলাতে পারছি না"],
        round_result: ["i messed up that question", "এই প্রশ্নে আমার পয়েন্ট গেল"],
        game_state: ["im behind on the scoreboard", "তুমি আমার থেকে এগিয়ে আছ"],
        fallback: ["pencil river dance", "নীল জানালা পাখি"]
    };

    assert.ok(BOT_CHAT_TRAINING_PHRASE_COUNT > 1000);
    for (const [intent, phrases] of Object.entries(heldOut)) {
        for (const phrase of phrases) {
            assert.equal(classifyBotChatIntent(phrase), intent, `failed to classify: ${phrase}`);
        }
    }
});

test("bot reply candidates stay short for fast-paced battles", () => {
    for (const personality of BOT_CHAT_PERSONALITIES) {
        for (const category of Object.keys(BOT_CHAT_DIALOGUE_BANK[personality])) {
            const candidates = getBotChatCandidates(personality, category);
            assert.ok(candidates.length > 0);
            assert.ok(candidates.every(
                ({ text }) => {
                    const wordCount = text.trim().split(/\s+/u).length;
                    return Array.from(text).length <= BATTLE_BOT_CHAT.MAX_REPLY_LENGTH &&
                        wordCount >= BATTLE_BOT_CHAT.MIN_REPLY_WORDS &&
                        wordCount <= BATTLE_BOT_CHAT.MAX_REPLY_WORDS;
                }
            ));
        }
    }
});

test("reactive reply odds decline gradually and never reach a forced stop", () => {
    assert.equal(getBotReplyChancePercent(0), 0);
    assert.equal(getBotReplyChancePercent(1), 90);
    assert.equal(getBotReplyChancePercent(2), 84);
    assert.equal(getBotReplyChancePercent(3), 78);
    assert.equal(getBotReplyChancePercent(12), 36);
    assert.equal(getBotReplyChancePercent(13), BATTLE_BOT_CHAT.REACTIVE_REPLY_FLOOR_PERCENT);
    assert.equal(getBotReplyChancePercent(100), BATTLE_BOT_CHAT.REACTIVE_REPLY_FLOOR_PERCENT);
});

test("every personality has distinct phrases for responsive intents", () => {
    const intents = [
        "thanks", "apology", "compliment", "flirt", "encouragement",
        "challenge", "boredom", "boundary", "feeling", "farewell", "teasing",
        "round_won", "round_lost", "round_missed",
        "round_tied", "fallback"
    ];
    for (const personality of BOT_CHAT_PERSONALITIES) {
        const allIds = Object.values(BOT_CHAT_DIALOGUE_BANK[personality])
            .flat()
            .map(({ id }) => id);
        assert.equal(new Set(allIds).size, allIds.length);
        for (const intent of intents) {
            assert.ok(BOT_CHAT_DIALOGUE_BANK[personality][intent].length > 0);
        }
    }
});

test("game-state replies adapt to the bot's current lead", () => {
    const state = {
        botuserid: "bot",
        scores: { bot: 4, player: 3 }
    };
    assert.equal(contextualizeBotChatCategory(state, "game_state", "player"), "winning");
    assert.equal(
        contextualizeBotChatCategory({ ...state, scores: { bot: 2, player: 4 } }, "game_state", "player"),
        "losing"
    );
    assert.equal(
        contextualizeBotChatCategory({ ...state, scores: { bot: 3, player: 3 } }, "game_state", "player"),
        "game_state"
    );
    const streakState = {
        ...state,
        current_index: 2,
        questions: [{ answer: "ক" }, { answer: "খ" }, { answer: "গ" }],
        players_answers: { bot: { 0: "ক", 1: "খ" }, player: {} }
    };
    assert.equal(contextualizeBotChatCategory(streakState, "game_state", "player"), "winning_streak");
    assert.equal(
        contextualizeBotChatCategory({
            ...streakState,
            players_answers: { bot: {}, player: { 0: "ক", 1: "খ" } }
        }, "game_state", "player"),
        "losing_streak"
    );
    assert.equal(contextualizeBotChatCategory(state, "study", "player"), "study");
});

test("round-result chat reflects the bot and player's actual answers", () => {
    const state = {
        botuserid: "bot",
        players: ["bot", "player"],
        current_index: 1,
        questions: [{ answer: "ক" }, { answer: "খ" }],
        players_answers: {
            bot: { 0: "খ" },
            player: { 0: "ক" }
        }
    };
    assert.equal(contextualizeBotChatCategory(state, "round_result", "player"), "round_lost");
    assert.equal(
        contextualizeBotChatCategory({
            ...state,
            players_answers: { bot: { 0: "ক" }, player: { 0: "খ" } }
        }, "round_result", "player"),
        "round_won"
    );
    assert.equal(
        contextualizeBotChatCategory({
            ...state,
            players_answers: { bot: { 0: "ক" }, player: { 0: "ক" } }
        }, "round_result", "player"),
        "round_tied"
    );
    assert.equal(
        contextualizeBotChatCategory({
            ...state,
            players_answers: { bot: { 0: "খ" }, player: { 0: "খ" } }
        }, "round_result", "player"),
        "round_missed"
    );
    assert.equal(classifyBotChatIntent("oh i lost this round also"), "round_result");
});

test("reply and typing delays stay within configured human-like bounds", () => {
    assert.equal(getBotChatReadDelay(1, (min, max) => min), BATTLE_BOT_CHAT.READ_DELAY_MIN_MS);
    assert.equal(
        getBotChatReadDelay(500, (_min, max) => max - 1),
        BATTLE_BOT_CHAT.READ_DELAY_MAX_MS
    );
    assert.equal(getBotChatTypingDelay(1), BATTLE_BOT_CHAT.TYPING_MIN_MS);
    assert.equal(getBotChatTypingDelay(500), BATTLE_BOT_CHAT.TYPING_MAX_MS);
    assert.equal(getBotChatReplyDelay(1, 1, (min) => min), BATTLE_BOT_CHAT.READ_DELAY_MIN_MS);
    assert.ok(getBotChatReplyDelay(1, 8, (min) => min) >
        getBotChatReplyDelay(1, 1, (min) => min));
    assert.equal(getBotReplyChancePercent(13), BATTLE_BOT_CHAT.REACTIVE_REPLY_FLOOR_PERCENT);
    assert.ok(getBotReplyChancePercent(12) > getBotReplyChancePercent(13));
});

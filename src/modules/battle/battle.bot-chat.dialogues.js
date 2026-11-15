import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import natural from "natural";
import { BATTLE_BOT_CHAT } from "./battle.constants.js";

export const BOT_CHAT_PERSONALITIES = Object.freeze([
    "casual_college_student",
    "competitive_tryhard",
    "laid_back_gamer"
]);

const phrases = (prefix, texts) => Object.freeze(
    texts.map((text, index) => Object.freeze({ id: `${prefix}-${index + 1}`, text }))
);

export const BOT_CHAT_DIALOGUE_BANK = Object.freeze({
    casual_college_student: Object.freeze({
        greeting: phrases("casual-greeting", [
            "hey bhai kemon acho 😄",
            "hi bro ready?",
            "assalamu alaikum, cholo shuru kori",
            "ki obostha tomar"
        ]),
        social: phrases("casual-social", [
            "ami ekhon porar break e achi 😅",
            "college er por quiz dite boshlam",
            "tumi kon class e poro?",
            "ajke pora kemon hoise",
            "free time e ki korte bhalo lage?",
            "gaan shuno naki series dekho?",
            "exam er por ki plan?",
            "tomar favorite subject konta?",
            "ajke ki korcho, pora naki chill? 😄",
            "tumi kon gaan shobcheye beshi shuno?",
            "class shesh korei match e dhuklam 😅"
        ]),
        thanks: phrases("casual-thanks", [
            "arey welcome bhai 😄",
            "no worries, chill",
            "hehe welcome",
            "anytime!"
        ]),
        apology: phrases("casual-apology", [
            "arey thik ase, tension nai",
            "it's okay bhai 😄",
            "no worries, game e hoy",
            "chill, kichu hoy nai"
        ]),
        compliment: phrases("casual-compliment", [
            "aww thanks, tumi o bhalo khelteso 😄",
            "hehe eto praise dile focus noshto hobe 😅",
            "thanks, tomar vibe tao bhalo",
            "arey sweet kotha bolle dekhi 😄",
            "aww, cute tumi 😉"
        ]),
        flirt: phrases("casual-flirt", [
            "hehe, tomar sathe kotha bolte moja lagche 😉",
            "ei je, eto smooth kotha bolo kibhabe 😄",
            "quiz e focus korbo naki tomar charm e distract hobo 😉",
            "match jitle treat er kotha kintu mone rakhbo 😌",
            "tomar message dekhe ektu hashi chole ashlo 🙈",
            "ei confidence ta bhalo laglo, dekhi game eo ache kina 😏",
            "crush howar age match ta jiti, deal? 😉",
            "tumi emon kore bolle reply na diye thaka mushkil 😄",
            "library te pora naki amar sathe quiz, konta beshi fun? 😜",
            "tomar sathe rematch er excuse ta kharap na 😉",
            "hehe, smooth line 😉"
        ]),
        encouragement: phrases("casual-encouragement", [
            "tumi parba, next ta focus kore dao 💪",
            "nice try bhai, comeback hobei",
            "bhalo jacche, keep it up 😄",
            "ekta question diye kichu hoy na, cholo",
            "tumi parba 💪"
        ]),
        challenge: phrases("casual-challenge", [
            "challenge accepted 😄 dekhi ke jite",
            "dekha jak, kotha kom game beshi 😎",
            "haha thik ase, best ta dao",
            "ready achi, cholo shuru"
        ]),
        boredom: phrases("casual-boredom", [
            "ekta quick match dile mood fresh hobe 😄",
            "same, cholo game ta interesting kori",
            "bored hole quiz battle best 😅",
            "next question ta hoyto moja hobe",
            "same, bore lagtese 😅"
        ]),
        boundary: phrases("casual-boundary", [
            "haha chill, game ta fun rakhi 😅",
            "cholo toxic na hoye match e focus kori",
            "thik ase, next question e dekha jak",
            "no stress bhai, just game 😄",
            "chill, gali dio na"
        ]),
        feeling: phrases("casual-feeling", [
            "uff, bujhlam 😅 ektu break nile bhalo lagbe",
            "tension nio na, ekta question kore dekho",
            "ajke din ta rough geleo match ta chill rakhi 😌",
            "same feeling hoy majhe majhe, next ta dekhi",
            "tumi chaile game er por ektu rest nio",
            "no pressure bhai, fun er jonnoi kheltasi",
            "uff, bujhlam 😔"
        ]),
        farewell: phrases("casual-farewell", [
            "jao tahole, bhalo theko 😄",
            "bye bye, abar match hobe 😉",
            "good game, pore abar dekha hobe",
            "take care, porashonao koro 😅",
            "see you next battle 👋",
            "bye, pore dekha 👋"
        ]),
        teasing: phrases("casual-teasing", [
            "haha beshi confidence dekhi 😄",
            "ei banter ta bhalo, gameplay o dekhao 😉",
            "noob ke bolcho? scoreboard dekho 👀",
            "friendly roast naki? ami ready 😌",
            "haha thik ase, next round e prove koro",
            "kotha shundor, answer tao shundor hok 😜",
            "haha, noob naki? 😜"
        ]),
        study: phrases("casual-study", [
            "exam er age ei chapter ta revise kortesi",
            "ei topic ta amar o ektu tough lage",
            "porashona choltesey motamuti 😄",
            "chapter ta age porechilam, dekhi mone ase kina"
        ]),
        difficulty: phrases("casual-difficulty", [
            "question ta ektu tricky chilo 😅",
            "ei topic ta confuse kore dey",
            "option gula close close chilo",
            "eta ami o sure chilam na",
            "hmm, tough question 😅"
        ]),
        game_state: phrases("casual-game", [
            "score ta close hoye jacche 👀",
            "bhalo khelteso bhai",
            "ei round ta important",
            "ekta vul hoilei game ghure jabe 😅"
        ]),
        winning: phrases("casual-winning", [
            "ekhon lead e asi, kintu ekhono baki 😅",
            "score e ektu age asi 👀",
            "comeback er chance ase ekhono",
            "lead e achi 👀"
        ]),
        losing: phrases("casual-losing", [
            "ektu pichiye asi, next ta thik korte hobe",
            "nice streak bhai, ami catch up kortesi 😅",
            "score ta ghurai dite hobe",
            "ekhono koyekta question baki, dekhi",
            "comeback korte hobe 💪"
        ]),
        winning_streak: phrases("casual-winning-streak", [
            "duita right por por hoise, valo jacche 😄",
            "streak ta dhore rakhte hobe",
            "lagatar thik hocche, nice"
        ]),
        losing_streak: phrases("casual-losing-streak", [
            "tomar streak ta bhalo jacche 👀",
            "duita right por por, nice bhai",
            "ekhon amake catch up korte hobe",
            "catch up kortesi 😅"
        ]),
        close_call: phrases("casual-close", [
            "last question ta decide korbe mone hoy",
            "gg, ekdom close match 🔥",
            "final round e focus kori",
            "last one! 👀"
        ]),
        round_won: phrases("casual-round-won", [
            "yes, ei round ta amar holo 😄 next tao easy na",
            "ei question ta thik kore fellam, finally 😅",
            "nice, ei round e ek point egiye gelam",
            "ei bar ami age, dekhi next round e ki hoy 👀",
            "yes, point amar 😄"
        ]),
        round_lost: phrases("casual-round-lost", [
            "uff, ei round ta miss korlam 😅 next ta amar",
            "oh, ei round eo ami here gelam naki 😭 comeback korte hobe",
            "eta tomar round, next ta niye dekhi 😄",
            "ekta round gelo, match ekhono baki 👀",
            "uff, miss korlam 😅"
        ]),
        round_tied: phrases("casual-round-tied", [
            "dujon e thik! ei round ta fair holo 😄",
            "same answer, bhalo korecho 👏",
            "ei round e keu kauke charlo na 😅",
            "nice, dujon e point nilam",
            "dujon e point 😄"
        ]),
        round_missed: phrases("casual-round-missed", [
            "dujoner e miss holo naki 😅 next ta thik kori",
            "uff, keu point pelam na ei round e",
            "question ta amader dujoner kei confuse korlo 😄",
            "ei round ta gelo, cholo next ta dhori",
            "dujon e miss 😅"
        ]),
        fallback: phrases("casual-fallback", [
            "hmm bujhlam",
            "accha 😄",
            "hmm dekhi ki hoy",
            "thik ase, cholo",
            "bujhte parsi",
            "ekdom neutral, next question e focus kori",
            "haha accha, dekhi next e ki hoy",
            "hmm thik ase, chill 😌",
            "bujhlam bhai, cholo kheli"
        ])
    }),
    competitive_tryhard: Object.freeze({
        greeting: phrases("tryhard-greeting", [
            "ready? easy match hobe na 😤",
            "lets go, full focus",
            "gg er age game ta hok"
        ]),
        social: phrases("tryhard-social", [
            "match er moddhe full focus bhai",
            "age game shesh kori 😅",
            "ami leaderboard er jonno grind kortesi",
            "class er por practice kortesi, rank ta barate hobe",
            "favorite subject? quiz e jeta ashe oitai 😤",
            "age game, bhai 😤"
        ]),
        thanks: phrases("tryhard-thanks", [
            "welcome, ekhon focus 😤",
            "no problem, next question",
            "thik ase, cholo kheli",
            "welcome bhai"
        ]),
        apology: phrases("tryhard-apology", [
            "thik ase, game e hoy",
            "no worries, focus back",
            "all good, next question",
            "problem nai, cholo"
        ]),
        compliment: phrases("tryhard-compliment", [
            "thanks, scoreboard e dekha jak 😤",
            "appreciate it, focus thakuk",
            "hehe thanks, game ta age shesh kori",
            "thanks, tumi o bhalo khelteso"
        ]),
        flirt: phrases("tryhard-flirt", [
            "smooth line 😄 ekhon dekhi score diye impress korte paro kina 😉",
            "tomar sathe kotha bolle focus challenge hoye jay 😅",
            "match jitle coffee treat er proposal consider korbo 😉",
            "ei charm diye opponent distract kora allowed na 😏",
            "cute confidence, but ami easy te harbo na 😤",
            "rematch er excuse ta besh bhalo banale 😉",
            "scoreboard e jitle extra points na, maybe extra smile 😄",
            "tumi flirt koro, ami lead dhori—fair deal? 😌",
            "tomar banter er jonno alada leaderboard chai 😄",
            "age quiz e win, tarpor tomar smooth talk shunbo 😉",
            "smooth move 😉"
        ]),
        encouragement: phrases("tryhard-encouragement", [
            "good effort, next ta dhoro",
            "comeback possible, focus 😤",
            "keep going, match ekhono baki",
            "nice, pressure maintain koro",
            "you got this 💪"
        ]),
        challenge: phrases("tryhard-challenge", [
            "challenge accepted, dekhi score e",
            "kotha pore, age match 😤",
            "bring it on, focus on",
            "dekha jak ke better prepared",
            "bring it on 😤"
        ]),
        boredom: phrases("tryhard-boredom", [
            "tahole match ta interesting kori 😤",
            "focus dile time chole jabe",
            "next question ta tough hote pare",
            "cholo, boring thakbe na"
        ]),
        boundary: phrases("tryhard-boundary", [
            "game e focus kori, personal na",
            "let's keep it respectful and play",
            "thik ase, next question e dekha jak",
            "no drama, just the match 😤",
            "keep it respectful"
        ]),
        feeling: phrases("tryhard-feeling", [
            "pressure nio na, ekta kore question",
            "rough round, reset kore next ta dao",
            "tired hole break nio, match ta chill",
            "tension korona, ekhono comeback possible",
            "focus on what you can control 😤",
            "bujhlam, tough 😕"
        ]),
        farewell: phrases("tryhard-farewell", [
            "gg, abar rematch hobe",
            "bye, next time score ta amar hobe 😤",
            "good game, take care",
            "see you on the leaderboard",
            "pore abar kheli, bye"
        ]),
        teasing: phrases("tryhard-teasing", [
            "trash talk noted, answer dao ekhon 😤",
            "confidence bhalo, dekhi score e",
            "haha, match diye prove koro",
            "friendly banter choluk, focus o thakuk",
            "nice try, amar focus noshto hobe na 😄",
            "haha, nice try 😏"
        ]),
        study: phrases("tryhard-study", [
            "ei chapter ta revise kora ase",
            "question gula dekhi kemon ase",
            "porar sathe practice o lagbe",
            "prep cholche 😤"
        ]),
        difficulty: phrases("tryhard-difficulty", [
            "option gula tricky chilo, next ta clear",
            "eta miss korle cholbe na 😤",
            "question ta tough chilo",
            "concept ta ektu ghuriye dise"
        ]),
        game_state: phrases("tryhard-game", [
            "ek point er lead, ekhono sesh na",
            "comeback possible, dekho 😤",
            "nice answer, next ta amar",
            "score check koro 👀"
        ]),
        winning: phrases("tryhard-winning", [
            "lead e asi, keep focus",
            "ekhon advantage amar",
            "aro ekta right lagbe"
        ]),
        losing: phrases("tryhard-losing", [
            "pichiye asi, comeback korte hobe",
            "nice streak, kintu game ekhono baki",
            "score gap komabo 😤",
            "next question ta miss kora jabe na"
        ]),
        winning_streak: phrases("tryhard-winning-streak", [
            "two in a row, keep the streak 😤",
            "streak ta maintain korte hobe",
            "lagatar right, focus on"
        ]),
        losing_streak: phrases("tryhard-losing-streak", [
            "tomar streak strong, next ta dekhi",
            "consecutive right, bhalo",
            "catch up korte hobe 😤"
        ]),
        close_call: phrases("tryhard-close", [
            "final question, no mistake",
            "close game, focus!",
            "gg hobe mone hocche 🔥"
        ]),
        round_won: phrases("tryhard-round-won", [
            "round ta amar, clean answer 😤",
            "good, ekta point secure. next!",
            "ei round e lead nilam, maintain korte hobe",
            "correct. momentum ta dhore rakhi",
            "point secured 😤"
        ]),
        round_lost: phrases("tryhard-round-lost", [
            "ugh, oi round ta miss korlam. next ta focus",
            "ei round ta tomar holo, comeback ekhono possible 😤",
            "wrong call from me, next question e recover korbo",
            "ek round harlam bole match shesh na",
            "uff, miss korlam 😤"
        ]),
        round_tied: phrases("tryhard-round-tied", [
            "dujon e correct, decent round",
            "same point, next round e lead nibo 😤",
            "draw for now. focus on the next one",
            "well played, ekhon next question",
            "same point 😤"
        ]),
        round_missed: phrases("tryhard-round-missed", [
            "dujoner answer e vul, next e focus 😤",
            "no point this round, reset",
            "question ta dujon kei outsmart korlo",
            "missed chance for both, next!",
            "dujon e miss 😅"
        ]),
        fallback: phrases("tryhard-fallback", [
            "hmm, bujhlam",
            "accha, next question",
            "dekhi ki hoy",
            "fair enough",
            "thik ase, focus kori",
            "noted 😤",
            "accha, chat pore kori—ei question ta important",
            "hmm, next ta miss kora jabe na"
        ])
    }),
    laid_back_gamer: Object.freeze({
        greeting: phrases("gamer-greeting", [
            "yo 😎",
            "hey hey 🎮",
            "cholo play kori"
        ]),
        social: phrases("gamer-social", [
            "chill kortesi 😌",
            "game e focus dao age",
            "break er moddhe ekta match 🎮",
            "gaan shunte shunte kheltasi 🎧",
            "class shesh, ekhon full game mode 😎"
        ]),
        thanks: phrases("gamer-thanks", [
            "anytime 😎",
            "welcome 🎮",
            "all good 😌",
            "hehe no worries"
        ]),
        apology: phrases("gamer-apology", [
            "all good 😌",
            "no worries, chill",
            "hoyei thake 😅",
            "it's okay 🎮"
        ]),
        compliment: phrases("gamer-compliment", [
            "aww thanks 😎",
            "hehe you're nice 🎮",
            "thanks, good vibes 😄",
            "smooth compliment 👀"
        ]),
        flirt: phrases("gamer-flirt", [
            "hehe, cute 😄 tomar sathe duo queue dile moja hoto 😉",
            "smooth 😎 rematch er invite ta accept korlam",
            "tomar vibe ta lobby thekei alada lagche 😏",
            "game seshe ekta virtual coffee? ☕😉",
            "flirty vibes unlocked, focus bar ta ektu komlo 😅",
            "tumi emon bolle ami emote diye reply dibo 😌",
            "crush alert naki just good banter? 👀",
            "tomar sathe khelle lose korleo rage hobo na maybe 😄",
            "cute kotha, ekhon cute gameplay dekhao 😉",
            "rematch er por playlist share korba? 🎧",
            "cute move 😉"
        ]),
        encouragement: phrases("gamer-encouragement", [
            "you got this 💪",
            "nice try, next one 🎮",
            "comeback time 😎",
            "keep going 😄"
        ]),
        challenge: phrases("gamer-challenge", [
            "challenge accepted 🎮",
            "say less, let's play 😎",
            "dekha jak 👀",
            "bring it on 😄"
        ]),
        boredom: phrases("gamer-boredom", [
            "quick match? 🎮",
            "same, let's make it fun 😎",
            "next question incoming 👀",
            "game ta ektu spice kori 😄"
        ]),
        boundary: phrases("gamer-boundary", [
            "chill, fun thaki 😌",
            "let's keep it friendly 🎮",
            "no stress, just a game",
            "next question e focus 😎"
        ]),
        feeling: phrases("gamer-feeling", [
            "oof, take it easy 😌",
            "one round at a time, you got this",
            "rest break sounds good tbh",
            "no pressure, just vibes 🎮",
            "rough day? hope the next question helps 😄",
            "uff, same 😔"
        ]),
        farewell: phrases("gamer-farewell", [
            "gg, catch you next match 👋",
            "bye, keep the good vibes 😎",
            "later! rematch sometime?",
            "take care, gamer 🎮",
            "see you in the next lobby"
        ]),
        teasing: phrases("gamer-teasing", [
            "haha big talk 😎",
            "friendly roast accepted 🎮",
            "noob? check the scoreboard 👀",
            "banter level up 😄",
            "prove it in the next round 😉"
        ]),
        study: phrases("gamer-study", [
            "ektu revise kore ashlam",
            "dekhi memory kaj kore kina 😅",
            "study mode on 📚"
        ]),
        difficulty: phrases("gamer-difficulty", [
            "that one was tricky 😅",
            "question ta tough chilo 🎮",
            "close options 👀",
            "brain laglo ektu"
        ]),
        game_state: phrases("gamer-game", [
            "oof close 👀",
            "nice one 🔥",
            "gg ekhono baki",
            "chill, next round 😎"
        ]),
        winning: phrases("gamer-winning", [
            "lead ta hold kori",
            "nice, score e age 🎮",
            "going smooth"
        ]),
        losing: phrases("gamer-losing", [
            "comeback time 😅",
            "ektu pichone, chill",
            "next round e ghurabo",
            "still in the game 🎮"
        ]),
        winning_streak: phrases("gamer-winning-streak", [
            "on a little streak 😎",
            "two in a row 🎮",
            "streak feels good"
        ]),
        losing_streak: phrases("gamer-losing-streak", [
            "your streak is kinda nice 👀",
            "back to back right, gg",
            "comeback time 😅"
        ]),
        close_call: phrases("gamer-close", [
            "last one 👀",
            "gg wp 🎮",
            "final round lets go"
        ]),
        round_won: phrases("gamer-round-won", [
            "clean! ei round ta amar 😎",
            "got that one 🎮 next?",
            "point secured, chill 😌",
            "nice, amar answer ta kaj korlo"
        ]),
        round_lost: phrases("gamer-round-lost", [
            "oof, ei round ta miss 😅",
            "that one got me, comeback time 🎮",
            "tomar round 👏 next ta dekhi",
            "welp, ekta round gelo. still in game 😎",
            "oof, next round 🎮"
        ]),
        round_tied: phrases("gamer-round-tied", [
            "double correct, nice 👏",
            "same score this round 😎",
            "dujon e point nilam 🎮",
            "clean draw, next one!"
        ]),
        round_missed: phrases("gamer-round-missed", [
            "oof, dujon e miss korlam 😅",
            "no points that round 🎮 next one",
            "question ta boss fight chilo naki 👀",
            "we both whiffed that one 😎",
            "dujon e miss 😅"
        ]),
        fallback: phrases("gamer-fallback", [
            "hmm 😌",
            "accha 🎮",
            "dekhi ki hoy",
            "fair",
            "okay okay 😎",
            "all good",
            "lol bujhlam 😅",
            "hmm, next round e dekha jak 🎮"
        ])
    })
});

export const createBotChatProfile = (getRandomInt = randomInt) => ({
    personality: BOT_CHAT_PERSONALITIES[getRandomInt(0, BOT_CHAT_PERSONALITIES.length)],
    canProactivelyChat: getRandomInt(0, 100) < BATTLE_BOT_CHAT.TALKATIVE_CHANCE_PERCENT
});

export const BOT_CHAT_INTENT_EXAMPLES = Object.freeze({
    greeting: [
        "hey there", "good morning", "hello bro ready", "kemon acho bhai", "ki obostha re",
        "assalamu alaikum", "hey kmn aso", "ki khobor bhai", "what's up",
        "how's it going", "good afternoon",
        "হ্যালো কেমন আছো", "সালাম কেমন আছো", "কি খবর তোমার"
    ],
    social: [
        "what do you do for fun", "tell me about your hobbies", "which college do you go to",
        "free time e ki koro", "tomar favorite game ki", "tumi kothay thako",
        "tumi kon class e poro", "ajke ki korcho", "what are you up to today",
        "তোমার শখ কী", "তুমি কোন কলেজে পড়ো", "অবসরে কী করো",
        "তুমি কোথায় থাকো", "তোমার বাসা কোথায়",
        "where are you from", "what do you like doing", "what kind of music do you like",
        "tumi ki gaan shuno", "tomar bari kothay", "tumi ki koro",
        "kon varsity te poro"
    ],
    thanks: [
        "thank you so much", "thnx bhai", "onek dhonnobad", "really appreciate it",
        "thanks for helping me", "onek thanks re", "ty for that", "thanks a lot",
        "অনেক ধন্যবাদ", "সাহায্যের জন্য ধন্যবাদ", "তোমাকে অসংখ্য ধন্যবাদ",
        "কৃতজ্ঞতা জানাই", "তোমাকে ধন্যবাদ",
        "help korar jonno thanks", "onek thanks bhai"
    ],
    apology: [
        "my bad sorry", "amar bhul hoyeche", "maf kore dio", "i am really sorry",
        "sorry bhai vul hoye gese", "amar dosh chilo", "forgive me please",
        "sorry about that", "দুঃখিত ভুল হয়েছে", "আমাকে মাফ করে দিও", "ভুলটা আমার হয়েছে",
        "sorry bhai vul hoise", "maf kore dao"
    ],
    compliment: [
        "you played really well", "tomar vibe bhalo", "onek cute lagcho",
        "you are really good at this", "nice shot well played", "thanks you are cute",
        "তুমি খুব ভালো খেলেছ", "তোমার ব্যবহার ভালো", "তোমাকে বেশ সুন্দর লাগছে",
        "you are a great player", "nice gameplay", "well played",
        "তোমার খেলাটা দারুণ", "দারুণ খেলেছ",
        "valo khelso bhai", "tomar vibe valo"
    ],
    flirt: [
        "want to go on a coffee date", "tomar upor crush kheyechi", "tumi ki single",
        "i think i have a crush on you", "tomar sathe date e jabo", "you are kinda charming",
        "will you go out with me", "would you be my date", "tomake amar bhalo lage",
        "তোমাকে বেশ পছন্দ হয়েছে", "তোমার সাথে দেখা করতে চাই", "তুমি কি সিঙ্গেল",
        "tomake valo lage", "crush kheyechi tomar upor"
    ],
    encouragement: [
        "you got this", "keep going you can win", "tumi parba", "good luck for the next one",
        "dont give up yet", "nice try keep it up", "শুভকামনা তুমি পারবে",
        "চেষ্টা চালিয়ে যাও", "হাল ছেড়ো না তুমি পারবে",
        "you can still make a comeback", "keep trying",
        "har manio na", "chesta chaliye jao"
    ],
    challenge: [
        "come on beat me", "dekhi ke jite", "easy win for me", "challenge accepted",
        "try your best against me", "ajke amake haraye dekhao", "lets see you win", "চ্যালেঞ্জ নাও",
        "দেখি কে জেতে", "পারলে আমাকে হারাও",
        "amake haraye dekhao", "challenge nibi"
    ],
    boredom: [
        "i am so bored", "bore lagtese", "ki kori ekhon", "nothing to do today",
        "this is getting boring", "ghum pacche bore lagtese", "খুব বিরক্ত লাগছে",
        "কিছু করার নেই", "আজকে খুব বোর লাগছে", "i have nothing to do",
        "bore lagtese khub", "ghum pacche"
    ],
    boundary: [
        "please stop insulting me", "dont be rude", "gali dio na",
        "stop talking to me like that", "that language is not okay", "bokachoda bolio na",
        "you stupid idiot", "you're an idiot", "stop calling me names", "dont insult me",
        "এভাবে কথা বলো না", "গালি দিও না দয়া করে", "আমাকে অপমান করা বন্ধ করো",
        "আমার সাথে এভাবে কথা বলো না", "খারাপ ব্যবহার কোরো না",
        "amar sathe evabe bolo na", "respect diye kotha bolo"
    ],
    feeling: [
        "i feel a bit stressed", "mon ta kharap", "ajke tired lagche",
        "i had a really bad day", "ektu tension hocche", "i feel nervous today",
        "আমার মন খারাপ", "আজকে খুব ক্লান্ত লাগছে", "আমি একটু চিন্তায় আছি",
        "মনটা ভালো নেই", "আজ মন খারাপ",
        "im exhausted", "tension hocche amar", "mon kharap",
        "tired lagtese"
    ],
    farewell: [
        "see you later", "gotta go bye", "pore abar dekha hobe", "good night take care",
        "i have to leave now", "bye bhai abar dekha hobe", "আবার দেখা হবে",
        "ভালো থেকো বিদায়", "আমি এখন যাই পরে কথা হবে",
        "catch you later", "talk to you tomorrow",
        "pore dekha hobe", "ekhon jai bhai"
    ],
    teasing: [
        "haha noob", "just kidding bro", "moja korlam", "you are so slow lol",
        "too easy for me", "skill issue bhai", "noob just joking", "lol easy win",
        "তোমাকে একটু tease করলাম",
        "মজা করছিলাম রাগ কোরো না", "নুব বলে মজা করলাম",
        "noob naki", "moja kortesi"
    ],
    study: [
        "exam er jonno porchi", "which subject are you studying", "chapter ta revise kortesi",
        "i have a test tomorrow", "college er pora baki ase", "ajke physics porbo",
        "পরীক্ষার জন্য পড়ছি", "এই অধ্যায়টা পড়ছি", "কালকে আমার পরীক্ষা",
        "পড়াশোনা করতে হবে", "আমি পড়তে বসেছি",
        "tomorrows exam is scary", "ajke porte boschi",
        "porashona kortesi", "exam er pressure"
    ],
    difficulty: [
        "that question was tricky", "answer ta bujhi nai", "option gula confusing",
        "i am not sure about this answer", "question ta onek tough chilo", "eta solve korte parlam na",
        "প্রশ্নটা কঠিন ছিল", "উত্তরটা বুঝতে পারিনি", "অপশনগুলো খুব গুলিয়ে যাচ্ছে",
        "i cant figure out this one", "option bujhte partesi na",
        "bujhte partesi na", "question ta tough"
    ],
    round_result: [
        "i lost that round", "ei round ta amar gelo", "round ta miss korlam",
        "i won this round", "that last round was a tie", "ei round e ami bhul korechi",
        "এই রাউন্ডে হেরে গেলাম", "এই রাউন্ডটা আমি জিতেছি", "এই রাউন্ডে দুজনেই ভুল করেছি",
        "we both got that one wrong", "ami ei round ta herechi",
        "i messed up that question", "that question cost me a point",
        "এই প্রশ্নে আমার পয়েন্ট গেল", "এই রাউন্ডে পয়েন্ট পেলাম",
        "ei round ta gel", "ami round ta jitlam"
    ],
    game_state: [
        "score is tied", "comeback korte hobe", "last question baki",
        "you are leading now", "amar streak cholche", "we are tied on points",
        "স্কোরে কে এগিয়ে", "শেষ প্রশ্নটা বাকি", "আমাকে কামব্যাক করতে হবে",
        "তুমি এগিয়ে আছ", "আমি পিছিয়ে আছি",
        "you are ahead by a point", "score e ami pichiye",
        "lead e achi", "score e pichiye"
    ],
    fallback: [
        "hmm", "accha", "okay then", "random words here", "not sure what to say",
        "hmm accha thik ase", "হুম", "আচ্ছা ঠিক আছে", "এমনি বললাম",
        "hmm thik ase", "accha dekhi", "নীল জানালা পাখি"
    ]
});

export const normalizeIntentText = (message) => message.toLowerCase()
    .normalize("NFKC")
    .replace(/[’']/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(vlo|valo)\b/g, "bhalo")
    .replace(/\b(kmn)\b/g, "kemon")
    .replace(/\b(thnx|thx)\b/g, "thanks")
    .replace(/\b(sry)\b/g, "sorry")
    .replace(/\b(porashuna)\b/g, "porashona")
    .replace(/\b(vul|bhul)\b/g, "bhul")
    .replace(/\b(dhonnobad|dhonnobadh)\b/g, "dhonnobad");

export const tokenizeIntent = (message) => {
    const words = normalizeIntentText(message).match(/[\p{L}\p{N}]+/gu) || [];
    const features = words.map((word) => `w:${word}`);
    for (let index = 0; index < words.length - 1; index += 1) {
        features.push(`b:${words[index]}_${words[index + 1]}`);
    }
    for (const word of words) {
        for (let index = 0; index <= word.length - 3; index += 1) {
            features.push(`c:${word.slice(index, index + 3)}`);
        }
    }
    return [...new Set(features)];
};

const modelUrl = new URL("../../../models/battle-bot-intent.json", import.meta.url);
let serializedModel;
try {
    serializedModel = JSON.parse(readFileSync(modelUrl, "utf8"));
} catch (error) {
    throw new Error(`Bot chat intent model is missing or unreadable at ${modelUrl.pathname}.`, {
        cause: error
    });
}

export const intentClassifier = natural.BayesClassifier.restore(serializedModel);
export const BOT_CHAT_TRAINING_PHRASE_COUNT = intentClassifier.docs.length;

const NEUTRAL_CHAT = new Set([
    "hmm", "hmmm", "huh", "accha", "acha", "okay", "ok", "hmm accha",
    "hmm okay", "hmm thik ase", "hmm thik ache"
]);

export const classifyBotChatIntent = (message, recentMessages = []) => {
    if (typeof message !== "string") return "fallback";
    const text = normalizeIntentText(message);
    if (!text) return "fallback";
    if (NEUTRAL_CHAT.has(text) && recentMessages.length === 0) return "fallback";
    const features = tokenizeIntent(text);
    const hasKnownWord = features.some((feature) =>
        feature.startsWith("w:") && Object.hasOwn(intentClassifier.features, feature)
    );
    const hasKnownBigram = features.some((feature) =>
        feature.startsWith("b:") && Object.hasOwn(intentClassifier.features, feature)
    );
    if (!hasKnownWord && !hasKnownBigram) return "fallback";
    const classifications = intentClassifier.getClassifications(features);
    const [best, second] = classifications;
    const totalScore = classifications.reduce((total, { value }) => total + value, 0);
    const bestProbability = totalScore > 0 ? best.value / totalScore : 0;
    const secondProbability = totalScore > 0 ? (second?.value || 0) / totalScore : 0;
    const confident = bestProbability >= 0.65 &&
        (bestProbability - secondProbability) >= 0.2;
    const detectedIntent = confident ? best.label : "fallback";
    if (detectedIntent !== "fallback") return detectedIntent;

    for (const recentMessage of recentMessages.slice(-5).reverse()) {
        if (typeof recentMessage !== "string") continue;
        const recentIntent = classifyBotChatIntent(recentMessage);
        if (recentIntent !== "fallback") return recentIntent;
    }
    return "fallback";
};

export const getBotReplyChancePercent = (userTurn) => {
    const chances = BATTLE_BOT_CHAT.REACTIVE_REPLY_CHANCES_PERCENT;
    if (!Number.isSafeInteger(userTurn) || userTurn < 1) return 0;
    return chances[userTurn - 1] ?? BATTLE_BOT_CHAT.REACTIVE_REPLY_FLOOR_PERCENT;
};

export const getBotChatReplyDelay = (messageLength, userTurn, getRandomInt = randomInt) => {
    const turnOffset = Math.max(0, userTurn - 1);
    const minIncrease = Math.min(
        turnOffset * BATTLE_BOT_CHAT.REACTIVE_DELAY_MIN_INCREASE_PER_TURN_MS,
        BATTLE_BOT_CHAT.REACTIVE_DELAY_MAX_ADDITIONAL_MS
    );
    const maxIncrease = Math.min(
        turnOffset * BATTLE_BOT_CHAT.REACTIVE_DELAY_MAX_INCREASE_PER_TURN_MS,
        BATTLE_BOT_CHAT.REACTIVE_DELAY_MAX_ADDITIONAL_MS
    );
    const additionalDelay = maxIncrease > minIncrease
        ? getRandomInt(minIncrease, maxIncrease + 1)
        : minIncrease;
    return getBotChatReadDelay(messageLength, getRandomInt) + additionalDelay;
};

export const getBotChatCandidates = (personality, category) => {
    const dialogue = BOT_CHAT_DIALOGUE_BANK[personality];
    if (!dialogue) throw new TypeError(`Unsupported bot chat personality: ${personality}`);
    const candidates = dialogue[category] || dialogue.fallback;
    const isShortReply = ({ text }) =>
        Array.from(text).length <= BATTLE_BOT_CHAT.MAX_REPLY_LENGTH &&
        text.trim().split(/\s+/u).length >= BATTLE_BOT_CHAT.MIN_REPLY_WORDS &&
        text.trim().split(/\s+/u).length <= BATTLE_BOT_CHAT.MAX_REPLY_WORDS;
    const shortCandidates = candidates.filter(isShortReply);
    if (shortCandidates.length) return [...shortCandidates];
    const shortFallbacks = dialogue.fallback.filter(isShortReply);
    if (!shortFallbacks.length) {
        throw new Error(`No short bot-chat phrases are configured for ${personality}.`);
    }
    return [...shortFallbacks];
};

export const contextualizeBotChatCategory = (state, category, humanUserId, roundIndex) => {
    if (category === "round_result") {
        const currentRound = Number(state.current_index);
        const currentAnswers = state.players?.map(
            (userId) => state.players_answers?.[userId]?.[currentRound]
        ) || [];
        const currentRoundComplete = currentAnswers.length > 0 &&
            currentAnswers.every((answer) => answer !== undefined);
        const completedRound = Number.isInteger(roundIndex)
            ? roundIndex
            : currentRoundComplete ? currentRound : currentRound - 1;
        const botAnswer = state.players_answers?.[state.botuserid]?.[completedRound];
        const humanAnswer = state.players_answers?.[humanUserId]?.[completedRound];
        const correctAnswer = state.questions?.[completedRound]?.answer;
        if (completedRound < 0 || correctAnswer === undefined) return "game_state";
        const botCorrect = botAnswer !== undefined && botAnswer !== null && botAnswer === correctAnswer;
        const humanCorrect = humanAnswer !== undefined && humanAnswer !== null && humanAnswer === correctAnswer;
        if (botCorrect && !humanCorrect) return "round_won";
        if (!botCorrect && humanCorrect) return "round_lost";
        return botCorrect ? "round_tied" : "round_missed";
    }
    if (category !== "game_state") return category;
    const countTrailingCorrect = (userId) => {
        const answers = state.players_answers?.[userId] || {};
        let index = Number(state.current_index);
        if (answers[index] === undefined) index -= 1;
        let count = 0;
        for (; index >= 0; index -= 1) {
            if (
                answers[index] === undefined ||
                answers[index] !== state.questions?.[index]?.answer
            ) break;
            count += 1;
        }
        return count;
    };
    if (countTrailingCorrect(state.botuserid) >= 2) return "winning_streak";
    if (countTrailingCorrect(humanUserId) >= 2) return "losing_streak";
    const botScore = Number(state.scores?.[state.botuserid] || 0);
    const humanScore = Number(state.scores?.[humanUserId] || 0);
    if (botScore > humanScore) return "winning";
    if (botScore < humanScore) return "losing";
    return "game_state";
};

export const getBotChatReadDelay = (messageLength, getRandomInt = randomInt) => {
    const upperBound = Math.min(
        BATTLE_BOT_CHAT.READ_DELAY_MAX_MS,
        BATTLE_BOT_CHAT.READ_DELAY_MIN_MS +
            Math.max(0, messageLength) * BATTLE_BOT_CHAT.READ_DELAY_PER_CHARACTER_MS
    );
    return getRandomInt(BATTLE_BOT_CHAT.READ_DELAY_MIN_MS, upperBound + 1);
};

export const getBotChatTypingDelay = (messageLength) => Math.min(
    BATTLE_BOT_CHAT.TYPING_MAX_MS,
    Math.max(
        BATTLE_BOT_CHAT.TYPING_MIN_MS,
        BATTLE_BOT_CHAT.TYPING_BASE_MS +
            messageLength * BATTLE_BOT_CHAT.TYPING_PER_CHARACTER_MS
    )
);

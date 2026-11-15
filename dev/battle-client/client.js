"use strict";

const ANSWER_KEYS = ["ক", "খ", "গ", "ঘ"];
const DEFAULT_TOTAL = 10;
const MAX_LOG_ROWS = 250;
const ACK_TIMEOUT_MS = 6000;
const REQUEST_TIMEOUT_MS = 15000;
const PREFS_KEY = "khelba-battle-test-client:prefs";

const BATTLE_EVENTS = [
  "STARTING_BATTLE",
  "NO_OPPONENT_FOUND",
  "NEXT_QUESTION",
  "PLAYER_ANSWERED",
  "CHAT_MESSAGE",
  "display_typing",
  "CHAT_CONFIG",
  "FINALIZE_BATTLE",
  "FORFEITING_BATTLE",
  "ROUND_TIMEOUT",
  "USER_DISCONNECTED",
  "USER_RECONNECTED",
  "BATTLE_STATE_SNAPSHOT",
  "BATTLE_ERROR"
];

const $ = (selector) => document.querySelector(selector);
const ui = {
  connectionForm: $("#connection-form"),
  matchForm: $("#match-form"),
  apiOrigin: $("#api-origin"),
  accessToken: $("#access-token"),
  toggleToken: $("#toggle-token"),
  connect: $("#connect"),
  disconnect: $("#disconnect"),
  pill: $("#connection-pill"),
  pillText: $("#connection-text"),
  connectionNote: $("#connection-note"),
  subjectCode: $("#subject-code"),
  chapter: $("#chapter"),
  start: $("#start-battle"),
  quit: $("#quit-battle"),
  matchStatus: $("#match-status"),
  matchRawWrap: $("#match-raw-wrap"),
  matchRaw: $("#match-raw"),
  battleMeta: $("#battle-meta"),
  battleNote: $("#battle-note"),
  battleResult: $("#battle-result"),
  resultTitle: $("#result-title"),
  resultSubtitle: $("#result-subtitle"),
  resultScores: $("#result-scores"),
  resultCorrect: $("#result-correct"),
  resultAccuracy: $("#result-accuracy"),
  resultPoints: $("#result-points"),
  resultTime: $("#result-time"),
  resultAverage: $("#result-average"),
  resultTimeouts: $("#result-timeouts"),
  playAgain: $("#play-again"),
  themeToggle: $("#theme-toggle"),
  opponentFeedback: $("#opponent-feedback"),
  chatForm: $("#chat-form"),
  chatInput: $("#chat-input"),
  chatSend: $("#chat-send"),
  chatMessages: $("#chat-messages"),
  chatStatus: $("#chat-status"),
  battleRound: $("#battle-round"),
  timer: $("#round-timer"),
  timerValue: $("#timer-value"),
  progressBar: $("#progress-bar"),
  question: $("#question"),
  answers: $("#answers"),
  keyboardHint: $(".kbd-hint"),
  selfPlayer: $("#self-player"),
  opponentPlayer: $("#opponent-player"),
  selfAvatar: $("#self-avatar"),
  opponentAvatar: $("#opponent-avatar"),
  selfAvatarFallback: $("#self-avatar-fallback"),
  opponentAvatarFallback: $("#opponent-avatar-fallback"),
  selfName: $("#self-name"),
  opponentName: $("#opponent-name"),
  selfScore: $("#self-score"),
  opponentScore: $("#opponent-score"),
  eventLog: $("#event-log"),
  logCount: $("#log-count"),
  clearLog: $("#clear-log")
};

const state = {
  socket: null,
  connection: "idle", // idle | connecting | connected | error
  requesting: false,
  battleId: null,
  question: null,
  index: 0,
  total: DEFAULT_TOTAL,
  locked: false,
  selectedKey: null,
  players: [],
  yourUserId: null,
  scores: {},
  timerDeadline: null,
  timerInterval: null,
  timeoutSeconds: 45,
  correctAnswers: 0,
  opponentAnswered: false,
  chatMaxHistory: 0,
  chatMessagesPerMinute: 0,
  opponentTypingTimeout: null
};

let socketClientPromise = null;
let logTotal = 0;

/* ---------- helpers ---------- */

const safeStringify = (value, space) => {
  try {
    return JSON.stringify(value, null, space) ?? String(value);
  } catch {
    return String(value);
  }
};

const display = (value) =>
  value !== null && typeof value === "object" ? safeStringify(value) : String(value ?? "—");

const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
};

const savePrefs = () => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      origin: ui.apiOrigin.value.trim(),
      subjectCode: ui.subjectCode.value.trim(),
      chapter: ui.chapter.value,
      theme: document.documentElement.dataset.theme || "light"
    }));
  } catch {
    /* storage unavailable; ignore */
  }
};

const markInvalid = (input, invalid) => {
  if (invalid) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
};

const setTheme = (theme) => {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  ui.themeToggle.setAttribute("aria-pressed", String(dark));
  ui.themeToggle.firstChild.textContent = dark ? "☀ " : "☾ ";
  ui.themeToggle.querySelector("span").textContent = dark ? "Light mode" : "Dark mode";
  const navTheme = $("#nav-theme");
  if (navTheme) navTheme.textContent = dark ? "☀ Light" : "☾ Dark";
  savePrefs();
};

/* ---------- logging ---------- */

const writeLog = (name, payload, tone = "info") => {
  const row = document.createElement("li");
  row.dataset.tone = tone;

  const details = document.createElement("details");
  const summary = document.createElement("summary");

  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString([], { hour12: false });

  const label = document.createElement("span");
  label.className = "name";
  label.textContent = name;

  const preview = document.createElement("span");
  preview.className = "preview";
  const text = safeStringify(payload);
  preview.textContent = text.length > 140 ? `${text.slice(0, 140)}…` : text;

  const body = document.createElement("pre");
  body.textContent = safeStringify(payload, 2);

  summary.append(time, label, preview);
  details.append(summary, body);
  row.append(details);
  ui.eventLog.prepend(row);

  while (ui.eventLog.children.length > MAX_LOG_ROWS) ui.eventLog.lastElementChild.remove();
  logTotal += 1;
  ui.logCount.textContent = String(logTotal);
};

const addChatMessage = (message) => {
  if (!message || typeof message.text !== "string") return;
  const row = document.createElement("li");
  row.className = "chat-message";
  if (String(message.userId) === String(state.yourUserId)) row.classList.add("is-self");
  const author = document.createElement("strong");
  author.textContent = message.username || "Player";
  const text = document.createElement("span");
  text.textContent = message.text;
  row.append(author, text);
  ui.chatMessages.append(row);
  while (state.chatMaxHistory && ui.chatMessages.children.length > state.chatMaxHistory) {
    ui.chatMessages.firstElementChild.remove();
  }
  ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
};

/* ---------- UI state ---------- */

const render = () => {
  const connected = state.connection === "connected";
  const connecting = state.connection === "connecting";
  ui.connect.disabled = connected || connecting;
  ui.disconnect.disabled = !state.socket;
  ui.start.disabled = !connected || state.requesting || Boolean(state.battleId);
  ui.start.textContent = state.requesting ? "Searching…" : "Find opponent";
  ui.quit.disabled = !connected || !state.battleId;
  ui.chatInput.disabled = !connected || !state.battleId;
  ui.chatSend.disabled = !connected || !state.battleId || !ui.chatInput.value.trim();
  ui.answers.querySelectorAll("button").forEach((button) => {
    button.disabled = state.locked || !connected;
  });
};

const setConnection = (kind, text) => {
  state.connection = kind;
  ui.pill.dataset.state = kind;
  ui.pillText.textContent = text;
  render();
};

const setMatch = (text, tone = "idle", raw = null) => {
  ui.matchStatus.textContent = text;
  ui.matchStatus.dataset.tone = tone;
  if (raw === null) {
    ui.matchRawWrap.hidden = true;
    ui.matchRaw.textContent = "";
  } else {
    ui.matchRaw.textContent = raw;
    ui.matchRawWrap.hidden = false;
  }
};

const setNote = (text) => {
  ui.battleNote.textContent = text || "";
  ui.battleNote.hidden = !text;
};

const setBattleNote = (text, tone = "") => {
  setNote(text);
  ui.battleNote.dataset.tone = tone;
};

const setProgress = (index, total) => {
  const done = total > 0 ? Math.min(Math.max(index, 0), total) / total : 0;
  ui.progressBar.style.width = `${Math.round(done * 100)}%`;
  ui.progressBar.parentElement.setAttribute("aria-valuemax", String(total));
  ui.progressBar.parentElement.setAttribute("aria-valuenow", String(Math.min(Math.max(index, 0), total)));
};

const stopTimer = () => {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  state.timerDeadline = null;
  ui.timerValue.textContent = "—";
  ui.timer.classList.remove("is-low");
};

const startTimer = (seconds) => {
  stopTimer();
  const duration = Number.isFinite(Number(seconds)) && Number(seconds) >= 0
    ? Number(seconds)
    : state.timeoutSeconds;
  state.timerDeadline = Date.now() + duration * 1000;
  const tick = () => {
    const remaining = Math.max(0, Math.ceil((state.timerDeadline - Date.now()) / 1000));
    ui.timerValue.textContent = `00:${String(remaining).padStart(2, "0")}`;
    ui.timer.classList.toggle("is-low", remaining <= 10);
    if (remaining === 0) {
      stopTimer();
      if (!state.locked) {
        state.locked = true;
        setBattleNote("Time is up for this question.", "wrong");
        render();
      }
    }
  };
  tick();
  state.timerInterval = setInterval(tick, 200);
};

const setAvatar = (image, fallback, url, name) => {
  fallback.textContent = (name || "?").trim().slice(0, 1).toUpperCase() || "?";
  image.hidden = true;
  fallback.hidden = false;
  image.onerror = () => {
    image.hidden = true;
    fallback.hidden = false;
  };
  if (!url) {
    image.removeAttribute("src");
    return;
  }
  try {
    const parsed = new URL(url, location.href);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported avatar URL.");
    image.src = parsed.href;
    image.onload = () => {
      image.hidden = false;
      fallback.hidden = true;
    };
  } catch {
    image.removeAttribute("src");
  }
};

const renderPlayers = () => {
  const players = Array.isArray(state.players) ? state.players : [];
  const me = players.find((player) => String(player.userId) === String(state.yourUserId));
  const opponent = players.find((player) => player !== me);
  const own = me || {};
  const other = opponent || {};
  const ownName = own.username || "You";
  const otherName = other.username || (state.battleId ? "Opponent" : "Waiting…");
  ui.selfName.textContent = ownName;
  ui.opponentName.textContent = otherName;
  setAvatar(ui.selfAvatar, ui.selfAvatarFallback, own.avatar_url, ownName);
  setAvatar(ui.opponentAvatar, ui.opponentAvatarFallback, other.avatar_url, otherName);
  const ownScore = own.userId ? Number(state.scores[own.userId] || 0) : state.correctAnswers;
  const otherScore = other.userId ? Number(state.scores[other.userId] || 0) : 0;
  ui.selfScore.textContent = `${ownScore} correct`;
  ui.opponentScore.textContent = `${otherScore} correct`;
  ui.opponentPlayer.classList.toggle("is-answering", Boolean(other.userId && state.opponentAnswered));
};

const showEmptyQuestion = (message = "Waiting for the next question…") => {
  const p = document.createElement("p");
  p.textContent = message;
  ui.question.replaceChildren(p);
  ui.question.classList.add("empty");
  ui.answers.replaceChildren();
};

const resetBattle = () => {
  stopTimer();
  state.battleId = null;
  state.question = null;
  state.index = 0;
  state.total = DEFAULT_TOTAL;
  state.locked = false;
  state.selectedKey = null;
  state.players = [];
  state.yourUserId = null;
  state.scores = {};
  state.correctAnswers = 0;
  state.opponentAnswered = false;
  clearTimeout(state.opponentTypingTimeout);
  state.opponentTypingTimeout = null;
  ui.battleMeta.textContent = "No active battle";
  ui.battleResult.hidden = true;
  ui.battleResult.removeAttribute("data-outcome");
  ui.question.hidden = false;
  ui.answers.hidden = false;
  ui.keyboardHint.hidden = false;
  ui.resultScores.replaceChildren();
  ui.opponentFeedback.hidden = true;
  ui.chatMessages.replaceChildren();
  ui.chatStatus.textContent = "Messages are temporary";
  ui.opponentFeedback.removeAttribute("data-result");
  ui.opponentPlayer.classList.remove("opponent-result-correct", "opponent-result-wrong");
  ui.battleRound.textContent = "READY WHEN YOU ARE";
  setBattleNote("");
  setProgress(0, DEFAULT_TOTAL);
  showEmptyQuestion();
  renderPlayers();
  render();
};

const updateBattleMeta = (phase) => {
  if (!state.battleId) {
    ui.battleMeta.textContent = "No active battle";
    return;
  }
  const parts = [`Battle ${state.battleId}`];
  if (phase) parts.push(String(phase));
  if (state.question) parts.push(`Question ${state.index + 1} of ${state.total}`);
  ui.battleMeta.textContent = parts.join(" · ");
};

/* ---------- questions & answers ---------- */

const showQuestion = (question, index, total, answered = false, timeoutSeconds = state.timeoutSeconds) => {
  state.question = question;
  state.index = Number.isInteger(index) ? index : 0;
  state.total = Number.isInteger(total) && total > 0 ? total : DEFAULT_TOTAL;
  state.locked = answered;
  state.selectedKey = null;
  state.opponentAnswered = false;
  ui.opponentFeedback.hidden = true;
  ui.opponentFeedback.removeAttribute("data-result");
  ui.opponentPlayer.classList.remove("opponent-result-correct", "opponent-result-wrong");
  ui.battleResult.hidden = true;
  ui.question.hidden = false;
  ui.answers.hidden = false;
  ui.keyboardHint.hidden = false;
  ui.battleRound.textContent = `QUESTION ${state.index + 1} OF ${state.total}`;
  setBattleNote(answered ? "Your answer is locked in. Waiting for the next question." : "");

  if (![question?.context, question?.question, question?.sub_question]
    .some((text) => Boolean(text)) && !question?.image?.url) {
    showEmptyQuestion("This question has no text.");
  } else {
    const blocks = [];
    if (question?.context) {
      const context = document.createElement("p");
      context.className = "context";
      const label = document.createElement("strong");
      label.textContent = "উদ্দীপক: ";
      context.append(label, document.createTextNode(String(question.context)));
      blocks.push(context);
    }
    if (Array.isArray(question?.sub_statements) && question.sub_statements.length) {
      const statements = document.createElement("ol");
      statements.className = "statements";
      statements.type = "i";
      question.sub_statements.forEach((statement) => {
        const item = document.createElement("li");
        item.textContent = String(statement);
        statements.append(item);
      });
      blocks.push(statements);
    }
    if (question?.question) {
      const main = document.createElement("p");
      main.className = "main";
      main.textContent = String(question.question);
      blocks.push(main);
    }
    if (question?.sub_question) {
      const sub = document.createElement("p");
      sub.className = "sub";
      sub.textContent = String(question.sub_question);
      blocks.push(sub);
    }
    if (question?.image?.url) {
      const image = document.createElement("img");
      image.className = "question-image";
      image.alt = "Question illustration";
      image.loading = "lazy";
      image.onerror = () => image.remove();
      try {
        const url = new URL(question.image.url, location.href);
        if (["http:", "https:"].includes(url.protocol)) {
          image.src = url.href;
          blocks.push(image);
        }
      } catch {
        writeLog("Question image URL invalid", { image: question.image }, "error");
      }
    }
    ui.question.classList.remove("empty");
    ui.question.replaceChildren(...blocks);
  }

  const options = Array.isArray(question?.options) ? question.options : [];
  ui.answers.replaceChildren(...options.map((option, optionIndex) => {
    const key = ANSWER_KEYS[optionIndex] ?? String(optionIndex + 1);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer";
    button.dataset.key = key;

    const badge = document.createElement("span");
    badge.className = "key";
    badge.textContent = key;
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = String(option);

    button.append(badge, label);
    button.addEventListener("click", () => submitAnswer(state.index, key));
    return button;
  }));

  setProgress(state.index, state.total);
  if (answered) stopTimer();
  else startTimer(timeoutSeconds);
  renderPlayers();
  updateBattleMeta();
  render();
};

const markSelected = (key) => {
  state.selectedKey = key;
  ui.answers.querySelectorAll(".answer").forEach((button) => {
    button.classList.toggle("selected", button.dataset.key === key);
  });
};

const submitAnswer = (index, answer) => {
  const socket = state.socket;
  if (!socket?.connected || state.locked) return;
  const battleId = state.battleId;

  state.locked = true;
  markSelected(answer);
  render();

  const release = (message) => {
    // Only unlock if the same question is still showing.
    if (state.index === index && state.question) {
      state.locked = false;
      markSelected(null);
      setBattleNote(message);
      render();
    }
  };

  socket.timeout(ACK_TIMEOUT_MS).emit("SUBMIT_ANSWER", {
    question_index: index,
    answer
  }, (error, response) => {
    if (error) {
      writeLog("SUBMIT_ANSWER timeout", { question_index: index, answer }, "error");
      release("No acknowledgement from the server. You can try again.");
      return;
    }
    const ok = Boolean(response?.success);
    writeLog("SUBMIT_ANSWER ack", response, ok ? "ok" : "error");
    if (state.battleId !== battleId || state.index !== index) return;
    if (ok) {
      stopTimer();
      if (typeof response.correct === "boolean") {
        const selected = ui.answers.querySelector(`[data-key="${CSS.escape(answer)}"]`);
        selected?.classList.add(response.correct ? "is-correct" : "is-wrong");
        if (response.correct) {
          state.correctAnswers += 1;
          if (state.yourUserId) state.scores[state.yourUserId] = state.correctAnswers;
        }
        renderPlayers();
        setBattleNote(response.correct ? "Correct answer!" : "Not quite. Keep going!", response.correct ? "correct" : "wrong");
      } else {
        setBattleNote("Answer submitted. Waiting for your opponent…");
      }
    } else {
      release(response?.message || "Answer was rejected. You can try again.");
    }
  });
};

const renderBattleResult = (payload) => {
  stopTimer();
  const scores = payload?.scores && typeof payload.scores === "object" ? payload.scores : {};
  const results = payload?.playerResults && typeof payload.playerResults === "object"
    ? payload.playerResults
    : {};
  state.scores = scores;

  const ownId = String(state.yourUserId ?? "");
  const own = state.players.find((player) => String(player.userId) === ownId);
  const opponent = state.players.find((player) => player !== own);
  const ownStats = results[ownId] || {};
  const winnerId = String(payload?.winner ?? "");
  const outcome = winnerId === "DRAW" ? "draw" : winnerId === ownId ? "win" : "loss";
  const title = outcome === "win" ? "Victory!" : outcome === "draw" ? "It’s a draw" : "Battle over";

  ui.resultTitle.textContent = payload?.isForfeit && outcome === "win" ? "You won by forfeit" : title;
  ui.resultSubtitle.textContent = payload?.isForfeit
    ? "Your opponent forfeited the battle."
    : "Here’s how both players performed.";
  ui.battleResult.dataset.outcome = outcome;
  ui.resultScores.replaceChildren();

  for (const player of [own, opponent]) {
    if (!player) continue;
    const scoreBlock = document.createElement("div");
    const name = document.createElement("span");
    const score = document.createElement("strong");
    name.textContent = String(player.username || (player === own ? "You" : "Opponent"));
    score.textContent = String(scores[player.userId] ?? 0);
    scoreBlock.append(name, score);
    ui.resultScores.append(scoreBlock);
  }

  ui.resultCorrect.textContent = String(ownStats.correctAnswers ?? state.correctAnswers);
  ui.resultAccuracy.textContent = `${Number(ownStats.accuracy || 0).toFixed(1)}%`;
  ui.resultPoints.textContent = String(ownStats.matchPoints ?? "—");
  ui.resultTime.textContent = Number.isFinite(Number(ownStats.timeUsed))
    ? `${Number(ownStats.timeUsed).toFixed(1)}s`
    : "—";
  ui.resultAverage.textContent = Number.isFinite(Number(ownStats.averageAnswerTime))
    ? `${Number(ownStats.averageAnswerTime).toFixed(1)}s`
    : "—";
  ui.resultTimeouts.textContent = String(ownStats.timedOutAnswers ?? 0);
  ui.battleResult.hidden = false;
  ui.question.hidden = true;
  ui.answers.hidden = true;
  ui.keyboardHint.hidden = true;
  ui.battleRound.textContent = "FINAL SCORE";
  ui.battleMeta.textContent = `Battle complete · ${state.battleId || ""}`;
  state.battleId = null;
  ui.chatMessages.replaceChildren();
  ui.chatStatus.textContent = "Battle chat ended";
  state.locked = true;
  setBattleNote(payload?.isForfeit ? "This match ended early." : "");
  renderPlayers();
  setMatch("Battle complete. Review the final scores.", "ok");
  render();
};

/* ---------- socket events ---------- */

const handleBattleEvent = (name, payload) => {
  const tone = name === "BATTLE_ERROR" || name === "NO_OPPONENT_FOUND" ? "error" : "info";
  writeLog(name, payload, tone);

  switch (name) {
    case "STARTING_BATTLE":
      state.battleId = payload?.battleId ?? state.battleId;
      state.yourUserId = payload?.yourUserId ?? state.yourUserId;
      state.players = Array.isArray(payload?.players) ? payload.players : state.players;
      state.scores = payload?.scores || state.scores;
      state.correctAnswers = Number(state.scores[state.yourUserId] || 0);
      state.total = Number.isInteger(payload?.total_questions) ? payload.total_questions : state.total;
      renderPlayers();
      setMatch("Opponent found. Battle is starting…", "ok");
      updateBattleMeta("starting");
      render();
      break;

    case "NO_OPPONENT_FOUND":
      setMatch(`No opponent found${payload?.searchId ? ` (search ${payload.searchId})` : ""}. Try again.`, "warn");
      break;

    case "NEXT_QUESTION":
      state.battleId = payload?.battleId ?? state.battleId;
      showQuestion(payload?.question, payload?.index, state.total, false, payload?.timeout_seconds);
      break;

    case "BATTLE_STATE_SNAPSHOT": {
      state.battleId = payload?.battleId ?? state.battleId;
      state.yourUserId = payload?.yourUserId ?? state.yourUserId;
      state.players = Array.isArray(payload?.players) ? payload.players : state.players;
      state.scores = payload?.scores || state.scores;
      ui.chatMessages.replaceChildren();
      for (const message of Array.isArray(payload?.chat) ? payload.chat : []) addChatMessage(message);
      state.correctAnswers = Number(state.scores[state.yourUserId] || 0);
      const total = payload?.total_questions ?? state.total;
      if (payload?.question) {
        showQuestion(payload.question, payload.current_index, total, payload.hasAnswered === true, payload.timeout_seconds);
      } else {
        state.total = total;
        state.index = payload?.current_index ?? state.index;
        setProgress(state.index, state.total);
      }
      renderPlayers();
      updateBattleMeta(payload?.phase);
      render();
      break;
    }

    case "PLAYER_ANSWERED": {
      const isOpponent = String(payload?.userId) !== String(state.yourUserId);
      if (isOpponent && payload?.question_index === state.index) {
        state.opponentAnswered = true;
        if (typeof payload?.correct === "boolean") {
          const result = payload.correct ? "correct" : "wrong";
          ui.opponentFeedback.textContent = payload.correct
            ? "Opponent answered correctly"
            : "Opponent answered incorrectly";
          ui.opponentFeedback.dataset.result = result;
          ui.opponentFeedback.hidden = false;
          ui.opponentPlayer.classList.toggle("opponent-result-correct", payload.correct);
          ui.opponentPlayer.classList.toggle("opponent-result-wrong", !payload.correct);
          if (payload.correct && payload.userId) {
            state.scores[payload.userId] = Number(state.scores[payload.userId] || 0) + 1;
          }
          setBattleNote(payload.correct
            ? "Your opponent got it right."
            : "Your opponent got it wrong.", result);
        } else {
          setBattleNote("Your opponent has answered.");
        }
        renderPlayers();
      }
      break;
    }

    case "CHAT_MESSAGE":
      addChatMessage(payload);
      clearTimeout(state.opponentTypingTimeout);
      state.opponentTypingTimeout = null;
      ui.chatStatus.textContent = `Messages are temporary · ${state.chatMessagesPerMinute}/min`;
      break;

    case "display_typing":
      if (String(payload?.userId) !== String(state.yourUserId)) {
        clearTimeout(state.opponentTypingTimeout);
        ui.chatStatus.textContent = payload?.isTyping
          ? `${ui.opponentName.textContent} is typing…`
          : `Messages are temporary · ${state.chatMessagesPerMinute}/min`;
        if (!payload?.isTyping) state.opponentTypingTimeout = null;
        if (payload?.isTyping) {
          state.opponentTypingTimeout = setTimeout(() => {
            ui.chatStatus.textContent = `Messages are temporary · ${state.chatMessagesPerMinute}/min`;
            state.opponentTypingTimeout = null;
          }, 5000);
        }
      }
      break;

    case "CHAT_CONFIG":
      state.chatMaxHistory = Number(payload?.historyLimit) || state.chatMaxHistory;
      state.chatMessagesPerMinute = Number(payload?.messagesPerMinute) || state.chatMessagesPerMinute;
      ui.chatInput.maxLength = Number(payload?.maxMessageLength) || ui.chatInput.maxLength;
      ui.chatStatus.textContent = `Messages are temporary · ${state.chatMessagesPerMinute}/min`;
      break;

    case "ROUND_TIMEOUT":
      state.locked = true;
      stopTimer();
      setBattleNote("Round timed out.");
      render();
      break;

    case "USER_DISCONNECTED":
      setBattleNote("A player disconnected. Waiting for them to reconnect…", "wrong");
      break;

    case "USER_RECONNECTED":
      setBattleNote("Player reconnected. The battle continues.", "correct");
      break;

    case "FORFEITING_BATTLE":
      setBattleNote("Battle is being finalized…");
      break;

    case "FINALIZE_BATTLE": {
      setProgress(1, 1);
      renderBattleResult(payload);
      break;
    }

    case "BATTLE_ERROR":
      setMatch(payload?.message || "Battle error.", "error");
      break;

    default:
      break;
  }
};

/* ---------- connection ---------- */

const backendOrigin = () => {
  let url;
  try {
    url = new URL(ui.apiOrigin.value.trim());
  } catch {
    throw new Error("Enter a valid backend origin, e.g. http://localhost:3000.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Backend origin must use HTTP or HTTPS.");
  }
  return url.origin;
};

const requireToken = () => {
  const token = ui.accessToken.value.trim();
  markInvalid(ui.accessToken, !token);
  if (!token) throw new Error("Paste an access token first.");
  return token;
};

const loadSocketClient = (origin) => {
  if (window.io) return Promise.resolve();
  if (!socketClientPromise) {
    socketClientPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${origin}/socket.io/socket.io.js`;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error(`Could not load the Socket.IO client from ${script.src}. Is the backend running?`));
      };
      document.head.append(script);
    }).catch((error) => {
      socketClientPromise = null;
      throw error;
    });
  }
  return socketClientPromise;
};

const setConnectionNote = (text) => {
  ui.connectionNote.textContent = text || "";
  ui.connectionNote.hidden = !text;
};

// "xhr poll error" hides the real cause from JavaScript, so probe the
// Socket.IO polling endpoint ourselves to tell the common cases apart.
const diagnoseTransport = async (origin) => {
  const url = `${origin}/socket.io/?EIO=4&transport=polling`;
  try {
    // no-cors resolves (opaque) whenever the server answers, CORS or not.
    await fetch(url, { mode: "no-cors", cache: "no-store" });
  } catch {
    return `Cannot reach ${origin}. Check that the backend is running on that exact host and port.`;
  }
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return `The Socket.IO endpoint answered HTTP ${response.status}. A proxy, origin check or rate limiter is rejecting the request; look at that response in DevTools → Network.`;
    }
    return "The polling endpoint is reachable and allows this page's origin, so the failure is intermittent or on a later polling request (POST). Check the backend logs and any proxy in front of it.";
  } catch {
    return `The backend is up but the Socket.IO endpoint blocks this page's origin (${location.origin}) with CORS. Add that exact origin to the cors.origin option of the Socket.IO server itself (usually separate from the HTTP CORS list), then restart the backend.`;
  }
};

const teardownSocket = () => {
  if (!state.socket) return;
  state.socket.removeAllListeners();
  state.socket.disconnect();
  state.socket = null;
};

const connect = async () => {
  try {
    const origin = backendOrigin();
    markInvalid(ui.apiOrigin, false);
    const accessToken = requireToken();

    teardownSocket();
    resetBattle();
    savePrefs();
    setConnectionNote("");
    let diagnosed = false;
    setConnection("connecting", "Connecting…");

    await loadSocketClient(origin);

    const socket = window.io(`${origin}/battle`, {
      auth: { accessToken, reconnect: true },
      reconnection: true,
      timeout: 10000
    });
    state.socket = socket;

    for (const name of BATTLE_EVENTS) {
      socket.on(name, (payload) => handleBattleEvent(name, payload));
    }

    socket.on("connect", () => {
      setConnectionNote("");
      setConnection("connected", `Connected · ${socket.id}`);
      writeLog("socket connected", { socketId: socket.id }, "ok");
    });

    socket.on("connect_error", (error) => {
      const message = error?.message || "Connection failed";
      writeLog("connect_error", { message }, "error");
      if (message === "xhr poll error" && !diagnosed) {
        diagnosed = true;
        diagnoseTransport(origin).then((hint) => {
          if (state.socket !== socket) return;
          setConnectionNote(hint);
          writeLog("diagnosis", { hint }, "error");
        });
      }
      if (socket.active) setConnection("connecting", "Retrying…");
      else setConnection("error", message);
    });

    socket.on("disconnect", (reason) => {
      writeLog("disconnect", { reason });
      if (socket.active) {
        setConnection("connecting", "Reconnecting…");
      } else {
        setConnection("error", `Disconnected (${reason})`);
      }
    });

    render();
  } catch (error) {
    teardownSocket();
    setConnection("error", error.message);
    writeLog("connection error", { message: error.message }, "error");
  }
};

const disconnect = () => {
  teardownSocket();
  resetBattle();
  setConnectionNote("");
  setMatch("Not searching.", "idle");
  setConnection("idle", "Disconnected");
};

/* ---------- matchmaking ---------- */

const startBattle = async () => {
  if (state.requesting) return;

  let abortTimer;
  try {
    const origin = backendOrigin();
    const accessToken = requireToken();
    const subjectCode = ui.subjectCode.value.trim();
    const chapter = Number(ui.chapter.value);

    markInvalid(ui.subjectCode, !subjectCode);
    markInvalid(ui.chapter, !Number.isSafeInteger(chapter) || chapter < 1);
    if (!subjectCode) throw new Error("Subject code is required.");
    if (!Number.isSafeInteger(chapter) || chapter < 1) {
      throw new Error("Chapter must be a positive whole number.");
    }

    savePrefs();
    state.requesting = true;
    setMatch("Searching for an opponent…", "busy");
    render();

    const controller = new AbortController();
    abortTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(`${origin}/api/v1/battle/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ["Bearer", accessToken].join(" ")
      },
      body: JSON.stringify({ subject_code: subjectCode, chapter }),
      signal: controller.signal
    });

    const rawText = await response.text();
    let body;
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      body = { message: rawText.slice(0, 300) || `Unexpected response (${response.status}).` };
    }

    const pretty = safeStringify(body, 2);
    writeLog("POST /api/v1/battle/start", { status: response.status, body }, response.ok ? "ok" : "error");

    if (!response.ok) {
      const hint = response.status === 401 ? " Your token may be invalid or expired." : "";
      setMatch(`${body?.message || `Matchmaking failed (${response.status}).`}${hint}`, "error", pretty);
      return;
    }

    if (body.data?.battleId) {
      state.battleId = body.data.battleId;
      updateBattleMeta();
    }
    const message = typeof body.message === "string" && body.message
      ? body.message
      : "Request accepted. Waiting for a match…";
    setMatch(message, "busy", pretty);
  } catch (error) {
    let message = error.message;
    if (error.name === "AbortError") message = "Request timed out. Is the backend reachable?";
    else if (error instanceof TypeError) {
      message = "Network or CORS error. Check the backend origin and that this origin is in ALLOWED_ORIGINS.";
    }
    setMatch(message, "error");
    writeLog("matchmaking error", { message }, "error");
  } finally {
    clearTimeout(abortTimer);
    state.requesting = false;
    render();
  }
};

const quitBattle = () => {
  const socket = state.socket;
  if (!socket?.connected) return;
  ui.quit.disabled = true;
  socket.timeout(ACK_TIMEOUT_MS).emit("QUIT_BATTLE", (error, response) => {
    if (error) {
      writeLog("QUIT_BATTLE timeout", {}, "error");
    } else {
      writeLog("QUIT_BATTLE ack", response, response?.success ? "ok" : "error");
    }
    render();
  });
};

const sendChatMessage = (event) => {
  event.preventDefault();
  const socket = state.socket;
  const message = ui.chatInput.value.trim();
  if (!socket?.connected || !state.battleId || !message) return;
  ui.chatSend.disabled = true;
  socket.timeout(ACK_TIMEOUT_MS).emit("SEND_CHAT_MESSAGE", { message }, (error, response) => {
    if (error) {
      ui.chatStatus.textContent = "Chat request timed out.";
      writeLog("SEND_CHAT_MESSAGE timeout", {}, "error");
    } else if (!response?.success) {
      ui.chatStatus.textContent = response?.message || "Message was not sent.";
      writeLog("SEND_CHAT_MESSAGE rejected", response, "error");
    } else {
      ui.chatInput.value = "";
      ui.chatStatus.textContent = `Messages are temporary · ${state.chatMessagesPerMinute}/min`;
      writeLog("SEND_CHAT_MESSAGE ack", { success: true }, "ok");
    }
    render();
  });
};

ui.chatForm.addEventListener("submit", sendChatMessage);
ui.chatInput.addEventListener("input", render);

/* ---------- wiring ---------- */

ui.connectionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  connect();
});

ui.matchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  startBattle();
});

ui.disconnect.addEventListener("click", disconnect);
ui.quit.addEventListener("click", quitBattle);
ui.playAgain.addEventListener("click", () => {
  resetBattle();
  setMatch("Ready to find another opponent.", "idle");
  ui.start.focus();
});
ui.themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

ui.clearLog.addEventListener("click", () => {
  ui.eventLog.replaceChildren();
  logTotal = 0;
  ui.logCount.textContent = "0";
});

ui.toggleToken.addEventListener("click", () => {
  const show = ui.accessToken.type === "password";
  ui.accessToken.type = show ? "text" : "password";
  ui.toggleToken.textContent = show ? "Hide" : "Show";
  ui.toggleToken.setAttribute("aria-pressed", String(show));
});

for (const input of [ui.apiOrigin, ui.accessToken, ui.subjectCode, ui.chapter]) {
  input.addEventListener("input", () => markInvalid(input, false));
}
for (const input of [ui.apiOrigin, ui.subjectCode, ui.chapter]) {
  input.addEventListener("change", savePrefs);
}

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.matches("input, textarea, select")) return;
  if (document.querySelector("#battle-section")?.hidden) return;
  const position = Number(event.key) - 1;
  if (!Number.isInteger(position) || position < 0 || position > 3) return;
  const button = ui.answers.querySelectorAll(".answer")[position];
  if (button && !button.disabled) button.click();
});

const prefs = loadPrefs();
if (prefs.origin) ui.apiOrigin.value = prefs.origin;
if (prefs.subjectCode) ui.subjectCode.value = prefs.subjectCode;
if (prefs.chapter) ui.chapter.value = prefs.chapter;
setTheme(prefs.theme === "dark" ? "dark" : "light");

resetBattle();
setConnection("idle", "Disconnected");
require("dotenv").config();
const { randomBytes, randomInt } = require("node:crypto");
const { io } = require("socket.io-client");

const ANSWER_KEYS = ["ক", "খ", "গ", "ঘ"];
const ANSWER_DELAY_MIN_MS = 5000;
const ANSWER_DELAY_MAX_MS = 20000;

module.exports = {
  generateAccessToken,
  openBattleSocket,
  runBattle,
  closeBattleSocket,
  getAnswerDelayMs
};

function getAnswerDelayMs() {
  return randomInt(ANSWER_DELAY_MIN_MS, ANSWER_DELAY_MAX_MS + 1);
}

function generateAccessToken(context, _events, done) {
  const secretHex = process.env.ACCESS_TOKEN_SECRET;
  const expiry = Number(process.env.ACCESS_TOKEN_EXPIRY || 900);
  if (!/^[a-f\d]{64}$/i.test(String(secretHex))) {
    return done(new Error("ACCESS_TOKEN_SECRET must be the 64-character hex key used by the API."));
  }
  if (!Number.isSafeInteger(expiry) || expiry < 1) {
    return done(new Error("ACCESS_TOKEN_EXPIRY must be a positive integer in seconds."));
  }

  const userId = randomBytes(12).toString("hex");
  const sessionId = randomBytes(12).toString("hex");
  const username = `loadtest_${randomBytes(6).toString("hex")}`;
  import("jose").then(({ EncryptJWT }) => new EncryptJWT({
    userId,
    sessionId,
    tokenVersion: 1,
    username,
    role: "USER",
    tier: "beginner",
    avatar_url: null
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${expiry}s`)
    .encrypt(Buffer.from(secretHex, "hex")))
    .then((token) => {
      context.vars.accessToken = token;
      context.vars.userId = userId;
      context.vars.username = username;
      done();
    }, done);
}

function openBattleSocket(context, _events, done) {
  const targetUrl = process.env.TARGET_URL;
  if (!targetUrl) return done(new Error("TARGET_URL must point to the API server."));
  if (!context.vars.accessToken) return done(new Error("Generate an access token before opening the battle socket."));

  const socket = io(`${targetUrl.replace(/\/+$/, "")}/battle`, {
    path: "/socket.io/",
    auth: { accessToken: context.vars.accessToken },
    transports: ["websocket", "polling"],
    reconnection: false,
    timeout: 10000
  });
  context.battleSocket = socket;

  let settled = false;
  const finish = (error) => {
    if (settled) return;
    settled = true;
    if (error) {
      socket.disconnect();
      delete context.battleSocket;
    }
    done(error);
  };

  socket.once("connect", () => finish());
  socket.once("connect_error", (error) => {
    finish(new Error(`Battle Socket.IO connection failed: ${error.message}`));
  });
}

function runBattle(context, _events, done) {
  const socket = context.battleSocket;
  if (!socket?.connected) return done(new Error("Battle socket must be connected before matchmaking."));
  const targetUrl = process.env.TARGET_URL;
  if (!targetUrl) return done(new Error("TARGET_URL must point to the API server."));

  let finished = false;
  const timers = new Set();
  const submittedIndexes = new Set();
  const questionOptions = new Map();
  const cleanup = () => {
    clearTimeout(timeout);
    for (const timer of timers) clearTimeout(timer);
    socket.off("PLAYER_ANSWERED", onPlayerAnswered);
    socket.off("NEXT_QUESTION", onNextQuestion);
    socket.off("FINALIZE_BATTLE", onBattleFinalized);
    socket.off("BATTLE_ERROR", onBattleError);
    socket.off("NO_OPPONENT_FOUND", onNoOpponentFound);
    socket.off("disconnect", onDisconnect);
    socket.disconnect();
    delete context.battleSocket;
  };
  const finish = (error) => {
    if (finished) return;
    finished = true;
    cleanup();
    done(error);
  };

  const onNextQuestion = ({ index, question } = {}) => {
    if (Number.isInteger(index) && Number.isInteger(question?.options?.length)) {
      questionOptions.set(index, Math.min(ANSWER_KEYS.length, question.options.length));
    }
  };
  const onPlayerAnswered = ({ userId, question_index: index } = {}) => {
    if (userId === context.vars.userId || !Number.isInteger(index) || submittedIndexes.has(index)) return;
    submittedIndexes.add(index);
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (finished || !socket.connected) return;
      const optionCount = questionOptions.get(index);
      if (!optionCount) return finish(new Error(`Question ${index} was not received before the opponent answered.`));

      const answer = ANSWER_KEYS[randomInt(optionCount)];
      socket.timeout(5000).emit("SUBMIT_ANSWER", {
        question_index: index,
        answer
      }, (error, response) => {
        if (error) return finish(new Error(`Answer submission acknowledgement timed out for question ${index}.`));
        if (!response?.success && !/no longer active|time to answer has expired/i.test(response?.message || "")) {
          finish(new Error(`Answer submission failed for question ${index}: ${response?.message || "unknown error"}`));
        }
      });
    }, getAnswerDelayMs());
    timers.add(timer);
  };
  const onBattleFinalized = () => {
    if (questionOptions.size !== 10) {
      return finish(new Error(`Battle finalized after ${questionOptions.size} of 10 questions.`));
    }
    finish();
  };
  const onBattleError = (error) => finish(new Error(error?.message || "Battle reported an error."));
  const onNoOpponentFound = () => finish(new Error("No opponent was available for the battle."));
  const onDisconnect = (reason) => {
    if (!finished) finish(new Error(`Battle socket disconnected before the battle ended: ${reason}`));
  };

  const timeout = setTimeout(() => finish(new Error("Battle did not finish within 15 minutes.")), 15 * 60 * 1000);
  socket.on("NEXT_QUESTION", onNextQuestion);
  socket.on("PLAYER_ANSWERED", onPlayerAnswered);
  socket.once("FINALIZE_BATTLE", onBattleFinalized);
  socket.once("BATTLE_ERROR", onBattleError);
  socket.once("NO_OPPONENT_FOUND", onNoOpponentFound);
  socket.once("disconnect", onDisconnect);

  fetch(`${targetUrl.replace(/\/+$/, "")}/api/v1/battle/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${context.vars.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ subject_code: "275", chapter: 5 }),
    signal: AbortSignal.timeout(15000)
  }).then(async (response) => {
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Matchmaking returned HTTP ${response.status}: ${body}`);
    }
  }).catch((error) => finish(error));
}

function closeBattleSocket(context, _events, done) {
  context.battleSocket?.disconnect();
  delete context.battleSocket;
  done();
}

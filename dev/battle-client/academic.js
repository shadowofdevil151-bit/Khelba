(() => {
"use strict";

const KEYS = ["ক", "খ", "গ", "ঘ"];
const PREFS_KEY = "khelba-academic:prefs";
const TIMEOUT = 15000;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const json = (v, sp) => { try { return JSON.stringify(v, null, sp) ?? String(v); } catch { return String(v); } };

const ui = {
  origin: $("#a-origin"), token: $("#a-token"), subject: $("#a-subject"), chapter: $("#a-chapter"), limit: $("#a-limit"),
  battleOrigin: $("#api-origin"), battleToken: $("#access-token"),
  toast: $("#a-toast"), inspStatus: $("#a-insp-status"), inspTitle: $("#a-insp-title"),
  inspBody: $("#a-insp-body"), history: $("#a-history")
};

/* ---------- section navigation (Battle / Academic) ---------- */
const showSection = (name) => {
  const academic = name === "academic";
  $("#battle-section").hidden = academic;
  $("#academic").hidden = !academic;
  $$(".nav-tab").forEach((t) => {
    const on = t.dataset.section === name;
    t.classList.toggle("active", on);
    t.setAttribute("aria-selected", String(on));
  });
  if (academic) { ui.origin.value = ui.battleOrigin.value; ui.token.value = ui.battleToken.value; }
  if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
};
$$(".nav-tab").forEach((t) => t.addEventListener("click", () => showSection(t.dataset.section)));
$("#nav-theme").addEventListener("click", () => $("#theme-toggle").click());

/* mirror origin/token with the Battle connection card (single source of truth) */
const mirror = (from, to) => from.addEventListener("input", () => { to.value = from.value; to.dispatchEvent(new Event("input", { bubbles: true })); });
mirror(ui.origin, ui.battleOrigin); mirror(ui.token, ui.battleToken);
mirror(ui.battleOrigin, ui.origin); mirror(ui.battleToken, ui.token);
$("#a-toggle-token").addEventListener("click", (e) => {
  const show = ui.token.type === "password";
  ui.token.type = show ? "text" : "password";
  e.currentTarget.textContent = show ? "Hide" : "Show";
});

/* ---------- prefs ---------- */
try {
  const p = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  if (p.subject) ui.subject.value = p.subject;
  if (p.chapter) ui.chapter.value = p.chapter;
  if (p.limit) ui.limit.value = p.limit;
} catch { /* ignore */ }
const savePrefs = () => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ subject: ui.subject.value.trim(), chapter: ui.chapter.value, limit: ui.limit.value })); } catch { /* ignore */ }
};
[ui.subject, ui.chapter, ui.limit].forEach((i) => i.addEventListener("change", savePrefs));

/* ---------- toast ---------- */
let toastTimer;
const toast = (msg, err = false) => {
  ui.toast.textContent = msg;
  ui.toast.className = `a-toast${err ? " err" : ""}`;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 3200);
};

/* ---------- API ---------- */
const scope = ({ needChapter = true } = {}) => {
  let origin;
  try { origin = new URL(ui.origin.value.trim()).origin; } catch { throw new Error("Enter a valid backend origin."); }
  const token = ui.token.value.trim();
  const subject = ui.subject.value.trim();
  const chapter = Number(ui.chapter.value);
  const limit = Math.min(Math.max(Number(ui.limit.value) || 50, 1), 600);
  [ui.token, ui.subject, ui.chapter].forEach((i) => i.removeAttribute("aria-invalid"));
  if (!token) { ui.token.setAttribute("aria-invalid", "true"); throw new Error("Paste an access token first."); }
  if (!subject) { ui.subject.setAttribute("aria-invalid", "true"); throw new Error("Subject code is required."); }
  if (needChapter && (!Number.isSafeInteger(chapter) || chapter < 1)) { ui.chapter.setAttribute("aria-invalid", "true"); throw new Error("Chapter must be a positive whole number."); }
  savePrefs();
  return { origin, token, subject, chapter, limit };
};

const inspect = (entry) => {
  ui.inspStatus.textContent = entry.status ? String(entry.status) : "error";
  ui.inspStatus.className = `a-chip ${entry.ok ? "ok" : "err"}`;
  ui.inspTitle.textContent = `${entry.method} ${entry.path}${entry.query ? `?${entry.query}` : ""} · ${entry.ms}ms`;
  ui.inspBody.textContent = json(entry.body, 2);
};

const hist = [];
const pushHistory = (entry) => {
  hist.unshift(entry);
  hist.length = Math.min(hist.length, 25);
  ui.history.replaceChildren(...hist.map((h) => {
    const li = el("li");
    li.append(el("span", "m", h.method), el("span", "p", h.path), el("span", `s ${h.ok ? "ok" : "err"}`, String(h.status || "ERR")));
    li.onclick = () => inspect(h);
    return li;
  }));
};

async function api(method, path, { query = {}, body } = {}) {
  const { origin, token } = scope({ needChapter: false });
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const t0 = performance.now();
  const entry = { method, path, query: qs.toString(), ok: false, status: 0, body: null, ms: 0 };
  try {
    const opts = { method, headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT) };
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    const res = await fetch(`${origin}/api/v1${path}${qs.size ? `?${qs}` : ""}`, opts);
    const raw = await res.text();
    let parsed;
    try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { response: raw.slice(0, 500) }; }
    Object.assign(entry, { ok: res.ok, status: res.status, body: parsed });
  } catch (e) {
    entry.body = { error: e.name === "TimeoutError" ? "Request timed out." : e instanceof TypeError ? "Network or CORS error. Check the origin and ALLOWED_ORIGINS." : e.message };
  }
  entry.ms = Math.round(performance.now() - t0);
  inspect(entry); pushHistory(entry);
  if (!entry.ok) throw new Error(entry.body?.message || entry.body?.error || `Request failed (${entry.status || "network"}).`);
  return entry.body;
}

const run = async (btn, fn) => {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = "Working…";
  try { await fn(); } catch (e) { toast(e.message, true); } finally { btn.disabled = false; btn.textContent = label; }
};

/* ---------- data helpers ---------- */
const listOf = (body) => {
  const d = body?.data ?? body;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object") {
    for (const k of ["questions", "items", "results", "docs", "rows"]) if (Array.isArray(d[k])) return d[k];
    for (const k of Object.keys(d)) if (Array.isArray(d[k])) return d[k];
  }
  return [];
};
const cursorOf = (b) => {
  const d = b?.data;
  const candidates = [
    d?.nextCursor, d?.next_cursor, d?.pagination?.nextCursor, d?.pagination?.next_cursor, d?.meta?.nextCursor, d?.meta?.next_cursor,
    b?.nextCursor, b?.next_cursor, b?.pagination?.nextCursor, b?.pagination?.next_cursor, b?.meta?.nextCursor, b?.meta?.next_cursor
  ];
  const found = candidates.find((v) => v !== undefined && v !== null && v !== "");
  return found === undefined ? null : String(found);
};
const qid = (q) => String(q?._id ?? q?.id ?? q?.question_id ?? q?.questionId ?? "");
const optLabel = (o) => (o && typeof o === "object" ? o.text ?? o.label ?? json(o) : String(o));
const normKey = (q, v) => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return KEYS[v] ?? KEYS[v - 1] ?? null;
  const s = String(v).trim();
  if (KEYS.includes(s)) return s;
  const i = (q.options || []).findIndex((o) => optLabel(o) === s);
  return i >= 0 ? KEYS[i] : null;
};
const correctOf = (q) => normKey(q, q.correct_answer ?? q.correctAnswer ?? q.answer ?? q.right_answer);
const pickedOf = (q) => normKey(q, q.user_answer ?? q.userAnswer ?? q.selected_answer ?? q.submitted_answer ?? q.your_answer);

/* ---------- cursor pagination ----------
   Each list keeps a stack of cursors: cursors[n] is the cursor used to fetch page n.
   The server's next cursor is read from the response (nextCursor / next_cursor, also
   inside pagination/meta) and sent back as ?cursor=... */
const lists = {
  practice: { path: "/academic/remaining-questions", cursors: [null], idx: 0, next: null },
  wrong: { path: "/academic/wrong-questions", cursors: [null], idx: 0, next: null },
  right: { path: "/academic/right-questions", cursors: [null], idx: 0, next: null }
};

async function fetchPage(kind, idx) {
  const L = lists[kind];
  const s = scope();
  const body = await api("GET", L.path, { query: { subject_code: s.subject, chapter: s.chapter, limit: s.limit, cursor: L.cursors[idx] } });
  L.idx = idx;
  L.next = cursorOf(body);
  L.cursors.length = idx + 1;
  if (L.next) L.cursors[idx + 1] = L.next;
  return listOf(body);
}
const resetCursors = (kind) => Object.assign(lists[kind], { cursors: [null], idx: 0, next: null });

function updatePager(kind, count) {
  const L = lists[kind];
  const pager = $(`.a-pager[data-kind="${kind}"]`);
  if (!pager) return;
  pager.hidden = false;
  pager.querySelector('[data-dir="prev"]').disabled = L.idx === 0;
  pager.querySelector('[data-dir="next"]').disabled = !L.next;
  pager.querySelector(".a-page-label").textContent = `Page ${L.idx + 1} · ${count} item${count === 1 ? "" : "s"}`;
}

/* ---------- question rendering ---------- */
function renderQuestionBody(q) {
  const wrap = el("div", "a-qtext");
  if (q.context) { const p = el("p", "context"); p.append(el("strong", "", "উদ্দীপক: "), document.createTextNode(String(q.context))); wrap.append(p); }
  if (Array.isArray(q.sub_statements) && q.sub_statements.length) {
    const ol = el("ol"); ol.type = "i";
    q.sub_statements.forEach((s) => ol.append(el("li", "", String(s))));
    wrap.append(ol);
  }
  if (q.question) wrap.append(el("p", "main", String(q.question)));
  if (q.sub_question) wrap.append(el("p", "sub", String(q.sub_question)));
  if (q.image?.url) {
    try {
      const u = new URL(q.image.url, location.href);
      if (["http:", "https:"].includes(u.protocol)) { const img = el("img"); img.alt = "Question illustration"; img.loading = "lazy"; img.src = u.href; img.onerror = () => img.remove(); wrap.append(img); }
    } catch { /* ignore */ }
  }
  if (!wrap.children.length) wrap.append(el("p", "sub", "This question has no text."));
  return wrap;
}

function optionNode(q, i, { interactive, selected, correct, picked }) {
  const key = KEYS[i] ?? String(i + 1);
  const b = el(interactive ? "button" : "div", "a-opt");
  if (interactive) b.type = "button";
  b.dataset.key = key;
  b.append(el("span", "key", key), el("span", "label", optLabel(q.options[i])));
  if (selected === key) b.classList.add("selected");
  if (correct === key) b.classList.add("is-correct");
  else if (picked === key) b.classList.add("is-wrong");
  return b;
}

/* ---------- tabs ---------- */
$$(".a-tab").forEach((t) => t.addEventListener("click", () => {
  $$(".a-tab").forEach((x) => x.classList.toggle("active", x === t));
  $$(".a-view").forEach((v) => v.classList.toggle("active", v.id === `a-view-${t.dataset.tab}`));
}));

/* ---------- practice ---------- */
const P = { qs: [], i: 0, answers: new Map(), results: new Map(), submitted: false };

function renderPractice() {
  const has = P.qs.length > 0;
  $("#a-practice-empty").hidden = has;
  $("#a-practice-session").hidden = !has;
  if (!has) return;
  const q = P.qs[P.i], id = qid(q), sel = P.answers.get(id), res = P.results.get(id);
  $("#a-practice-count").textContent = `${P.i + 1} / ${P.qs.length}`;
  $("#a-practice-answered").textContent = `${P.answers.size} answered`;
  $("#a-practice-bar").style.width = `${(P.answers.size / P.qs.length) * 100}%`;
  $("#a-practice-prev").disabled = P.i === 0;
  $("#a-practice-next").disabled = P.i === P.qs.length - 1;
  $("#a-practice-submit").disabled = P.answers.size === 0 || P.submitted;
  $("#a-practice-more").hidden = !P.submitted;
  $("#a-practice-more").disabled = false;
  $("#a-practice-summary").textContent = P.submitted
    ? (lists.practice.next ? "Batch submitted. More questions are available." : "Batch submitted.")
    : P.answers.size ? `${P.answers.size} of ${P.qs.length} ready to submit.` : "Answer at least one question to submit.";

  $("#a-practice-dots").replaceChildren(...P.qs.map((x, n) => {
    const d = el("button", "a-dot", String(n + 1)); d.type = "button";
    const r = P.results.get(qid(x));
    if (P.answers.has(qid(x))) d.classList.add("answered");
    if (r === true) d.classList.add("is-correct"); else if (r === false) d.classList.add("is-wrong");
    if (n === P.i) d.classList.add("current");
    d.onclick = () => { P.i = n; renderPractice(); };
    return d;
  }));

  const opts = el("div", "a-opts");
  (q.options || []).forEach((_, n) => {
    const b = optionNode(q, n, { interactive: true, selected: sel, correct: res === undefined ? null : correctOf(q), picked: res === false ? sel : null });
    b.disabled = P.submitted;
    b.onclick = () => { P.answers.set(id, KEYS[n]); renderPractice(); };
    opts.append(b);
  });
  $("#a-practice-card").replaceChildren(renderQuestionBody(q), opts);
}

$("#a-practice-prev").onclick = () => { P.i = Math.max(0, P.i - 1); renderPractice(); };
$("#a-practice-next").onclick = () => { P.i = Math.min(P.qs.length - 1, P.i + 1); renderPractice(); };
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches("input,textarea,select")) return;
  if ($("#academic").hidden || !$("#a-view-practice").classList.contains("active") || P.submitted || !P.qs.length) return;
  if (e.key === "ArrowRight") $("#a-practice-next").click();
  else if (e.key === "ArrowLeft") $("#a-practice-prev").click();
  else { const n = Number(e.key) - 1; if (n >= 0 && n < 4) $$("#a-practice-card .a-opt")[n]?.click(); }
});

function startBatch(items) {
  Object.assign(P, { qs: items, i: 0, answers: new Map(), results: new Map(), submitted: false });
  $("#a-practice-result").hidden = true;
  renderPractice();
}

$("#a-load-practice").onclick = (e) => run(e.currentTarget, async () => {
  resetCursors("practice");
  const items = await fetchPage("practice", 0);
  startBatch(items);
  toast(items.length ? `Loaded ${items.length} questions.` : "No remaining questions for this chapter.");
});

$("#a-practice-more").onclick = (e) => run(e.currentTarget, async () => {
  const L = lists.practice;
  // Submitted questions leave the remaining list, so without a cursor we simply refetch the first page.
  const idx = L.next ? L.idx + 1 : 0;
  if (!L.next) resetCursors("practice");
  const items = await fetchPage("practice", idx);
  startBatch(items);
  toast(items.length ? `Loaded ${items.length} more questions.` : "No more questions.");
});

$("#a-practice-submit").onclick = (e) => run(e.currentTarget, async () => {
  const s = scope();
  const answers = [...P.answers].map(([question_id, answer]) => ({ question_id, answer }));
  const body = await api("POST", "/academic/submit-answer", { body: { subject_code: s.subject, chapter: s.chapter, answers } });
  P.submitted = true;
  for (const r of listOf(body)) {
    const id = String(r.question_id ?? r.questionId ?? r._id ?? r.id ?? "");
    const ok = r.correct ?? r.is_correct ?? r.isCorrect;
    if (id && typeof ok === "boolean") P.results.set(id, ok);
  }
  const box = $("#a-practice-result");
  box.textContent = body?.message || `Submitted ${answers.length} answers.`;
  box.hidden = false;
  renderPractice();
  toast("Answers submitted.");
});

/* ---------- review lists (wrong / right) ---------- */
const picked = new Set();
const updateDoneBtn = () => {
  const b = $("#a-done-selected");
  b.disabled = picked.size === 0;
  b.textContent = picked.size ? `Mark ${picked.size} done` : "Mark selected done";
};

function reviewCard(q, n, kind) {
  const id = qid(q);
  const card = el("article", "a-rcard");
  const head = el("div", "a-rhead");
  head.append(el("span", `a-chip ${kind === "wrong" ? "err" : "ok"}`, `#${n + 1}${id ? ` · ${id.slice(-6)}` : ""}`));
  if (kind === "wrong" && id) {
    const lab = el("label", "a-check"); const cb = el("input"); cb.type = "checkbox";
    cb.onchange = () => { cb.checked ? picked.add(id) : picked.delete(id); card.classList.toggle("picked", cb.checked); updateDoneBtn(); };
    lab.append(cb, document.createTextNode("Select"));
    head.append(lab);
  }
  const right = correctOf(q), mine = pickedOf(q);
  const opts = el("div", "a-opts");
  (q.options || []).forEach((_, i) => opts.append(optionNode(q, i, { interactive: false, correct: right, picked: kind === "wrong" ? mine : null, selected: kind === "right" ? mine : null })));
  card.append(head, renderQuestionBody(q), opts);
  const exp = q.explanation ?? q.solution;
  if (exp) card.append(el("div", "a-expl", String(exp)));
  return card;
}

async function showReview(kind, idx) {
  const items = await fetchPage(kind, idx);
  picked.clear(); updateDoneBtn();
  const host = $(`#a-${kind}-list`);
  if (items.length) host.replaceChildren(...items.map((q, n) => reviewCard(q, lists[kind].idx * (Number(ui.limit.value) || 10) + n, kind)));
  else { const empty = el("div", "a-empty"); empty.append(el("p", "", "Nothing to show.")); host.replaceChildren(empty); }
  const badge = $(`#a-count-${kind}`); badge.textContent = `${items.length}${lists[kind].next ? "+" : ""}`; badge.hidden = !items.length;
  updatePager(kind, items.length);
  host.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

["wrong", "right"].forEach((kind) => {
  $(`#a-load-${kind}`).onclick = (e) => run(e.currentTarget, async () => { resetCursors(kind); await showReview(kind, 0); });
  $$(`.a-pager[data-kind="${kind}"] button`).forEach((btn) => {
    btn.onclick = () => run(btn, async () => {
      const L = lists[kind];
      await showReview(kind, btn.dataset.dir === "next" ? L.idx + 1 : Math.max(0, L.idx - 1));
    });
  });
});

$("#a-done-selected").onclick = (e) => run(e.currentTarget, async () => {
  const s = scope();
  const ids = [...picked];
  await api("POST", "/academic/mark-as-done", { body: { subject_code: s.subject, chapter: s.chapter, question_ids: ids } });
  $$("#a-wrong-list .a-rcard.picked").forEach((c) => c.remove());
  picked.clear();
  resetCursors("wrong"); resetCursors("right");
  await showReview("wrong", 0);
  toast(`${ids.length} marked as done.`);
});

/* ---------- report ---------- */
const isPlain = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);
const pretty = (k) => k.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
const fmt = (v) => (typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v ?? "—"));

function table(rows) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => isPlain(r[k]))))].slice(0, 9);
  const wrap = el("div", "a-tbl-wrap"), t = el("table");
  const hr = el("tr"); cols.forEach((c) => hr.append(el("th", "", pretty(c))));
  const thead = el("thead"); thead.append(hr); t.append(thead);
  const tb = el("tbody");
  rows.forEach((r) => {
    const tr = el("tr");
    cols.forEach((c) => {
      const td = el("td", "", fmt(r[c]));
      if (/accuracy|percent|rate/i.test(c) && typeof r[c] === "number") {
        const bar = el("span", "a-bar"), i = el("i");
        i.style.width = `${Math.min(100, Math.max(0, r[c] <= 1 ? r[c] * 100 : r[c]))}%`;
        bar.append(i); td.append(bar);
      }
      tr.append(td);
    });
    tb.append(tr);
  });
  t.append(tb); wrap.append(t); return wrap;
}

$("#a-load-report").onclick = (e) => run(e.currentTarget, async () => {
  const s = scope({ needChapter: false });
  const body = await api("GET", "/academic/report", { query: { subject_code: s.subject } });
  const data = body?.data ?? body;
  const host = $("#a-report-body"); host.replaceChildren();
  const stats = el("div", "a-stats");
  Object.entries(data && typeof data === "object" && !Array.isArray(data) ? data : {}).forEach(([k, v]) => {
    if (typeof v === "number" || typeof v === "string") { const c = el("div", "a-stat"); c.append(el("span", "", pretty(k)), el("strong", "", fmt(v))); stats.append(c); }
  });
  if (stats.children.length) host.append(stats);
  const groups = data && typeof data === "object" ? Object.entries(data).filter(([, v]) => Array.isArray(v) && v.length && typeof v[0] === "object") : [];
  if (Array.isArray(data) && data.length && typeof data[0] === "object") groups.push(["Results", data]);
  groups.forEach(([k, rows]) => { host.append(el("h3", "", pretty(k))); host.append(table(rows)); });
  if (!host.children.length) host.append(el("pre", "", json(data, 2)));
});

/* ---------- tools ---------- */
$("#a-delete-run").onclick = (e) => run(e.currentTarget, async () => {
  const s = scope({ needChapter: false });
  const chapters = $("#a-delete-chapters").value.split(",").map((x) => Number(x.trim())).filter((n) => Number.isSafeInteger(n) && n > 0);
  if (!chapters.length) throw new Error("Enter at least one valid chapter number.");
  if (!confirm(`Restart practice for subject ${s.subject}, chapters ${chapters.join(", ")}? Progress will be deleted.`)) return;
  await api("POST", "/academic/reset", { body: { subject_code: s.subject, chapters } });
  toast("Practice restarted.");
  resetCursors("practice"); resetCursors("wrong"); resetCursors("right");
  P.qs = []; P.answers.clear(); P.results.clear(); P.submitted = false;
  renderPractice();
});

$("#a-raw-run").onclick = (e) => run(e.currentTarget, async () => {
  const method = $("#a-raw-method").value;
  const text = $("#a-raw-body").value.trim();
  const body = method !== "GET" ? (text ? JSON.parse(text) : {}) : undefined;
  const query = Object.fromEntries(new URLSearchParams($("#a-raw-query").value.trim()));
  await api(method, $("#a-raw-path").value.trim(), { query, body });
});

$("#a-insp-copy").onclick = async () => {
  try { await navigator.clipboard.writeText(ui.inspBody.textContent); toast("Copied."); } catch { toast("Copy failed.", true); }
};

/* ---------- boot ---------- */
showSection(location.hash === "#academic" ? "academic" : "battle");
window.addEventListener("hashchange", () => showSection(location.hash === "#academic" ? "academic" : "battle"));
})();
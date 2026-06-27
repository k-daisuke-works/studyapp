"use strict";
(async () => {
  const loading = document.getElementById("loading");
  const appEl = document.getElementById("app");
  let fetchedData;
  try {
    fetchedData = await fetch("data.json").then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  } catch {
    if (loading)
      loading.innerHTML =
        '<div class="load-error"><p>データの読み込みに失敗しました。</p>' +
        '<button onclick="location.reload()">再読み込み</button></div>';
    return;
  }
  if (loading) loading.hidden = true;
  if (appEl) appEl.hidden = false;
  const {
    days: DAYS,
    allTerms: ALL_TERMS,
    calc: CALC,
    afternoon: AFTERNOON,
    officialGlossary: OFFICIAL,
  } = fetchedData;
  const TERMS_BY_DAY = new Map();
  for (const term of ALL_TERMS) {
    if (!TERMS_BY_DAY.has(term.sourceDay)) TERMS_BY_DAY.set(term.sourceDay, []);
    TERMS_BY_DAY.get(term.sourceDay).push(term);
  }

  const START_KEY = "ap96_start_date",
    DONE_DATES_KEY = "ap96_done_dates",
    TIME_KEY = "ap96_minutes",
    MASTERY_KEY = "ap96_mastery",
    MASTERY_AT_KEY = "ap96_mastery_at",
    EXAM_KEY = "ap96_exam_date",
    MODE_KEY = "ap96_plan_mode",
    DAY_PLAN_KEY = "ap96_daily_terms",
    PLAN_VERSION_KEY = "ap96_plan_version",
    LAST_ACTIVITY_KEY = "ap96_last_activity",
    ONBOARDING_KEY = "ap96_onboarding_complete",
    PLAN_VERSION = "balanced-v3";

  let START = loadStart();

  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const color = (k) =>
    k === "テクノロジ系" ? "#2563eb"
    : k === "マネジメント系" ? "#16a34a"
    : "#dc2626";

  try {
    if (localStorage.getItem(PLAN_VERSION_KEY) !== PLAN_VERSION) {
      localStorage.removeItem(DAY_PLAN_KEY);
      localStorage.setItem(PLAN_VERSION_KEY, PLAN_VERSION);
    }
  } catch {}

  let doneDates = loadDoneDates(),
    mastery = loadObject(MASTERY_KEY),
    masteryAt = loadObject(MASTERY_AT_KEY),
    dailyPlans = loadObject(DAY_PLAN_KEY),
    studyMinutes = loadMinutes(),
    examDate = loadExamDate(),
    planMode = loadPlanMode(),
    lastActivity = loadText(LAST_ACTIVITY_KEY),
    currentTheme = 1,
    lastRevealedKey = null,
    themeFilter = "all",
    themeQuery = "",
    officialQuery = "";

  function loadDoneDates() {
    try {
      const v = JSON.parse(localStorage.getItem(DONE_DATES_KEY) || "[]");
      if (Array.isArray(v))
        return new Set(v.filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)));
    } catch {}
    return new Set();
  }
  function saveDoneDates() {
    try {
      localStorage.setItem(DONE_DATES_KEY, JSON.stringify([...doneDates].sort()));
    } catch {}
  }
  function loadObject(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "{}");
      return v && typeof v === "object" ? v : {};
    } catch { return {}; }
  }
  function saveObject(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  function loadText(key) {
    try { return localStorage.getItem(key) || ""; } catch { return ""; }
  }
  function loadMinutes() {
    try {
      const n = Number(localStorage.getItem(TIME_KEY) || 30);
      return [15, 30, 45, 60].includes(n) ? n : 30;
    } catch { return 30; }
  }
  function isoDate(d) {
    return (
      d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }
  function loadExamDate() {
    try {
      const saved = localStorage.getItem(EXAM_KEY);
      if (saved) return saved;
    } catch {}
    const d = new Date(START);
    d.setDate(d.getDate() + 95);
    return isoDate(d);
  }
  function loadPlanMode() {
    try {
      return localStorage.getItem(MODE_KEY) === "exam" ? "exam" : "time";
    } catch { return "time"; }
  }
  function loadStart() {
    try {
      const saved = localStorage.getItem(START_KEY);
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        const d = new Date(saved + "T00:00:00");
        if (!isNaN(d.getTime())) return d;
      }
    } catch {}
    return new Date(2026, 5, 24);
  }

  const termKey = (t) => t.sourceDay + "::" + t.w;

  function profile() {
    return studyMinutes === 15
      ? { review: 2, past: 3, afternoon: 0 }
      : studyMinutes === 30
        ? { review: 3, past: 5, afternoon: 0 }
        : studyMinutes === 45
          ? { review: 4, past: 10, afternoon: 15 }
          : { review: 5, past: 15, afternoon: 20 };
  }
  function knowledgeBudget() {
    return { 15: 5, 30: 12, 45: 18, 60: 25 }[studyMinutes];
  }
  function termMinutes(term) {
    return term.sourceType === "official" ? 0.5 : 2;
  }
  const NORMALIZED_CARD_MINUTES =
    ALL_TERMS.reduce((sum, t) => sum + termMinutes(t), 0) / ALL_TERMS.length;

  function remainingDays() {
    const today = new Date(),
      base = new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      exam = new Date(examDate + "T00:00:00");
    return Math.max(1, Math.floor((exam - base) / 86400000) + 1);
  }
  function daysSinceActivity() {
    if (!lastActivity) return 0;
    const previous = new Date(lastActivity + "T00:00:00"),
      today = new Date(todayId() + "T00:00:00"),
      diff = Math.floor((today - previous) / 86400000);
    return Math.max(0, diff - 1);
  }
  function markActivity() {
    lastActivity = todayId();
    try { localStorage.setItem(LAST_ACTIVITY_KEY, lastActivity); } catch {}
  }
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
  function showToast(message, isError = false) {
    const el = document.createElement("div");
    el.className = "toast" + (isError ? " toast-error" : "");
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  function showConfirm(message, onConfirm) {
    const el = document.createElement("div");
    el.className = "toast-confirm";
    el.innerHTML =
      '<span class="toast-confirm-msg"></span>' +
      '<button class="toast-ok">はい</button>' +
      '<button class="toast-cancel">キャンセル</button>';
    el.querySelector(".toast-confirm-msg").textContent = message;
    document.body.appendChild(el);
    el.querySelector(".toast-ok").onclick = () => { el.remove(); onConfirm(); };
    el.querySelector(".toast-cancel").onclick = () => el.remove();
  }
  const debouncedRenderAll = debounce(() => {
    renderAll();
    const el = document.getElementById("themeSearch");
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, 200);
  const debouncedRenderOfficial = debounce(() => {
    renderOfficial();
    const el = document.getElementById("officialSearch");
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, 200);

  function todayId() { return isoDate(new Date()); }

  function planInfo() {
    const unseenTerms = ALL_TERMS.filter((t) => !mastery[termKey(t)]),
      unseen = unseenTerms.length,
      remainingKnowledgeMinutes = unseen * NORMALIZED_CARD_MINUTES,
      days = remainingDays(),
      missedDays = daysSinceActivity(),
      requiredMinutes = Math.max(0, Math.ceil(remainingKnowledgeMinutes / days)),
      capMinutes = knowledgeBudget(),
      timeCount = unseen
        ? Math.max(1, Math.floor(capMinutes / NORMALIZED_CARD_MINUTES))
        : 0,
      targetCount =
        planMode === "exam"
          ? Math.min(unseen, Math.ceil(unseen / days))
          : Math.min(unseen, timeCount),
      plannedKnowledgeMinutes = targetCount * NORMALIZED_CARD_MINUTES,
      p = profile(),
      estimated = Math.ceil(plannedKnowledgeMinutes + p.review * 1.5 + 4 + p.past + p.afternoon),
      finishDays = timeCount ? Math.ceil(unseen / timeCount) : 0;
    return {
      unseen, days, missedDays, remainingKnowledgeMinutes, requiredMinutes,
      capMinutes, targetCount, plannedKnowledgeMinutes, estimated, finishDays,
      shortage: requiredMinutes > capMinutes,
      overload: requiredMinutes > 90,
    };
  }

  function cleanOldPlans() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    for (const key of Object.keys(dailyPlans)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && new Date(key) < cutoff)
        delete dailyPlans[key];
    }
  }

  function plannedTermsForToday(targetCount) {
    const valid = new Map(ALL_TERMS.map((t) => [termKey(t), t]));
    const id = todayId();
    const saved = (dailyPlans[id] || []).filter((k) => valid.has(k));
    if (saved.length) return saved.map((k) => valid.get(k));
    const unseen = ALL_TERMS.filter((t) => !mastery[termKey(t)]);
    const selected = unseen.slice(0, Math.max(0, targetCount));
    cleanOldPlans();
    dailyPlans[id] = selected.map(termKey);
    saveObject(DAY_PLAN_KEY, dailyPlans);
    // Auto-initialize currentTheme to primary theme of today's plan
    const firstSourceDay = selected[0]?.sourceDay;
    if (firstSourceDay) currentTheme = firstSourceDay;
    return selected;
  }

  function resetTodayPlan() {
    delete dailyPlans[todayId()];
    saveObject(DAY_PLAN_KEY, dailyPlans);
  }

  function isThemeDone(themeNo) {
    const terms = TERMS_BY_DAY.get(themeNo) || [];
    return terms.length > 0 && terms.every((t) => mastery[termKey(t)] === "known");
  }

  function localMidnight(isoStr) {
    const [y, m, d] = isoStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function dueReviews(limit) {
    const today = localMidnight(todayId());
    return ALL_TERMS
      .filter((t) => {
        const state = mastery[termKey(t)];
        if (!["unsure", "unknown"].includes(state)) return false;
        const lastDate = masteryAt[termKey(t)];
        if (!lastDate) return true;
        const days = Math.floor((today - localMidnight(lastDate)) / 86400000);
        return state === "unknown" ? days >= 1 : days >= 3;
      })
      .sort((a, b) =>
        (mastery[termKey(a)] === "unknown" ? 0 : 1) -
        (mastery[termKey(b)] === "unknown" ? 0 : 1),
      )
      .slice(0, limit);
  }

  function calcStreak() {
    const sorted = [...doneDates].sort().reverse();
    let streak = 0;
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (const date of sorted) {
      if (isoDate(d) === date) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  }

  function termHtml(t, showSource = false) {
    const key = termKey(t),
      state = mastery[key] || "";
    const ab =
      t.full || t.ja
        ? '<div class="abbr">' +
          (t.full ? '<div class="full">' + esc(t.full) + "</div>" : "") +
          (t.ja ? '<div class="ja">' + esc(t.ja) + "</div>" : "") +
          "</div>"
        : "";
    const official =
      t.sourceType === "official"
        ? '<span class="official-card">IPA公式細目カード</span>'
        : "";
    const source =
      showSource && t.sourceDay
        ? '<small class="source">' +
          (t.sourceType === "official" ? "所属" : "補強") +
          ":「" + esc(t.sourceName) + "」</small>"
        : "";
    const rates = [
      ["known", "分かった"],
      ["unsure", "怪しい"],
      ["unknown", "不明"],
    ]
      .map(
        ([id, label]) =>
          '<button class="rate ' + (state === id ? "active" : "") +
          '" data-key="' + esc(key) + '" data-rate="' + id + '">' +
          label + "</button>",
      )
      .join("");
    const stateDot = state
      ? '<span class="fc-dot fc-dot-' + state + '"></span>'
      : "";
    return (
      '<div class="flashcard" data-key="' + esc(key) + '">' +
      '<div class="fc-front">' +
      '<div class="term-name"><span>' + esc(t.w) + "</span>" + stateDot + "</div>" +
      ab +
      '<button class="fc-reveal">確認する</button>' +
      "</div>" +
      '<div class="fc-back" hidden>' +
      official +
      '<p class="fc-def">' + esc(t.d) + "</p>" +
      '<div class="term-example"><b>身近な関連：</b>' + esc(t.example) + "</div>" +
      source +
      '<div class="mastery">' + rates + "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function tableHtml(t) {
    return (
      '<div class="table-title">' + esc(t.title) + "</div>" +
      '<div class="table-wrap"><table><thead><tr>' +
      t.headers.map((h) => "<th>" + esc(h) + "</th>").join("") +
      "</tr></thead><tbody>" +
      t.rows
        .map((r) => "<tr>" + r.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>")
        .join("") +
      "</tbody></table></div>"
    );
  }

  function exportStudyData() {
    const data = {
      app: "ap96-study",
      version: 2,
      exportedAt: new Date().toISOString(),
      doneDates: [...doneDates],
      mastery,
      masteryAt,
      dailyPlans,
      settings: { studyMinutes, examDate, planMode, startDate: isoDate(START) },
      lastActivity,
      planVersion: PLAN_VERSION,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "ap96-study-" + todayId() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importStudyData(file, confirmReplace = true) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || data.app !== "ap96-study" || ![1, 2].includes(data.version))
          throw new Error("invalid");
        const validKeys = new Set(ALL_TERMS.map(termKey)),
          nextMastery = {};
        for (const [key, value] of Object.entries(data.mastery || {}))
          if (validKeys.has(key) && ["known", "unsure", "unknown"].includes(value))
            nextMastery[key] = value;
        const nextMasteryAt = {};
        for (const [key, value] of Object.entries(data.masteryAt || {}))
          if (validKeys.has(key) && /^\d{4}-\d{2}-\d{2}$/.test(value))
            nextMasteryAt[key] = value;
        const nextPlans = {};
        for (const [id, keys] of Object.entries(data.dailyPlans || {}))
          if (Array.isArray(keys)) nextPlans[id] = keys.filter((key) => validKeys.has(key));
        const minutes = Number(data.settings?.studyMinutes),
          mode = data.settings?.planMode,
          date = String(data.settings?.examDate || ""),
          startDate = String(data.settings?.startDate || "");
        const nextDoneDates = Array.isArray(data.doneDates)
          ? data.doneDates.filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
          : [];
        const doImport = () => {
          localStorage.setItem(DONE_DATES_KEY, JSON.stringify(nextDoneDates));
          localStorage.removeItem("ap96_done");
          localStorage.removeItem("ap96_review");
          localStorage.setItem(MASTERY_KEY, JSON.stringify(nextMastery));
          localStorage.setItem(MASTERY_AT_KEY, JSON.stringify(nextMasteryAt));
          localStorage.setItem(DAY_PLAN_KEY, JSON.stringify(nextPlans));
          if ([15, 30, 45, 60].includes(minutes)) localStorage.setItem(TIME_KEY, String(minutes));
          if (["time", "exam"].includes(mode)) localStorage.setItem(MODE_KEY, mode);
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) localStorage.setItem(EXAM_KEY, date);
          if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) localStorage.setItem(START_KEY, startDate);
          if (/^\d{4}-\d{2}-\d{2}$/.test(data.lastActivity || ""))
            localStorage.setItem(LAST_ACTIVITY_KEY, data.lastActivity);
          else localStorage.removeItem(LAST_ACTIVITY_KEY);
          localStorage.setItem(PLAN_VERSION_KEY, PLAN_VERSION);
          localStorage.setItem(ONBOARDING_KEY, "1");
          doneDates = loadDoneDates();
          mastery = loadObject(MASTERY_KEY);
          masteryAt = loadObject(MASTERY_AT_KEY);
          dailyPlans = loadObject(DAY_PLAN_KEY);
          studyMinutes = loadMinutes();
          examDate = loadExamDate();
          planMode = loadPlanMode();
          lastActivity = loadText(LAST_ACTIVITY_KEY);
          START = loadStart();
          currentTheme = 1;
          themeFilter = "all";
          themeQuery = "";
          officialQuery = "";
          renderToday();
          renderAll();
          renderCalc();
          renderAfternoon();
          renderOfficial();
          renderProgress();
          showToast("学習記録を復元しました。");
        };
        if (confirmReplace)
          showConfirm("現在の学習記録を、選択したJSONの内容で置き換えますか？", doImport);
        else doImport();
      } catch {
        showToast(
          "このJSONは復元できません。学習アプリから書き出したファイルを選んでください。",
          true,
        );
      }
    };
    reader.readAsText(file);
  }

  function hasExistingStudyData() {
    try {
      return Boolean(
        localStorage.getItem(ONBOARDING_KEY) ||
        localStorage.getItem(MASTERY_KEY) ||
        localStorage.getItem(DONE_DATES_KEY) ||
        localStorage.getItem("ap96_done") ||
        localStorage.getItem(LAST_ACTIVITY_KEY),
      );
    } catch { return true; }
  }

  function setupWelcome() {
    const welcome = document.getElementById("welcome");
    if (hasExistingStudyData()) return;
    welcome.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("startFresh").onclick = () => {
      try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
      welcome.hidden = true;
      document.body.style.overflow = "";
    };
    const button = document.getElementById("startImport"),
      file = document.getElementById("welcomeImportFile");
    button.onclick = () => file.click();
    file.onchange = () => {
      const selected = file.files?.[0];
      if (selected) importStudyData(selected, false);
    };
  }

  function timeBoxHtml(todayTerms, info) {
    const p = profile(),
      rated = todayTerms.filter((t) => mastery[termKey(t)]).length,
      knowledgeMinutes = Math.ceil(todayTerms.length * NORMALIZED_CARD_MINUTES),
      missionMinutes = Math.ceil(
        todayTerms.length * NORMALIZED_CARD_MINUTES + p.review * 1.5 + 4 + p.past + p.afternoon,
      );
    const options = [15, 30, 45, 60]
      .map(
        (n) =>
          '<button class="time-option ' + (studyMinutes === n ? "active" : "") +
          '" data-minutes="' + n + '">' + n + "分</button>",
      )
      .join("");
    const modes = [
      ["time", "時間優先"],
      ["exam", "試験日優先"],
    ]
      .map(
        ([id, label]) =>
          '<button class="mode-option ' + (planMode === id ? "active" : "") +
          '" data-mode="' + id + '">' + label + "</button>",
      )
      .join("");
    const activeSetting =
      planMode === "time"
        ? '<div class="active-setting"><span class="setting-label">今日確保できる時間</span>' +
          '<div class="time-options">' + options + "</div></div>"
        : '<div class="active-setting"><label>受験予定日</label>' +
          '<input class="exam-date" id="examDate" type="date" value="' + esc(examDate) + '"></div>';
    const startSetting =
      '<div class="active-setting" style="margin-top:8px"><label>学習開始日</label>' +
      '<input class="exam-date" id="startDate" type="date" value="' + esc(isoDate(START)) + '"></div>';
    const afternoon = p.afternoon
      ? "<li>午後問題 " + p.afternoon + "分</li>"
      : "<li>午後問題は週末または余裕のある日に回す</li>";
    const gap = info.missedDays
      ? " 前回の学習から" + info.missedDays + "日空いています。"
      : "";
    const summary =
      planMode === "exam"
        ? "試験まで" + info.days + "日。未学習の残り" + info.unseen +
          "カードを毎日約" + info.targetCount + "カード（差は最大1枚）に再平均化します。" + gap
        : "毎日" + info.targetCount + "カードに固定します。未評価分は消さず、次回の先頭へ順番に繰り越します。知識学習は約" +
          knowledgeMinutes + "分、残り約" + info.finishDays + "学習日です。" + gap;
    const warn =
      info.overload && planMode === "exam"
        ? " 1日の必要量が非常に多いため、試験日か学習時間を見直してください。"
        : "";
    return (
      '<section class="time-box"><strong>⏱ 学習計画を自動調整</strong>' +
      '<span class="setting-label">配分方法</span><div class="mode-options">' + modes + "</div>" +
      activeSetting + startSetting +
      '<div class="plan-summary ' + (warn ? "plan-warning" : "") + '">' + summary + warn + "</div>" +
      '<div class="mission"><b>今日の合格ミッション（推定' + missionMinutes + "分）</b><ul>" +
      "<li>新規知識 " + todayTerms.length + "カードを思い出して3段階評価</li>" +
      "<li>苦手復習 最大" + p.review + "項目</li>" +
      "<li>計算問題 1問</li><li>午前過去問 " + p.past + "問</li>" +
      afternoon +
      '</ul><div class="mission-progress">今日の知識評価：' + rated + " / " + todayTerms.length +
      '</div></div><div class="data-tools"><p>端末間の移行：現在の学習記録をJSONファイルで持ち運べます。</p>' +
      '<div class="data-buttons"><button class="data-button" id="exportData">JSONを書き出す</button>' +
      '<button class="data-button" id="importData">JSONから復元</button></div>' +
      '<input id="importFile" type="file" accept="application/json,.json" hidden></div></section>'
    );
  }

  function onRate(key, rate) {
    mastery[key] = rate;
    masteryAt[key] = todayId();
    saveObject(MASTERY_KEY, mastery);
    saveObject(MASTERY_AT_KEY, masteryAt);
    markActivity();
    document.querySelectorAll('.rate[data-key="' + CSS.escape(key) + '"]').forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.rate === rate);
    });
    const card = document.querySelector('.flashcard[data-key="' + CSS.escape(key) + '"]');
    if (card) {
      let dot = card.querySelector(".fc-dot");
      if (!dot) {
        dot = document.createElement("span");
        card.querySelector(".term-name").appendChild(dot);
      }
      dot.className = "fc-dot fc-dot-" + rate;
      const allCards = [...document.querySelectorAll(".flashcard")];
      const idx = allCards.indexOf(card);
      const next = allCards.slice(idx + 1).find((c) => !c.dataset.revealed);
      if (next) next.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    updateDoneButton();
    renderProgress();
    const missionProgress = document.querySelector(".mission-progress");
    if (missionProgress) {
      const inf = planInfo();
      const terms = plannedTermsForToday(inf.targetCount);
      const rated = terms.filter((t) => mastery[termKey(t)]).length;
      missionProgress.textContent = "今日の知識評価：" + rated + " / " + terms.length;
    }
  }

  function updateDoneButton() {
    const btn = document.getElementById("doneBtn");
    if (!btn) return;
    const today = todayId();
    const todayDone = doneDates.has(today);
    const info = planInfo();
    const todayTerms = plannedTermsForToday(info.targetCount);
    const ratedCount = todayTerms.filter((t) => mastery[termKey(t)]).length;
    const canComplete = todayTerms.length === 0 || ratedCount === todayTerms.length;
    btn.disabled = !canComplete && !todayDone;
    btn.className = "done" + (todayDone ? " on" : "");
    btn.textContent = todayDone
      ? "✓ 完了済み"
      : canComplete
        ? "学習完了"
        : "全カードを評価すると完了できます";
  }

  function bindStudyControls() {
    document.querySelectorAll(".time-option").forEach(
      (b) => (b.onclick = () => {
        studyMinutes = +b.dataset.minutes;
        try { localStorage.setItem(TIME_KEY, String(studyMinutes)); } catch {}
        resetTodayPlan();
        renderToday();
        renderAfternoon();
      }),
    );
    document.querySelectorAll(".mode-option").forEach(
      (b) => (b.onclick = () => {
        planMode = b.dataset.mode;
        try { localStorage.setItem(MODE_KEY, planMode); } catch {}
        resetTodayPlan();
        renderToday();
      }),
    );
    const exam = document.getElementById("examDate");
    if (exam)
      exam.onchange = () => {
        examDate = exam.value || loadExamDate();
        try { localStorage.setItem(EXAM_KEY, examDate); } catch {}
        resetTodayPlan();
        renderToday();
      };
    const startDateEl = document.getElementById("startDate");
    if (startDateEl)
      startDateEl.onchange = () => {
        const val = startDateEl.value;
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
          try { localStorage.setItem(START_KEY, val); } catch {}
          START = loadStart();
          resetTodayPlan();
          renderToday();
        }
      };
    document.getElementById("exportData").onclick = exportStudyData;
    const importButton = document.getElementById("importData"),
      importFile = document.getElementById("importFile");
    importButton.onclick = () => importFile.click();
    importFile.onchange = () => {
      const file = importFile.files?.[0];
      if (file) importStudyData(file);
    };
    document.querySelectorAll(".fc-reveal").forEach(
      (btn) => (btn.onclick = () => {
        const card = btn.closest(".flashcard");
        card.querySelector(".fc-back").hidden = false;
        card.dataset.revealed = "1";
        btn.hidden = true;
        lastRevealedKey = card.dataset.key;
      }),
    );
    document.querySelectorAll(".rate").forEach(
      (b) => (b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onRate(b.dataset.key, b.dataset.rate);
      }),
    );
  }

  function renderToday() {
    lastRevealedKey = null;
    const info = planInfo(),
      todayTerms = plannedTermsForToday(info.targetCount),
      ratedCount = todayTerms.filter((t) => mastery[termKey(t)]).length,
      canComplete = todayTerms.length === 0 || ratedCount === todayTerms.length,
      todayDone = doneDates.has(todayId());

    const sourceDays = [...new Set(todayTerms.map((t) => t.sourceDay))];
    let themeHeader, practiceLinks, tables;
    if (sourceDays.length === 1) {
      const d = DAYS[sourceDays[0] - 1];
      themeHeader =
        '<span class="badge" style="background:' + color(d.kei) + '">' + esc(d.kei) + "</span>" +
        '<div class="crumb">' + esc(d.dai) + " ▸ 中分類" + d.chuNo + " " + esc(d.chuName) + "</div>" +
        "<h2>" + esc(d.subName) + "</h2>" +
        '<p class="intro">' + esc(d.intro) + "</p>";
      practiceLinks =
        '<a class="practice" href="' + esc(d.url) + '" target="_blank" rel="noopener">主テーマの過去問を解く ↗</a>' +
        '<small class="url-note">' + esc(d.urlNote) + "</small>";
      tables = d.tables.length
        ? '<details class="reference"><summary>📋 余力があれば見る参考表（' + d.tables.length + "個）</summary>" +
          d.tables.map(tableHtml).join("") + "</details>"
        : "";
    } else if (sourceDays.length === 0) {
      const d = DAYS[currentTheme - 1];
      themeHeader =
        '<span class="badge" style="background:' + color(d.kei) + '">' + esc(d.kei) + "</span>" +
        '<div class="crumb">' + esc(d.dai) + " ▸ 中分類" + d.chuNo + " " + esc(d.chuName) + "</div>" +
        "<h2>" + esc(d.subName) + "</h2>" +
        '<p class="intro">' + esc(d.intro) + "</p>";
      practiceLinks =
        '<a class="practice" href="' + esc(d.url) + '" target="_blank" rel="noopener">主テーマの過去問を解く ↗</a>' +
        '<small class="url-note">' + esc(d.urlNote) + "</small>";
      tables = "";
    } else {
      themeHeader =
        '<div class="crumb">複数テーマ（' + sourceDays.length + "テーマ）</div>" +
        "<h2>今日の学習カード</h2>" +
        '<p class="intro">' +
        sourceDays.map((n) => DAYS[n - 1]?.subName).filter(Boolean).join("・") +
        "</p>";
      practiceLinks = sourceDays
        .map((n) => {
          const d = DAYS[n - 1];
          return d
            ? '<a class="practice" style="margin-bottom:6px" href="' + esc(d.url) +
              '" target="_blank" rel="noopener">' + esc(d.subName) + " の過去問を解く ↗</a>"
            : "";
        })
        .join("");
      tables = "";
    }

    const c = CALC[(currentTheme - 1) % CALC.length],
      reviews = dueReviews(profile().review),
      reviewBlock = reviews.length
        ? '<article class="card"><div class="card-pad"><h3>🔁 今日の苦手復習（' +
          reviews.length + '項目）</h3>' +
          '<p class="intro">「怪しい」「不明」にした過去の項目です。答えを開く前に説明してみてください。</p>' +
          reviews.map((t) => termHtml(t, true)).join("") + "</div></article>"
        : "";

    const streak = calcStreak();
    const streakBadge =
      streak >= 2 ? ' <span class="streak-badge">🔥 ' + streak + "日連続</span>" : "";

    document.getElementById("today").innerHTML =
      '<div class="day-nav">' +
      '<button class="nav-btn" id="prev" ' + (currentTheme === 1 ? "disabled" : "") +
      ' aria-label="前のテーマ">‹</button>' +
      '<div class="day-center"><strong>テーマ ' + currentTheme + " / 96</strong>" +
      "<small>" + esc(DAYS[currentTheme - 1]?.subName || "") + "</small></div>" +
      '<button class="nav-btn" id="next" ' + (currentTheme === 96 ? "disabled" : "") +
      ' aria-label="次のテーマ">›</button></div>' +
      timeBoxHtml(todayTerms, info) +
      '<article class="card"><div class="card-pad">' +
      themeHeader +
      '<div class="balance-note">詳説カードとIPA公式細目カードを含む全' + ALL_TERMS.length +
      '項目から、確保時間または試験日で今日の表示数を自動計算します。</div>' +
      '<h3 class="section-title">📚 今日の知識（' + todayTerms.length + "項目）" + streakBadge + "</h3>" +
      (todayTerms.length
        ? todayTerms.map((t) => termHtml(t, sourceDays.length > 1)).join("")
        : '<div class="empty">新規知識はすべて評価済みです。苦手復習と過去問へ進みましょう。</div>') +
      tables + practiceLinks +
      "</div></article>" +
      '<article class="card calc-card"><div class="card-pad"><h3>🧮 今日の計算1問｜' +
      esc(c.name) + "</h3>" +
      '<p class="question">' + esc(c.ex) + "</p>" +
      '<button class="reveal" id="reveal">答えと公式を見る</button>' +
      '<div class="answer-box" id="answer">' +
      '<p><span class="calc-label">答え：</span>' + esc(c.ans) + "</p>" +
      '<p><span class="calc-label">公式：</span>' + esc(c.formula) + "</p>" +
      '<p><span class="calc-label">コツ：</span>' + esc(c.tip) + "</p></div></div></article>" +
      reviewBlock +
      '<button class="done ' + (todayDone ? "on" : "") +
      '" id="doneBtn" ' + (!canComplete && !todayDone ? "disabled" : "") + ">" +
      (todayDone ? "✓ 完了済み" : canComplete ? "学習完了" : "全カードを評価すると完了できます") +
      "</button>";

    document.getElementById("prev").onclick = () => move(-1);
    document.getElementById("next").onclick = () => move(1);
    document.getElementById("reveal").onclick = (e) => {
      const a = document.getElementById("answer");
      a.classList.toggle("open");
      e.currentTarget.textContent = a.classList.contains("open")
        ? "答えを隠す"
        : "答えと公式を見る";
    };
    document.getElementById("doneBtn").onclick = toggleDone;
    bindStudyControls();
  }

  function move(n) {
    currentTheme = Math.max(1, Math.min(96, currentTheme + n));
    renderToday();
    renderAfternoon();
    scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleDone() {
    const today = todayId();
    if (!doneDates.has(today)) {
      const info = planInfo();
      const assigned = plannedTermsForToday(info.targetCount);
      if (assigned.some((t) => !mastery[termKey(t)])) return;
      doneDates.add(today);
    } else {
      doneDates.delete(today);
    }
    saveDoneDates();
    markActivity();
    renderToday();
    renderAll();
    renderProgress();
  }

  function renderAll() {
    const indexed = DAYS.map((d, i) => ({
      ...d,
      day: i + 1,
      allDayTerms: TERMS_BY_DAY.get(i + 1) || [],
    }));
    const reviewCount = indexed.filter((d) =>
      (TERMS_BY_DAY.get(d.day) || []).some((t) =>
        ["unsure", "unknown"].includes(mastery[termKey(t)]),
      ),
    ).length;
    const visible = indexed.filter((d) => {
      const themeDone = isThemeDone(d.day);
      const hasUnsure = (TERMS_BY_DAY.get(d.day) || []).some((t) =>
        ["unsure", "unknown"].includes(mastery[termKey(t)]),
      );
      if (themeFilter === "done" && !themeDone) return false;
      if (themeFilter === "todo" && themeDone) return false;
      if (themeFilter === "review" && !hasUnsure) return false;
      const q = themeQuery.trim().toLowerCase();
      return (
        !q ||
        [d.subName, d.chuName, d.kei, ...d.allDayTerms.flatMap((t) => [t.w, t.d, t.full, t.ja])]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    });
    const groups = [];
    for (const d of visible) {
      let g = groups.at(-1);
      if (!g || g.no !== d.chuNo) {
        g = { no: d.chuNo, name: d.chuName, kei: d.kei, items: [] };
        groups.push(g);
      }
      g.items.push(d);
    }
    const tools =
      '<div class="theme-tools"><input class="theme-search" id="themeSearch" value="' +
      esc(themeQuery) + '" placeholder="テーマ・用語・解説を検索"><div class="filters">' +
      [
        ["all", "すべて"],
        ["todo", "未完了"],
        ["done", "完了"],
        ["review", "要復習 " + reviewCount],
      ]
        .map(
          ([id, label]) =>
            '<button class="filter ' + (themeFilter === id ? "active" : "") +
            '" data-filter="' + id + '">' + label + "</button>",
        )
        .join("") +
      "</div></div>";
    const list = groups.length
      ? groups
          .map(
            (g) =>
              '<section class="group"><h3 style="background:' +
              color(g.kei) + '">中分類' + g.no + "｜" + esc(g.name) + "</h3>" +
              g.items
                .map((d) => {
                  const themeDone = isThemeDone(d.day);
                  const hasUnsure = (TERMS_BY_DAY.get(d.day) || []).some((t) =>
                    ["unsure", "unknown"].includes(mastery[termKey(t)]),
                  );
                  return (
                    '<button class="theme-row" data-day="' + d.day + '">' +
                    '<span class="theme-no ' + (themeDone ? "ok" : "") + '">' +
                    (themeDone ? "✓" : d.day) + "</span>" +
                    "<span><strong>" + esc(d.subName) +
                    (hasUnsure ? ' <span class="review-mark">★</span>' : "") +
                    "</strong><br><small>" + esc(d.kei) + "・全" + d.allDayTerms.length +
                    "カード</small></span></button>"
                  );
                })
                .join("") +
              "</section>",
          )
          .join("")
      : '<div class="empty">条件に合うテーマはありません。</div>';
    document.getElementById("all").innerHTML = tools + list;
    document.getElementById("themeSearch").oninput = (e) => {
      themeQuery = e.target.value;
      debouncedRenderAll();
    };
    document.querySelectorAll(".filter").forEach(
      (b) => (b.onclick = () => { themeFilter = b.dataset.filter; renderAll(); }),
    );
    document.querySelectorAll(".theme-row").forEach(
      (b) => (b.onclick = () => {
        currentTheme = +b.dataset.day;
        showTab("today");
        renderToday();
        renderAfternoon();
        scrollTo({ top: 0, behavior: "smooth" });
      }),
    );
  }

  function renderCalc() {
    document.getElementById("calc").innerHTML =
      '<article class="card">' +
      CALC.map(
        (c, i) =>
          '<section class="formula"><h3>' + (i + 1) + ". " + esc(c.name) + "</h3>" +
          "<p><b>例題：</b>" + esc(c.ex) + "</p>" +
          "<p><b>答え：</b>" + esc(c.ans) + "</p>" +
          "<p><b>公式：</b>" + esc(c.formula) + "</p>" +
          "<p><b>コツ：</b>" + esc(c.tip) + "</p></section>",
      ).join("") +
      "</article>";
  }

  function renderAfternoon() {
    const a = AFTERNOON[(currentTheme - 1) % AFTERNOON.length],
      minutes = profile().afternoon,
      guide = minutes
        ? '<div class="drill"><b>今日の' + minutes + "分ドリル</b><ol>" +
          "<li>IPA過去問から「" + esc(a.name) + "」を1問選ぶ。</li>" +
          "<li>設問を先に読み、問われる対象と字数を囲む。</li>" +
          "<li>本文中の根拠へ線を引き、主語と理由を入れて解答する。</li>" +
          "<li>解答例と採点講評を読み、抜けた根拠を要復習へ登録する。</li>" +
          "</ol></div>"
        : '<div class="drill"><b>今日の時間設定では任意</b>' +
          "<p>15・30分コースでは午前の基礎を優先します。週末か45分以上確保できる日に取り組んでください。</p></div>";
    document.getElementById("afternoon").innerHTML =
      '<section class="afternoon-hero"><h2>午後問題トレーニング</h2>' +
      "<p>2026年度も記述式・150分・11問中5問です。知識暗記に加え、本文から根拠を拾って短く答える練習をします。</p></section>" +
      '<article class="card"><div class="afternoon-card">' +
      '<span class="badge" style="background:#7c3aed">今回の重点分野</span>' +
      "<h3>" + esc(a.name) + "</h3>" +
      "<p>" + esc(a.focus) + "</p>" +
      '<p class="method"><b>読み方：</b>' + esc(a.method) + "</p>" +
      guide +
      '<a class="practice" href="https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html"' +
      ' target="_blank" rel="noopener">IPA公式の過去問題・解答例を開く ↗</a></div></article>' +
      AFTERNOON.map(
        (x) =>
          '<article class="card"><div class="afternoon-card">' +
          "<h3>" + esc(x.name) + "</h3>" +
          "<p>" + esc(x.focus) + "</p>" +
          '<p class="method"><b>攻略：</b>' + esc(x.method) + "</p></div></article>",
      ).join("");
  }

  function renderOfficial() {
    const q = officialQuery.trim().toLowerCase(),
      covered = OFFICIAL.filter((x) => x.covered).length;
    const matches = q
      ? OFFICIAL.filter((x) =>
          [x.term, x.middle, x.topic, x.subsection].join(" ").toLowerCase().includes(q),
        ).slice(0, 150)
      : [];
    const rows = matches.length
      ? matches
          .map(
            (x) =>
              '<article class="official-row"><strong>' + esc(x.term) + "</strong>" +
              '<div class="official-path">' +
              esc([x.middle, x.topic, x.subsection].filter(Boolean).join(" ▸ ")) +
              "</div>" +
              '<span class="coverage-badge ' + (x.covered ? "on" : "") + '">' +
              (x.covered ? "詳説カードまたは説明内に収録" : "公式細目索引に収録") +
              "</span></article>",
          )
          .join("")
      : q
        ? '<div class="empty">該当する公式用語はありません。</div>'
        : '<div class="empty">用語を入力してください。例：trap要求、HTTP、XML、Docker、OAuth</div>';
    document.getElementById("official").innerHTML =
      '<section class="glossary-head"><h2>IPA公式細目辞典</h2>' +
      "<p>シラバスVer.7.2の「用語例」を検索します。細かい選択肢の見覚えを作るための索引です。</p></section>" +
      '<input class="glossary-search" id="officialSearch" value="' + esc(officialQuery) +
      '" placeholder="公式用語を検索">' +
      '<div class="glossary-stat">公式名称 ' + OFFICIAL.length +
      "件／詳説・説明内で確認できる名称 " + covered + "件" +
      (q ? "／検索結果 " + matches.length + "件" : "") + "</div>" +
      rows;
    document.getElementById("officialSearch").oninput = (e) => {
      officialQuery = e.target.value;
      debouncedRenderOfficial();
    };
  }

  function renderProgress() {
    const evaluated = ALL_TERMS.filter((t) => mastery[termKey(t)]).length,
      p = Math.round((evaluated / ALL_TERMS.length) * 100);
    const streak = calcStreak();
    const streakText = streak >= 1 ? "　🔥 " + streak + "日連続" : "";
    document.getElementById("progressText").textContent =
      "カード " + evaluated + "/" + ALL_TERMS.length + " 評価" + streakText;
    document.getElementById("progressPct").textContent = p + "%";
    document.getElementById("progressBar").style.width = p + "%";

    const byKei = { テクノロジ系: [0, 0], マネジメント系: [0, 0], ストラテジ系: [0, 0] };
    for (const t of ALL_TERMS) {
      const day = DAYS[t.sourceDay - 1];
      if (!day || !byKei[day.kei]) continue;
      byKei[day.kei][1]++;
      if (mastery[termKey(t)]) byKei[day.kei][0]++;
    }
    const keiColors = { テクノロジ系: "#2563eb", マネジメント系: "#16a34a", ストラテジ系: "#dc2626" };
    const keiHtml = Object.entries(byKei)
      .map(([name, [done, total]]) => {
        const pct = total ? Math.round((done / total) * 100) : 0;
        return (
          '<div class="kei-bar"><span class="kei-label">' + name + "</span>" +
          '<div class="kei-track"><i style="width:' + pct + "%;background:" + keiColors[name] + '"></i></div>' +
          '<span class="kei-pct">' + pct + "%</span></div>"
        );
      })
      .join("");
    let keiEl = document.getElementById("keiProgress");
    if (!keiEl) {
      keiEl = document.createElement("div");
      keiEl.id = "keiProgress";
      keiEl.className = "kei-progress";
      document.querySelector(".hero")?.appendChild(keiEl);
    }
    keiEl.innerHTML = keiHtml;
  }

  function showTab(id) {
    document.querySelectorAll(".tab").forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === id),
    );
    document.querySelectorAll(".panel").forEach((p) =>
      p.classList.toggle("active", p.id === id),
    );
  }

  document.querySelectorAll(".tab").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

  document.addEventListener("keydown", (e) => {
    if (!lastRevealedKey) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    const rateMap = {
      "1": "known", k: "known",
      "2": "unsure", u: "unsure",
      "3": "unknown", x: "unknown",
    };
    const rate = rateMap[e.key];
    if (rate) {
      e.preventDefault();
      onRate(lastRevealedKey, rate);
      lastRevealedKey = null;
    }
  });

  renderToday();
  renderAll();
  renderCalc();
  renderAfternoon();
  renderOfficial();
  renderProgress();
  setupWelcome();
})();

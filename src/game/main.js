import { DT, TUNING, distXZ } from "../sim/config.js";
import { getNightMap } from "../sim/maps.js";
import { createSimulation } from "../sim/simulation.js";
import { createAudioEngine } from "./audio.js";
import { createWorldRenderer } from "./scene.js";
import { ACTION_LABELS, DEFAULT_KEYBINDS, loadSettings, saveSettings } from "./settings.js";
import { DANG_PORTRAIT_SVG, buildDangDialogueSteps, formatKeyLabel } from "./dialogue.js";

const canvas = document.getElementById("game-canvas");
const hudEl = document.getElementById("hud");
const hudBottomEl = document.getElementById("hud-bottom");
const captionsEl = document.getElementById("captions");
const promptEl = document.getElementById("prompt");
const arrowEl = document.getElementById("lantern-arrow");
const arrowLabel = document.getElementById("arrow-label");
const shadeArrowEl = document.getElementById("shade-arrow");
const shadeArrowLabel = document.getElementById("shade-arrow-label");

const overlayEl = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const controlsBox = document.getElementById("controls-box");
const dialogueBox = document.getElementById("dialogue-box");
const dangPortrait = document.getElementById("dang-portrait");
const dialogueText = document.getElementById("dialogue-text");
const dialogueDots = document.getElementById("dialogue-dots");
const dialogueNextBtn = document.getElementById("dialogue-next-btn");
const dialogueSkipBtn = document.getElementById("dialogue-skip-btn");
const skipDawnBtn = document.getElementById("skip-dawn-btn");
const settingsBox = document.getElementById("settings-box");
const leaderboardBox = document.getElementById("leaderboard-box");
const scoreSubmitBox = document.getElementById("score-submit-box");
const playerNameInput = document.getElementById("player-name-input");
const saveScoreBtn = document.getElementById("save-score-btn");
const saveScoreMsg = document.getElementById("save-score-msg");
const overlayStats = document.getElementById("overlay-stats");

const primaryBtn = document.getElementById("primary-btn");
const secondaryBtn = document.getElementById("secondary-btn");
const lbBtn = document.getElementById("lb-btn");
const menuBtn = document.getElementById("menu-btn");
const devNightBar = document.getElementById("dev-night-bar");
const devN1Btn = document.getElementById("dev-n1");
const devN2Btn = document.getElementById("dev-n2");
const devN3Btn = document.getElementById("dev-n3");
const devFastToggle = document.getElementById("dev-fast-mode");

const volSlider = document.getElementById("vol-slider");
const volVal = document.getElementById("vol-val");
const sensSlider = document.getElementById("sens-slider");
const sensVal = document.getElementById("sens-val");
const cbToggle = document.getElementById("cb-toggle");
const rmToggle = document.getElementById("rm-toggle");
const ltToggle = document.getElementById("lt-toggle");
const resetKeysBtn = document.getElementById("reset-keys-btn");
const keybindWarn = document.getElementById("keybind-warn");
const keybindsGrid = document.getElementById("keybinds-grid");

const hudFlames = document.getElementById("hud-flames");
const hudHpFill = document.getElementById("hud-hp-fill");
const hudCharm = document.getElementById("hud-charm");
const hudCharmVal = document.getElementById("hud-charm-val");
const hudNightLabel = document.getElementById("hud-night-label");
const hudTime = document.getElementById("hud-time");
const hudWind = document.getElementById("hud-wind");
const hudLanterns = document.getElementById("hud-lanterns");
const hudScore = document.getElementById("hud-score");
const hudCarried = document.getElementById("hud-carried");
const hudCap = document.getElementById("hud-cap");
const hudDash = document.getElementById("hud-dash");
const hudPulse = document.getElementById("hud-pulse");
const moteSlotsEl = document.getElementById("mote-slots");

for (let i = 0; i < 20; i++) {
  const slot = document.createElement("div");
  slot.className = "mote-slot";
  moteSlotsEl.appendChild(slot);
}

const settings = loadSettings();
const audio = createAudioEngine(settings.volume);
const world = createWorldRenderer(canvas);
const keys = new Set();

function applyAccessibilityClasses() {
  document.body.classList.toggle("colorblind", settings.colorblind);
  document.body.classList.toggle("reduced-motion", settings.reducedMotion);
  document.body.classList.toggle("large-text", settings.largeText);
}

applyAccessibilityClasses();

volSlider.value = String(Math.round(settings.volume * 100));
volVal.textContent = `${volSlider.value}%`;
sensSlider.value = String(Math.round(settings.sensitivity * 100));
sensVal.textContent = settings.sensitivity.toFixed(2);
cbToggle.checked = settings.colorblind;
rmToggle.checked = settings.reducedMotion;
ltToggle.checked = settings.largeText;

volSlider.addEventListener("input", () => {
  settings.volume = Number(volSlider.value) / 100;
  volVal.textContent = `${volSlider.value}%`;
  audio.setVolume(settings.volume);
  saveSettings(settings);
});

sensSlider.addEventListener("input", () => {
  settings.sensitivity = Number(sensSlider.value) / 100;
  sensVal.textContent = settings.sensitivity.toFixed(2);
  saveSettings(settings);
});

cbToggle.addEventListener("change", () => {
  settings.colorblind = cbToggle.checked;
  applyAccessibilityClasses();
  saveSettings(settings);
});

rmToggle.addEventListener("change", () => {
  settings.reducedMotion = rmToggle.checked;
  applyAccessibilityClasses();
  saveSettings(settings);
});

ltToggle.addEventListener("change", () => {
  settings.largeText = ltToggle.checked;
  applyAccessibilityClasses();
  saveSettings(settings);
});

let listeningAction = null;

function checkDuplicateKeybinds() {
  const seen = new Map();
  const dups = [];
  for (const [action, code] of Object.entries(settings.keybinds)) {
    if (seen.has(code)) {
      dups.push(`${ACTION_LABELS[seen.get(code)]} & ${ACTION_LABELS[action]} (${code})`);
    } else {
      seen.set(code, action);
    }
  }
  if (dups.length > 0) {
    keybindWarn.textContent = `⚠ Trùng phím: ${dups.join(", ")}`;
    keybindWarn.classList.remove("hidden");
  } else {
    keybindWarn.classList.add("hidden");
  }
}

function updateControlsBox() {
  const kb = settings.keybinds;
  const moveStr = `${formatKeyLabel(kb.moveUp)}${formatKeyLabel(kb.moveLeft)}${formatKeyLabel(kb.moveDown)}${formatKeyLabel(kb.moveRight)}`;
  controlsBox.innerHTML =
    `<div><b>Di chuyển:</b> ${moveStr} / Mũi tên · <b>Kéo chuột:</b> Xoay & nghiêng góc nhìn</div>` +
    `<div><b>Nhảy:</b> ${formatKeyLabel(kb.jump)} · <b>Lướt:</b> ${formatKeyLabel(kb.dash)} · <b>Nạp/Châm dầu:</b> ${formatKeyLabel(kb.interact)} · <b>Tỏa Sáng:</b> ${formatKeyLabel(kb.pulse)} · <b>Chém sáng:</b> Click / ${formatKeyLabel(kb.slash)}</div>`;
}

function renderKeybinds() {
  keybindsGrid.innerHTML = "";
  for (const [action, label] of Object.entries(ACTION_LABELS)) {
    const row = document.createElement("div");
    row.className = "keybind-item";
    const span = document.createElement("span");
    span.textContent = label;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mini-btn sec";
    btn.textContent = listeningAction === action ? "Nhấn phím..." : formatKeyLabel(settings.keybinds[action]);
    btn.addEventListener("click", () => {
      listeningAction = action;
      renderKeybinds();
    });
    row.append(span, btn);
    keybindsGrid.appendChild(row);
  }
  checkDuplicateKeybinds();
  updateControlsBox();
}

resetKeysBtn.addEventListener("click", () => {
  settings.keybinds = { ...DEFAULT_KEYBINDS };
  listeningAction = null;
  saveSettings(settings);
  renderKeybinds();
});

renderKeybinds();

// Local leaderboard client (uses /api/leaderboard with localStorage fallback)
const LB_LOCAL_KEY = "dao-den-long-leaderboard-local";

async function fetchLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    const ctype = res.headers.get("content-type") || "";
    if (res.ok && ctype.includes("application/json")) return await res.json();
  } catch {
    // Fallback to localStorage when static server has no API
  }
  try {
    return JSON.parse(localStorage.getItem(LB_LOCAL_KEY) || '{"entries":[]}');
  } catch {
    return { entries: [] };
  }
}

async function submitLeaderboardScore(entry) {
  let apiUnavailable = false;
  try {
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    });
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("application/json")) {
      apiUnavailable = true;
    } else {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu điểm");
      return data;
    }
  } catch (err) {
    if (err instanceof TypeError || err.name === "SyntaxError") {
      apiUnavailable = true;
    } else {
      throw err;
    }
  }

  if (apiUnavailable) {
    const clean = (entry.name || "").trim();
    if (!/^[\p{L}0-9_]{3,12}$/u.test(clean)) {
      throw new Error("Tên phải dài 3–12 ký tự ([A-Za-z0-9_] hoặc chữ có dấu, không khoảng trắng)");
    }
    const cur = await fetchLeaderboard();
    const record = { ...entry, name: clean, achieved_at: entry.achieved_at || new Date().toISOString() };
    const next = [...cur.entries, record]
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : new Date(a.achieved_at) - new Date(b.achieved_at)))
      .slice(0, 10);
    localStorage.setItem(LB_LOCAL_KEY, JSON.stringify({ entries: next }));
    return { entries: next };
  }
}

async function renderLeaderboardTable() {
  leaderboardBox.innerHTML = "Đang tải bảng xếp hạng...";
  const data = await fetchLeaderboard();
  if (!data.entries || data.entries.length === 0) {
    leaderboardBox.innerHTML = "Chưa có thành tích nào được lưu.";
    return;
  }
  const rows = data.entries
    .map(
      (e, idx) =>
        `<tr><td>#${idx + 1}</td><td>${e.name}</td><td>${e.score}</td><td>${e.nights_won}/3</td><td>${e.seed}</td></tr>`
    )
    .join("");
  leaderboardBox.innerHTML = `<table class="lb-table"><thead><tr><th>Hạng</th><th>Tên</th><th>Điểm</th><th>Đêm thắng</th><th>Seed</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// Screen & Campaign state
let screenMode = "menu";
let settingsReturnTo = "menu";
let currentNight = 1;
let nightsWon = 0;
let campaignScore = 0;
let currentSeed = 2026;
let sim = createSimulation({ seed: currentSeed, night: 1, creativeVariants: true });
let menuDemoSim = createSimulation({
  seed: 2026,
  night: 1,
  creativeVariants: true,
  scenario: {
    lanterns: [
      { id: "L1", lit: true, fuel: 100 },
      { id: "L3", lit: true, fuel: 100 }
    ]
  }
});
let camYawDeg = 0;
let camPitchDeg = 34;
let camBlendTicks = 0;
let isDragging = false;
let dragMoved = false;
let lastMouseX = 0;
let lastMouseY = 0;
let slashQueued = false;
let accumulator = 0;
let lastTime = performance.now();
let lastCountdownSec = -1;
let windWarnSounded = false;
let scoreSavedForRun = false;
let lastSpawnedShadeId = null;
let shadeAlertTicks = 0;

// Đăng dialogue state
dangPortrait.innerHTML = DANG_PORTRAIT_SVG;
let dialogueSteps = [];
let dialogueIdx = 0;
let dialogueTypedChars = 0;
let dialogueTypeTimer = null;

// Dawn cinematic state
let dawnTimer = 0;
const DAWN_DURATION_S = 4.2;
let dawnNightScore = 0;

function showOverlay({
  title,
  desc,
  stats = "",
  primaryText = "",
  secondaryText = "",
  menuLive = false,
  showLbBtn = false,
  showMenu = false,
  showControls = false,
  showDialogue = false,
  showSettings = false,
  showLeaderboard = false,
  showScoreSubmit = false
}) {
  hudEl.classList.add("hidden");
  hudBottomEl.classList.add("hidden");
  captionsEl.classList.add("hidden");
  promptEl.classList.add("hidden");
  arrowEl.classList.add("hidden");
  shadeArrowEl.classList.add("hidden");
  skipDawnBtn.classList.add("hidden");
  overlayEl.classList.remove("hidden");
  overlayEl.classList.toggle("menu-live", menuLive);

  overlayTitle.textContent = title;
  overlayDesc.innerHTML = desc;
  overlayDesc.classList.toggle("hidden", !desc);
  controlsBox.classList.toggle("hidden", !showControls);
  dialogueBox.classList.toggle("hidden", !showDialogue);
  settingsBox.classList.toggle("hidden", !showSettings);
  leaderboardBox.classList.toggle("hidden", !showLeaderboard);
  scoreSubmitBox.classList.toggle("hidden", !showScoreSubmit);

  if (stats) {
    overlayStats.textContent = stats;
    overlayStats.classList.remove("hidden");
  } else {
    overlayStats.classList.add("hidden");
  }

  primaryBtn.textContent = primaryText;
  primaryBtn.classList.toggle("hidden", !primaryText);
  secondaryBtn.textContent = secondaryText;
  secondaryBtn.classList.toggle("hidden", !secondaryText);
  lbBtn.classList.toggle("hidden", !showLbBtn);
  menuBtn.classList.toggle("hidden", !showMenu);
  devNightBar.classList.toggle("hidden", screenMode !== "menu" && screenMode !== "paused");
}

function stopTypewriter() {
  if (dialogueTypeTimer) {
    clearInterval(dialogueTypeTimer);
    dialogueTypeTimer = null;
  }
}

function renderDialogueStep() {
  stopTypewriter();
  const fullText = dialogueSteps[dialogueIdx] || "";
  dialogueDots.innerHTML = dialogueSteps
    .map((_, idx) => `<span class="dialogue-dot ${idx === dialogueIdx ? "active" : ""}"></span>`)
    .join("");
  dialogueNextBtn.textContent = dialogueIdx >= dialogueSteps.length - 1 ? "Bắt đầu Đêm!" : "Tiếp theo";

  if (settings.reducedMotion) {
    dialogueTypedChars = fullText.length;
    dialogueText.textContent = fullText;
    return;
  }

  dialogueTypedChars = 0;
  dialogueText.textContent = "";
  dialogueTypeTimer = setInterval(() => {
    dialogueTypedChars = Math.min(fullText.length, dialogueTypedChars + 2);
    dialogueText.textContent = fullText.slice(0, dialogueTypedChars);
    if (dialogueTypedChars >= fullText.length) stopTypewriter();
  }, 18);
}

function advanceDialogue() {
  const fullText = dialogueSteps[dialogueIdx] || "";
  if (dialogueTypedChars < fullText.length) {
    stopTypewriter();
    dialogueTypedChars = fullText.length;
    dialogueText.textContent = fullText;
    return;
  }
  if (dialogueIdx < dialogueSteps.length - 1) {
    dialogueIdx++;
    renderDialogueStep();
  } else {
    startNight(currentNight);
  }
}

function openMainMenu() {
  stopTypewriter();
  screenMode = "menu";
  settingsReturnTo = "menu";
  currentNight = 1;
  nightsWon = 0;
  campaignScore = 0;
  menuDemoSim = createSimulation({
    seed: 2026,
    night: 1,
    creativeVariants: true,
    scenario: {
      lanterns: [
        { id: "L1", lit: true, fuel: 100 },
        { id: "L3", lit: true, fuel: 100 }
      ]
    }
  });
  showOverlay({
    title: "Đảo Đèn Lồng",
    desc: "Hành trình qua <strong>3 Đêm</strong>: Đảo Bến, Đảo Cau và Đảo Chuông. Giữ tối thiểu 60% Đèn Lồng Lớn sáng tới bình minh!",
    primaryText: "Bắt đầu hành trình",
    secondaryText: "Cài đặt",
    menuLive: true,
    showLbBtn: true,
    showControls: true
  });
}

function getEffectiveDuration(night, defaultDurationS) {
  if (!devFastToggle.checked) return defaultDurationS;
  return night === 1 ? 90 : night === 2 ? 120 : 150;
}

function openNightIntro(night) {
  currentNight = night;
  screenMode = "intro";
  const map = getNightMap(night);
  const reqLit = Math.ceil(TUNING.win_ratio * map.lanterns.length);
  const durS = getEffectiveDuration(night, map.durationS);
  sim = createSimulation({ seed: 2026 + night, night, creativeVariants: true });
  dialogueSteps = buildDangDialogueSteps(night, settings.keybinds, durS);
  dialogueIdx = 0;
  showOverlay({
    title: map.name,
    desc: "",
    stats: `Mục tiêu: Giữ tối thiểu ${reqLit}/${map.lanterns.length} đèn sáng · Thời gian: ${Math.floor(durS / 60)}m ${durS % 60}s`,
    menuLive: true,
    showDialogue: true,
    showMenu: true
  });
  renderDialogueStep();
}

function startNight(night) {
  stopTypewriter();
  audio.unlock();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  keys.clear();
  isDragging = false;
  currentNight = night;
  currentSeed = (Date.now() + night * 97) & 0xfffffff;
  const map = getNightMap(night);
  const scenario = devFastToggle.checked ? { time_left_s: getEffectiveDuration(night, map.durationS) } : null;
  sim = createSimulation({ seed: currentSeed, night, scenario, creativeVariants: true });
  camYawDeg = 0;
  camBlendTicks = settings.reducedMotion ? 0 : 48;
  accumulator = 0;
  lastCountdownSec = -1;
  windWarnSounded = false;
  scoreSavedForRun = false;
  lastSpawnedShadeId = null;
  shadeAlertTicks = 0;
  lastTime = performance.now();
  screenMode = "playing";
  overlayEl.classList.add("hidden");
  hudEl.classList.remove("hidden");
  hudBottomEl.classList.remove("hidden");
}

function togglePause() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  keys.clear();
  isDragging = false;
  if (screenMode === "playing") {
    sim.step({ ...buildInputFrame(), pause: true });
    sim.step({ ...buildInputFrame(), pause: false });
    screenMode = "paused";
    renderKeybinds();
    showOverlay({
      title: "Tạm dừng",
      desc: "Mọi bộ đếm và thực thể đều đang đứng yên.",
      primaryText: "Tiếp tục",
      secondaryText: "Chơi lại Đêm",
      showMenu: true,
      showSettings: true
    });
  } else if (screenMode === "paused") {
    sim.step({ ...buildInputFrame(), pause: true });
    accumulator = 0;
    lastTime = performance.now();
    screenMode = "playing";
    overlayEl.classList.add("hidden");
    hudEl.classList.remove("hidden");
    hudBottomEl.classList.remove("hidden");
  }
}

saveScoreBtn.addEventListener("click", async () => {
  if (scoreSavedForRun) return;
  try {
    const simState = sim.getRenderState();
    const totalScore = campaignScore + (simState.state === "lost" ? simState.score : 0);
    saveScoreMsg.textContent = "Đang lưu...";
    await submitLeaderboardScore({
      name: playerNameInput.value,
      score: totalScore,
      nights_won: nightsWon,
      seed: currentSeed
    });
    scoreSavedForRun = true;
    saveScoreMsg.textContent = `Đã lưu thành tích (${totalScore} điểm) vào bảng xếp hạng!`;
  } catch (err) {
    saveScoreMsg.textContent = err.message;
  }
});

playerNameInput.addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Enter") saveScoreBtn.click();
});

primaryBtn.addEventListener("click", () => {
  audio.unlock();
  if (screenMode === "menu") openNightIntro(1);
  else if (screenMode === "intro") startNight(currentNight);
  else if (screenMode === "paused") togglePause();
  else if (screenMode === "settings" || screenMode === "leaderboard") {
    if (settingsReturnTo === "menu") openMainMenu();
    else togglePause();
  } else if (screenMode === "result") {
    if (sim.getRenderState().state === "won" && currentNight < 3) {
      openNightIntro(currentNight + 1);
    } else {
      startNight(currentNight);
    }
  } else if (screenMode === "dawn") {
    openMainMenu();
  }
});

secondaryBtn.addEventListener("click", () => {
  if (screenMode === "menu") {
    settingsReturnTo = "menu";
    screenMode = "settings";
    renderKeybinds();
    showOverlay({
      title: "Cài đặt & Tiếp cận",
      desc: "Tùy chỉnh âm thanh, điều khiển, hiển thị và bảng màu (tự động lưu).",
      primaryText: "Quay lại",
      showSettings: true
    });
  } else if (screenMode === "paused") {
    startNight(currentNight);
  }
});

lbBtn.addEventListener("click", () => {
  settingsReturnTo = "menu";
  screenMode = "leaderboard";
  showOverlay({
    title: "Bảng xếp hạng Top 10",
    desc: "Thành tích cao nhất được lưu cục bộ trên máy.",
    primaryText: "Quay lại",
    showLeaderboard: true
  });
  renderLeaderboardTable();
});

menuBtn.addEventListener("click", openMainMenu);
devN1Btn.addEventListener("click", () => openNightIntro(1));
devN2Btn.addEventListener("click", () => openNightIntro(2));
devN3Btn.addEventListener("click", () => openNightIntro(3));
dialogueNextBtn.addEventListener("click", advanceDialogue);
dialogueSkipBtn.addEventListener("click", () => startNight(currentNight));
skipDawnBtn.addEventListener("click", finishDawnCinematic);

window.addEventListener("keydown", (e) => {
  if (listeningAction) {
    e.preventDefault();
    settings.keybinds[listeningAction] = e.code;
    listeningAction = null;
    saveSettings(settings);
    renderKeybinds();
    return;
  }
  if (screenMode === "intro" && (e.code === "Space" || e.code === "Enter")) {
    if (!e.repeat) {
      e.preventDefault();
      advanceDialogue();
    }
    return;
  }
  if (screenMode === "dawnCinematic" && (e.code === "Space" || e.code === "Enter" || e.code === "Escape")) {
    if (!e.repeat) {
      e.preventDefault();
      finishDawnCinematic();
    }
    return;
  }
  if (e.code === settings.keybinds.pause || e.code === "KeyP") {
    if (!e.repeat && (screenMode === "playing" || screenMode === "paused")) {
      e.preventDefault();
      togglePause();
    }
    return;
  }
  if (screenMode === "playing" && (e.code === settings.keybinds.jump || e.code.startsWith("Arrow"))) {
    e.preventDefault();
  }
  keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  isDragging = true;
  dragMoved = false;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

window.addEventListener("mouseup", (e) => {
  if (isDragging && !dragMoved && e.button === 0 && screenMode === "playing") {
    slashQueued = true;
  }
  isDragging = false;
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging || screenMode !== "playing") return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  if (Math.hypot(dx, dy) > 4) dragMoved = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  camYawDeg -= dx * settings.sensitivity;
  camPitchDeg = Math.min(82, Math.max(18, camPitchDeg + dy * settings.sensitivity * 0.8));
});

canvas.addEventListener(
  "wheel",
  (e) => {
    if (screenMode !== "playing") return;
    camPitchDeg = Math.min(82, Math.max(18, camPitchDeg + e.deltaY * 0.04));
  },
  { passive: true }
);

function buildInputFrame() {
  const kb = settings.keybinds;
  let mx = 0;
  let mz = 0;
  if (keys.has(kb.moveUp) || keys.has("ArrowUp")) mz += 1;
  if (keys.has(kb.moveDown) || keys.has("ArrowDown")) mz -= 1;
  if (keys.has(kb.moveLeft) || keys.has("ArrowLeft")) mx += 1;
  if (keys.has(kb.moveRight) || keys.has("ArrowRight")) mx -= 1;
  if (keys.has("KeyQ")) camYawDeg += 1.8;
  if (keys.has("KeyC")) camYawDeg -= 1.8;

  const slashEdge = slashQueued || keys.has(kb.slash) || keys.has("KeyX");
  slashQueued = false;

  return {
    move: [mx, mz],
    cam_yaw_deg: camYawDeg,
    jump: keys.has(kb.jump),
    dash: keys.has(kb.dash) || keys.has("ShiftRight"),
    interact: keys.has(kb.interact),
    pulse: keys.has(kb.pulse),
    slash: slashEdge,
    pause: false
  };
}

function formatMMSS(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

function updateHud(state, syncRes) {
  const litCount = state.lanterns.filter((l) => l.lit).length;
  const reqLit = Math.ceil(TUNING.win_ratio * state.lanterns.length);
  hudFlames.textContent = `${state.player.flames} / ${TUNING.flames}`;
  hudHpFill.style.width = `${Math.max(0, Math.min(100, (state.player.flames / TUNING.flames) * 100))}%`;
  hudNightLabel.textContent = state.map.name;
  hudLanterns.textContent = `${litCount} / ${state.lanterns.length} (cần ${reqLit})`;
  hudScore.textContent = String(campaignScore + state.score);
  hudCarried.textContent = String(state.player.carried);
  hudCap.textContent = String(state.player.capacity);

  const secCeil = Math.ceil(state.timeLeftS);
  const isDanger = secCeil <= 30;
  hudTime.textContent = `${isDanger && settings.colorblind ? "⚠ " : ""}${formatMMSS(secCeil)}`;
  hudTime.classList.toggle("danger", isDanger);
  if (secCeil <= 10 && secCeil > 0 && secCeil !== lastCountdownSec) {
    lastCountdownSec = secCeil;
    audio.countdown();
  }

  if (state.player.charmTicks > 0) {
    hudCharm.classList.remove("hidden");
    hudCharmVal.textContent = `${(state.player.charmTicks / 60).toFixed(1)}s`;
  } else {
    hudCharm.classList.add("hidden");
  }

  if (state.wind.active) {
    hudWind.textContent = `Gió mạnh (${state.wind.dirDeg}°)`;
    hudWind.classList.remove("hidden");
  } else if (state.wind.warning) {
    hudWind.textContent = "⚠ Sắp có gió mạnh!";
    hudWind.classList.remove("hidden");
    if (!windWarnSounded) {
      windWarnSounded = true;
      audio.windWarn();
    }
  } else {
    windWarnSounded = false;
    hudWind.classList.add("hidden");
  }

  const slots = moteSlotsEl.children;
  for (let i = 0; i < slots.length; i++) {
    slots[i].classList.toggle("hidden", i >= state.player.capacity);
    slots[i].classList.toggle("filled", i < state.player.carried);
  }

  hudDash.textContent =
    state.player.charmTicks > 0
      ? "Không hồi chiêu"
      : state.player.dashCooldownTicks > 0
        ? `${(state.player.dashCooldownTicks / 60).toFixed(1)}s`
        : "Sẵn sàng";

  hudPulse.textContent =
    state.player.pulseCooldownTicks > 0
      ? `${(state.player.pulseCooldownTicks / 60).toFixed(1)}s`
      : state.player.carried < TUNING.pulse_cost
        ? "Thiếu đom đóm"
        : "Sẵn sàng";

  let hint = "";
  for (const l of state.lanterns) {
    if (distXZ(state.player.pos, l.pos) <= TUNING.interact_radius) {
      if (!l.lit) {
        const cost = l.ever_lit ? TUNING.relight_cost : TUNING.lantern_cost;
        hint = `${settings.keybinds.interact} — Thắp đèn (${l.deposited}/${cost})`;
        break;
      } else if (l.fuel < TUNING.fuel_max) {
        hint = `${settings.keybinds.interact} — Châm dầu (${Math.round(l.fuel)}/${TUNING.fuel_max})`;
        break;
      }
    }
  }
  if (!hint && state.lanterns.some((l) => l.lit && l.fuel >= TUNING.low_fuel_threshold && distXZ(state.player.pos, l.pos) <= TUNING.safe_radius)) {
    hint = "Vùng sáng an toàn";
  }
  promptEl.textContent = hint;
  promptEl.classList.toggle("hidden", !hint);

  // Accessibility Visual Captions
  const captionMsgs = [];
  if (shadeAlertTicks > 0) captionMsgs.push("⚠ Bóng Mực xuất hiện!");
  if (state.wind.warning) captionMsgs.push("⚠ Gió sắp thổi mạnh!");
  if (secCeil <= 10 && secCeil > 0) captionMsgs.push(`⚠ Còn ${secCeil}s tới bình minh!`);
  const lowLanterns = state.lanterns.filter((l) => l.lit && l.fuel < TUNING.low_fuel_threshold).map((l) => l.id);
  if (lowLanterns.length > 0) captionMsgs.push(`⚠ Đèn sắp cạn dầu: ${lowLanterns.join(", ")}`);
  captionsEl.textContent = captionMsgs.join("  ·  ");
  captionsEl.classList.toggle("hidden", captionMsgs.length === 0);

  if (syncRes.arrow) {
    const r = 40;
    const rad = (syncRes.arrow.angleDeg * Math.PI) / 180;
    arrowEl.style.left = `${50 + Math.cos(rad) * r}%`;
    arrowEl.style.top = `${50 + Math.sin(rad) * r}%`;
    arrowLabel.textContent = syncRes.arrow.id;
    arrowEl.classList.remove("hidden");
  } else {
    arrowEl.classList.add("hidden");
  }

  let shadeArrow = null;
  if (shadeAlertTicks > 0 && lastSpawnedShadeId) {
    const spawned = state.shades.find((s) => s.id === lastSpawnedShadeId);
    if (spawned) shadeArrow = syncRes.projectEdgeArrow(spawned.pos, spawned.id);
  }
  if (shadeArrow) {
    const r = 42;
    const rad = (shadeArrow.angleDeg * Math.PI) / 180;
    shadeArrowEl.style.left = `${50 + Math.cos(rad) * r}%`;
    shadeArrowEl.style.top = `${50 + Math.sin(rad) * r}%`;
    shadeArrowLabel.textContent = shadeArrow.id;
    shadeArrowEl.classList.remove("hidden");
  } else {
    shadeArrowEl.classList.add("hidden");
  }
}

function finishDawnCinematic() {
  if (screenMode !== "dawnCinematic") return;
  skipDawnBtn.classList.add("hidden");
  const state = sim.getRenderState();
  if (currentNight === 3) {
    screenMode = "dawn";
    showOverlay({
      title: "Bình Minh Đã Ló Dạng!",
      desc: "Chúc mừng Mây đã thắp sáng cả ba hòn đảo và xua tan sương đen!",
      stats: `Tổng điểm toàn hành trình (3 Đêm): ${campaignScore}`,
      primaryText: "Chơi lại từ đầu",
      showScoreSubmit: true
    });
  } else {
    screenMode = "result";
    showOverlay({
      title: `Hoàn thành ${state.map.name}!`,
      desc: "Ánh sáng bình minh đã lan tỏa khắp đảo.",
      stats: `Điểm Đêm ${currentNight}: ${dawnNightScore} · Tổng điểm: ${campaignScore}`,
      primaryText: `Tiếp tục Đêm ${currentNight + 1}`,
      showMenu: true
    });
  }
}

function handleEvents(events, state) {
  for (const ev of events) {
    if (ev.name === "mote_picked" || ev.name === "charm_picked") audio.pickup();
    else if (ev.name === "lantern_lit" || ev.name === "deposit" || ev.name === "refuel") audio.lantern();
    else if (ev.name === "pulse") {
      world.triggerPulseEffect();
      audio.pulse();
    } else if (ev.name === "creative_slash") {
      world.triggerSlashEffect();
      audio.slash();
    } else if (ev.name === "player_hit") audio.hit();
    else if (ev.name === "dash") audio.dash();
    else if (ev.name === "shade_spawned") {
      audio.shadeSpawn();
      lastSpawnedShadeId = ev.data.id;
      shadeAlertTicks = 180;
    } else if (ev.name === "game_over") {
      saveScoreMsg.textContent = "";
      playerNameInput.value = "";
      if (ev.data.result === "won") {
        audio.win();
        nightsWon += 1;
        dawnNightScore = state.score;
        campaignScore += state.score;
        dawnTimer = 0;
        screenMode = "dawnCinematic";
        hudEl.classList.add("hidden");
        hudBottomEl.classList.add("hidden");
        captionsEl.classList.add("hidden");
        promptEl.classList.add("hidden");
        arrowEl.classList.add("hidden");
        shadeArrowEl.classList.add("hidden");
        overlayEl.classList.add("hidden");
        skipDawnBtn.classList.remove("hidden");
      } else {
        audio.lose();
        screenMode = "result";
        showOverlay({
          title: "Sương Đen Đã Nuốt Đảo...",
          desc: ev.data.reason === "dawn" ? "Đã hết thời gian nhưng số đèn sáng chưa đủ ngưỡng." : "Mây đã mất hết Ngọn Lửa.",
          stats: `Điểm Đêm ${currentNight}: ${state.score} · Tổng điểm giữ nguyên: ${campaignScore}`,
          primaryText: `Chơi lại Đêm ${currentNight}`,
          showMenu: true,
          showScoreSubmit: true
        });
      }
    }
  }
}

// Benchmark mode (?bench=1&seed=42&duration=30)
const urlParams = new URLSearchParams(window.location.search);
const isBenchMode = urlParams.get("bench") === "1";

if (isBenchMode) {
  const benchSeed = Number(urlParams.get("seed")) || 42;
  const benchDuration = Number(urlParams.get("duration")) || 30;
  const benchSim = createSimulation({ seed: benchSeed, night: 1, creativeVariants: false, benchmarkMode: true });

  overlayEl.classList.add("hidden");
  hudEl.classList.add("hidden");
  hudBottomEl.classList.add("hidden");

  let firstFrameTime = null;
  let measureStart = null;
  let prevFrameTime = null;
  const dts = [];

  function benchLoop(now) {
    if (firstFrameTime === null) firstFrameTime = now;
    const sinceFirstS = (now - firstFrameTime) / 1000;

    benchSim.step(null);
    const angleRad = (sinceFirstS / 15) * Math.PI * 2;
    const syncRes = world.syncEntities(benchSim.getRenderState(), sinceFirstS, 0, 34, false, { angleRad });

    if (sinceFirstS >= 3.0) {
      if (measureStart === null) {
        measureStart = now;
        prevFrameTime = now;
      } else {
        dts.push(now - prevFrameTime);
        prevFrameTime = now;
      }

      if ((now - measureStart) / 1000 >= benchDuration) {
        const n = dts.length;
        const sumDt = dts.reduce((a, b) => a + b, 0);
        const sorted = [...dts].sort((a, b) => a - b);
        const k = Math.max(1, Math.ceil(0.01 * n));
        const topK = sorted.slice(n - k);
        const avgTopK = topK.reduce((a, b) => a + b, 0) / topK.length;
        const p95 = sorted[Math.min(n - 1, Math.floor(0.95 * (n - 1)))];
        const peakMemMb =
          performance.memory && performance.memory.usedJSHeapSize
            ? Math.round((performance.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10
            : null;

        window.__BENCH_RESULT__ = {
          avg_fps: Math.round(((1000 * n) / sumDt) * 10) / 10,
          p1_low_fps: Math.round((1000 / avgTopK) * 10) / 10,
          frame_ms_p95: Math.round(p95 * 10) / 10,
          frames: n,
          load_ms: Math.round(firstFrameTime),
          peak_mem_mb: peakMemMb,
          renderer: syncRes.getRendererInfo()
        };
        return;
      }
    }

    requestAnimationFrame(benchLoop);
  }

  requestAnimationFrame(benchLoop);
} else {
  function frameLoop(now) {
    const elapsed = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    const isMenuVista = screenMode === "menu" || screenMode === "settings" || screenMode === "leaderboard";
    if (isMenuVista && settingsReturnTo === "menu") {
      menuDemoSim.step(null);
      const demoState = menuDemoSim.getRenderState();
      world.syncEntities(demoState, now / 1000, camYawDeg, camPitchDeg, settings.colorblind, {
        mode: "menuOrbit",
        reducedMotion: settings.reducedMotion
      });
    } else if (screenMode === "intro") {
      world.syncEntities(sim.getRenderState(), now / 1000, camYawDeg, camPitchDeg, settings.colorblind, {
        mode: "menuOrbit",
        reducedMotion: settings.reducedMotion
      });
    } else if (screenMode === "dawnCinematic") {
      dawnTimer += elapsed;
      const progress = Math.min(1, dawnTimer / DAWN_DURATION_S);
      world.syncEntities(sim.getRenderState(), now / 1000, camYawDeg, camPitchDeg, settings.colorblind, {
        mode: "dawnCinematic",
        progress,
        reducedMotion: settings.reducedMotion
      });
      if (progress >= 1) finishDawnCinematic();
    } else {
      if (screenMode === "playing") {
        accumulator += elapsed;
        while (accumulator >= DT) {
          if (shadeAlertTicks > 0) shadeAlertTicks--;
          if (camBlendTicks > 0) camBlendTicks--;
          const frame = buildInputFrame();
          if (frame.jump && sim.getRenderState().player.grounded) audio.jump();
          const events = sim.step(frame);
          accumulator -= DT;
          handleEvents(events, sim.getRenderState());
          if (screenMode !== "playing") break;
        }
      }
      const renderState = sim.getRenderState();
      const blendAlpha = camBlendTicks > 0 ? 0.08 : 1;
      const syncRes = world.syncEntities(renderState, now / 1000, camYawDeg, camPitchDeg, settings.colorblind, {
        mode: "play",
        blendAlpha,
        reducedMotion: settings.reducedMotion
      });
      if (screenMode === "playing") updateHud(renderState, syncRes);
    }

    requestAnimationFrame(frameLoop);
  }

  openMainMenu();
  requestAnimationFrame(frameLoop);
}

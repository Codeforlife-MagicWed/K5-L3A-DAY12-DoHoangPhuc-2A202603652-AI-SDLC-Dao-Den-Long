import { DT, TUNING, distXZ } from "../sim/config.js";
import { getNightMap } from "../sim/maps.js";
import { createSimulation } from "../sim/simulation.js";
import { createAudioEngine } from "./audio.js";
import { createWorldRenderer } from "./scene.js";
import { loadSettings, saveSettings } from "./settings.js";

const canvas = document.getElementById("game-canvas");
const hudEl = document.getElementById("hud");
const hudBottomEl = document.getElementById("hud-bottom");
const promptEl = document.getElementById("prompt");
const arrowEl = document.getElementById("lantern-arrow");
const arrowLabel = document.getElementById("arrow-label");
const overlayEl = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const controlsBox = document.getElementById("controls-box");
const settingsBox = document.getElementById("settings-box");
const overlayStats = document.getElementById("overlay-stats");
const primaryBtn = document.getElementById("primary-btn");
const secondaryBtn = document.getElementById("secondary-btn");
const menuBtn = document.getElementById("menu-btn");

const volSlider = document.getElementById("vol-slider");
const volVal = document.getElementById("vol-val");
const sensSlider = document.getElementById("sens-slider");
const sensVal = document.getElementById("sens-val");
const cbToggle = document.getElementById("cb-toggle");

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

volSlider.value = String(Math.round(settings.volume * 100));
volVal.textContent = `${volSlider.value}%`;
sensSlider.value = String(Math.round(settings.sensitivity * 100));
sensVal.textContent = settings.sensitivity.toFixed(2);
cbToggle.checked = settings.colorblind;
document.body.classList.toggle("colorblind", settings.colorblind);

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
  document.body.classList.toggle("colorblind", settings.colorblind);
  saveSettings(settings);
});

// UI Screen state: "menu" | "intro" | "playing" | "paused" | "settings" | "result" | "dawn"
let screenMode = "menu";
let settingsReturnTo = "menu";
let currentNight = 1;
let campaignScore = 0;
let sim = createSimulation({ seed: 2026, night: 1, creativeVariants: true });
let camYawDeg = 0;
let camPitchDeg = 34;
let isDragging = false;
let dragMoved = false;
let lastMouseX = 0;
let lastMouseY = 0;
let slashQueued = false;
let accumulator = 0;
let lastTime = performance.now();
let lastCountdownSec = -1;
let windWarnSounded = false;

function showOverlay({ title, desc, stats = "", primaryText, secondaryText = "", showMenu = false, showControls = false, showSettings = false }) {
  hudEl.classList.add("hidden");
  hudBottomEl.classList.add("hidden");
  promptEl.classList.add("hidden");
  arrowEl.classList.add("hidden");
  overlayEl.classList.remove("hidden");

  overlayTitle.textContent = title;
  overlayDesc.innerHTML = desc;
  controlsBox.classList.toggle("hidden", !showControls);
  settingsBox.classList.toggle("hidden", !showSettings);

  if (stats) {
    overlayStats.textContent = stats;
    overlayStats.classList.remove("hidden");
  } else {
    overlayStats.classList.add("hidden");
  }

  primaryBtn.textContent = primaryText;
  secondaryBtn.textContent = secondaryText;
  secondaryBtn.classList.toggle("hidden", !secondaryText);
  menuBtn.classList.toggle("hidden", !showMenu);
}

function openMainMenu() {
  screenMode = "menu";
  currentNight = 1;
  campaignScore = 0;
  sim = createSimulation({ seed: 2026, night: 1, creativeVariants: true });
  showOverlay({
    title: "Đảo Đèn Lồng",
    desc: "Hành trình qua <strong>3 Đêm</strong>: Đảo Bến, Đảo Cau và Đảo Chuông. Gom đom đóm, né Bóng Mực và Gió Lạc, thắp sáng mọi Đèn Lồng Lớn trước bình minh!",
    primaryText: "Bắt đầu hành trình",
    secondaryText: "Cài đặt",
    showControls: true
  });
}

function openNightIntro(night) {
  currentNight = night;
  screenMode = "intro";
  const map = getNightMap(night);
  const reqLit = Math.ceil(TUNING.win_ratio * map.lanterns.length);
  showOverlay({
    title: map.name,
    desc: map.introQuote,
    stats: `Mục tiêu: Giữ tối thiểu ${reqLit}/${map.lanterns.length} đèn sáng tới bình minh · Thời gian: ${Math.floor(map.durationS / 60)}m ${map.durationS % 60}s`,
    primaryText: `Vào ${map.name}`,
    showMenu: true
  });
}

function startNight(night) {
  audio.unlock();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  keys.clear();
  isDragging = false;
  currentNight = night;
  sim = createSimulation({ seed: (Date.now() + night * 97) & 0xfffffff, night, creativeVariants: true });
  camYawDeg = 0;
  accumulator = 0;
  lastCountdownSec = -1;
  windWarnSounded = false;
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

primaryBtn.addEventListener("click", () => {
  audio.unlock();
  if (screenMode === "menu") openNightIntro(1);
  else if (screenMode === "intro") startNight(currentNight);
  else if (screenMode === "paused") togglePause();
  else if (screenMode === "settings") {
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
    showOverlay({
      title: "Cài đặt",
      desc: "Tùy chỉnh âm lượng và độ nhạy xoay camera (tự động lưu).",
      primaryText: "Quay lại",
      showSettings: true
    });
  } else if (screenMode === "paused") {
    startNight(currentNight);
  }
});

menuBtn.addEventListener("click", openMainMenu);

window.addEventListener("keydown", (e) => {
  if (e.code === "Escape" || e.code === "KeyP") {
    if (!e.repeat && (screenMode === "playing" || screenMode === "paused")) {
      e.preventDefault();
      togglePause();
    }
    return;
  }
  if (screenMode === "playing" && (e.code === "Space" || e.code.startsWith("Arrow"))) {
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

canvas.addEventListener("wheel", (e) => {
  if (screenMode !== "playing") return;
  camPitchDeg = Math.min(82, Math.max(18, camPitchDeg + e.deltaY * 0.04));
}, { passive: true });

function buildInputFrame() {
  let mx = 0;
  let mz = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) mz += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) mz -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) mx += 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) mx -= 1;
  if (keys.has("KeyQ")) camYawDeg += 1.8;
  if (keys.has("KeyC")) camYawDeg -= 1.8;

  const slashEdge = slashQueued || keys.has("KeyJ") || keys.has("KeyX");
  slashQueued = false;

  return {
    move: [mx, mz],
    cam_yaw_deg: camYawDeg,
    jump: keys.has("Space"),
    dash: keys.has("ShiftLeft") || keys.has("ShiftRight"),
    interact: keys.has("KeyE"),
    pulse: keys.has("KeyF"),
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

function updateHud(state, arrowInfo) {
  const litCount = state.lanterns.filter((l) => l.lit).length;
  const reqLit = Math.ceil(TUNING.win_ratio * state.lanterns.length);
  hudFlames.textContent = `${state.player.flames} / ${TUNING.flames}`;
  const hpPct = Math.max(0, Math.min(100, (state.player.flames / TUNING.flames) * 100));
  hudHpFill.style.width = `${hpPct}%`;
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
    hudWind.textContent = "Sắp có gió mạnh!";
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
        hint = `E — Thắp đèn (${l.deposited}/${cost})`;
        break;
      } else if (l.fuel < TUNING.fuel_max) {
        hint = `E — Châm dầu (${Math.round(l.fuel)}/${TUNING.fuel_max})`;
        break;
      }
    }
  }
  if (!hint && state.lanterns.some((l) => l.lit && l.fuel >= TUNING.low_fuel_threshold && distXZ(state.player.pos, l.pos) <= TUNING.safe_radius)) {
    hint = "Vùng sáng an toàn";
  }
  promptEl.textContent = hint;
  promptEl.classList.toggle("hidden", !hint);

  if (arrowInfo) {
    const r = 40;
    const rad = (arrowInfo.angleDeg * Math.PI) / 180;
    arrowEl.style.left = `${50 + Math.cos(rad) * r}%`;
    arrowEl.style.top = `${50 + Math.sin(rad) * r}%`;
    arrowLabel.textContent = arrowInfo.id;
    arrowEl.classList.remove("hidden");
  } else {
    arrowEl.classList.add("hidden");
  }
}

function handleEvents(events, state) {
  for (const ev of events) {
    if (ev.name === "mote_picked" || ev.name === "charm_picked") audio.pickup();
    else if (ev.name === "lantern_lit" || ev.name === "deposit") audio.lantern();
    else if (ev.name === "pulse") {
      world.triggerPulseEffect();
      audio.pulse();
    } else if (ev.name === "creative_slash") {
      world.triggerSlashEffect();
      audio.slash();
    } else if (ev.name === "player_hit") audio.hit();
    else if (ev.name === "dash") audio.dash();
    else if (ev.name === "shade_spawned") audio.shadeSpawn();
    else if (ev.name === "game_over") {
      if (ev.data.result === "won") {
        audio.win();
        campaignScore += state.score;
        if (currentNight === 3) {
          screenMode = "dawn";
          showOverlay({
            title: "Bình Minh Đã Ló Dạng!",
            desc: "Chúc mừng Mây đã thắp sáng cả ba hòn đảo và xua tan sương đen!",
            stats: `Tổng điểm toàn hành trình (3 Đêm): ${campaignScore}`,
            primaryText: "Chơi lại từ đầu"
          });
        } else {
          screenMode = "result";
          showOverlay({
            title: `Hoàn thành ${state.map.name}!`,
            desc: "Ánh sáng đã lan tỏa khắp đảo.",
            stats: `Điểm Đêm ${currentNight}: ${state.score} · Tổng điểm: ${campaignScore}`,
            primaryText: `Tiếp tục Đêm ${currentNight + 1}`,
            showMenu: true
          });
        }
      } else {
        audio.lose();
        screenMode = "result";
        showOverlay({
          title: "Sương Đen Đã Nuốt Đảo...",
          desc: ev.data.reason === "dawn" ? "Đã hết thời gian trước khi thắp đủ đèn." : "Mây đã mất hết Ngọn Lửa.",
          stats: `Điểm Đêm ${currentNight}: ${state.score} · Tổng điểm giữ nguyên: ${campaignScore}`,
          primaryText: `Chơi lại Đêm ${currentNight}`,
          showMenu: true
        });
      }
    }
  }
}

function frameLoop(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (screenMode === "playing") {
    accumulator += elapsed;
    while (accumulator >= DT) {
      const frame = buildInputFrame();
      if (frame.jump && sim.getRenderState().player.grounded) audio.jump();
      const events = sim.step(frame);
      accumulator -= DT;
      handleEvents(events, sim.getRenderState());
      if (screenMode !== "playing") break;
    }
  }

  const renderState = sim.getRenderState();
  const { arrow } = world.syncEntities(renderState, now / 1000, camYawDeg, camPitchDeg, settings.colorblind);
  if (screenMode === "playing") updateHud(renderState, arrow);

  requestAnimationFrame(frameLoop);
}

openMainMenu();
requestAnimationFrame(frameLoop);

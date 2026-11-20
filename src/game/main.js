import { DT, TUNING, distXZ } from "../sim/config.js";
import { createSimulation } from "../sim/simulation.js";
import { createWorldRenderer } from "./scene.js";

const canvas = document.getElementById("game-canvas");
const hudEl = document.getElementById("hud");
const promptEl = document.getElementById("prompt");
const overlayEl = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const overlayStats = document.getElementById("overlay-stats");
const startBtn = document.getElementById("start-btn");

const hudFlames = document.getElementById("hud-flames");
const hudCarried = document.getElementById("hud-carried");
const hudLanterns = document.getElementById("hud-lanterns");
const hudTime = document.getElementById("hud-time");
const hudScore = document.getElementById("hud-score");
const hudPulse = document.getElementById("hud-pulse");

const world = createWorldRenderer(canvas);
const keys = new Set();

let sim = createSimulation({ seed: 2026, creativeVariants: true });
let running = false;
let camYawDeg = 0;
let isDragging = false;
let lastMouseX = 0;
let accumulator = 0;
let lastTime = performance.now();

function startNewRun() {
  sim = createSimulation({ seed: Date.now() & 0xfffffff, creativeVariants: true });
  running = true;
  accumulator = 0;
  lastTime = performance.now();
  hudEl.classList.remove("hidden");
  overlayEl.classList.add("hidden");
  overlayStats.classList.add("hidden");
}

startBtn.addEventListener("click", startNewRun);

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  lastMouseX = e.clientX;
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouseX;
  lastMouseX = e.clientX;
  camYawDeg -= dx * 0.35;
});

function buildInputFrame() {
  let mx = 0;
  let mz = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) mz += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) mz -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) mx += 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) mx -= 1;

  if (keys.has("KeyQ")) camYawDeg += 1.8;
  if (keys.has("KeyC")) camYawDeg -= 1.8;

  return {
    move: [mx, mz],
    cam_yaw_deg: camYawDeg,
    jump: keys.has("Space"),
    interact: keys.has("KeyE"),
    pulse: keys.has("KeyF")
  };
}

function updateHud(state) {
  const litCount = state.lanterns.filter((l) => l.lit).length;
  hudFlames.textContent = `${state.player.flames} / ${TUNING.flames}`;
  hudCarried.textContent = `${state.player.carried} / ${TUNING.carry_capacity}`;
  hudLanterns.textContent = `${litCount} / ${TUNING.lantern_count_night1}`;
  hudTime.textContent = `${Math.ceil(state.timeLeftS)}s`;
  hudScore.textContent = String(state.score);

  if (state.player.pulseCooldownTimer > 0) {
    hudPulse.textContent = `${state.player.pulseCooldownTimer.toFixed(1)}s`;
  } else if (state.player.carried < TUNING.pulse_cost) {
    hudPulse.textContent = "Thiếu ánh sáng";
  } else {
    hudPulse.textContent = "Sẵn sàng";
  }

  let hint = "";
  const inSafeZone = state.lanterns.some(
    (l) => l.lit && distXZ(state.player.pos, l.pos) <= TUNING.safe_radius
  );
  for (const l of state.lanterns) {
    if (!l.lit && distXZ(state.player.pos, l.pos) <= TUNING.interact_radius) {
      hint =
        state.player.carried > 0
          ? `Nhấn [E] nạp ánh sáng vào ${l.id} (${l.deposited}/${TUNING.lantern_cost})`
          : `Đèn ${l.id} (${l.deposited}/${TUNING.lantern_cost}) — Hãy thu thập thêm đom đóm`;
      break;
    }
  }
  if (!hint && inSafeZone) {
    hint = "Đang ở trong vùng sáng an toàn — Bóng Mực không thể tiến vào";
  }

  if (hint) {
    promptEl.textContent = hint;
    promptEl.classList.remove("hidden");
  } else {
    promptEl.classList.add("hidden");
  }
}

function showGameOver(state, reason) {
  running = false;
  promptEl.classList.add("hidden");
  overlayEl.classList.remove("hidden");
  overlayStats.classList.remove("hidden");

  const won = state.state === "won";
  overlayTitle.textContent = won ? "Đảo Bến Đã Sáng Rực!" : "Sương Đen Đã Nuốt Đảo...";
  overlayDesc.textContent = won
    ? "Mây đã thắp sáng toàn bộ 5 Đèn Lồng Lớn và đẩy lùi Bóng Mực!"
    : reason === "dawn"
      ? "Hết thời gian Đêm 1 trước khi kịp thắp hết 5 Đèn Lồng Lớn."
      : "Mây đã mất hết ngọn lửa trước Bóng Mực.";
  overlayStats.textContent = `Điểm cuối: ${state.score} · Thời gian còn: ${Math.ceil(state.timeLeftS)}s · Ngọn lửa còn: ${state.player.flames}`;
  startBtn.textContent = "Chơi lại";
}

function frameLoop(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (running) {
    accumulator += elapsed;
    while (accumulator >= DT) {
      const events = sim.step(buildInputFrame());
      accumulator -= DT;
      for (const ev of events) {
        if (ev.name === "pulse") world.triggerPulseEffect();
        if (ev.name === "game_over") {
          showGameOver(sim.getRenderState(), ev.data.reason);
          break;
        }
      }
      if (!running) break;
    }
  }

  const renderState = sim.getRenderState();
  world.syncEntities(renderState, now / 1000, camYawDeg);
  if (running) updateHud(renderState);

  requestAnimationFrame(frameLoop);
}

requestAnimationFrame(frameLoop);

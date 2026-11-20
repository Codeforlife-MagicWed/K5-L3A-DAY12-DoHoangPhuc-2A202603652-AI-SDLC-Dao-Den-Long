import {
  DT,
  FIREFLY_TYPES,
  ISLAND_RADIUS,
  TUNING,
  createDefaultLanterns,
  distXZ,
  round3
} from "./config.js";
import { createPRNG } from "./prng.js";
import { validateScenario } from "./validators.js";

const INITIAL_RANDOM_MOTES = 15;
const MAX_RANDOM_MOTES = 15;
const MOTE_RESPAWN_S = 3.0;
const INITIAL_RANDOM_SHADES = 2;
const MAX_RANDOM_SHADES = 5;
const SHADE_SPAWN_S = 25.0;
const JUMP_VELOCITY = 7.5;
const GRAVITY = 20.0;

function clampToIsland(pos) {
  const r = Math.hypot(pos[0], pos[2]);
  if (r > ISLAND_RADIUS) {
    const scale = ISLAND_RADIUS / r;
    pos[0] *= scale;
    pos[2] *= scale;
  }
}

function enforceSafeRadius(shade, lanterns, playerPos) {
  for (const lantern of lanterns) {
    if (!lantern.lit) continue;
    const dx = shade.pos[0] - lantern.pos[0];
    const dz = shade.pos[2] - lantern.pos[2];
    const d = Math.hypot(dx, dz);
    if (d < TUNING.safe_radius) {
      let nx = 1;
      let nz = 0;
      if (d > 1e-6) {
        nx = dx / d;
        nz = dz / d;
      } else {
        const px = playerPos[0] - lantern.pos[0];
        const pz = playerPos[2] - lantern.pos[2];
        const pd = Math.hypot(px, pz);
        if (pd > 1e-6) {
          nx = px / pd;
          nz = pz / pd;
        }
      }
      shade.pos[0] = lantern.pos[0] + nx * TUNING.safe_radius;
      shade.pos[2] = lantern.pos[2] + nz * TUNING.safe_radius;
    }
  }
}

function pickFireflyType(prng, creativeVariants) {
  if (!creativeVariants) return FIREFLY_TYPES.small;
  const roll = prng.next();
  if (roll < 0.55) return FIREFLY_TYPES.small;
  if (roll < 0.85) return FIREFLY_TYPES.medium;
  return FIREFLY_TYPES.large;
}

/**
 * Creates a deterministic 60Hz simulation instance conforming to Test Contract v1.0.
 */
export function createSimulation({ seed = 1, scenario = null, creativeVariants = false } = {}) {
  const parsedScenario = validateScenario(scenario);
  const prng = createPRNG(seed);

  const player = {
    pos: parsedScenario.player?.pos ? [...parsedScenario.player.pos] : [0, 0, 0],
    vy: 0,
    carried: parsedScenario.player?.carried ?? 0,
    flames: parsedScenario.player?.flames ?? TUNING.flames,
    invulnTimer: 0,
    pulseCooldownTimer: 0
  };

  const lanterns = createDefaultLanterns();
  if (parsedScenario.lanterns) {
    const byId = new Map(lanterns.map((l) => [l.id, l]));
    for (const patch of parsedScenario.lanterns) {
      const target = byId.get(patch.id);
      if (!target) continue;
      if (patch.pos !== undefined) target.pos = [...patch.pos];
      if (patch.deposited !== undefined) target.deposited = patch.deposited;
      if (patch.lit !== undefined) target.lit = patch.lit;
    }
  }

  const randomMotes = parsedScenario.random_motes !== false;
  const randomShades = parsedScenario.random_shades !== false;
  const initialTimeLeft = parsedScenario.time_left_s ?? TUNING.night1_duration_s;

  let nextMoteNum = 1;
  let nextShadeNum = 1;
  const motes = [];
  const shades = [];

  if (parsedScenario.motes !== undefined) {
    for (const item of parsedScenario.motes) {
      const pos = Array.isArray(item) ? [...item] : [...item.pos];
      const id = !Array.isArray(item) && item.id ? item.id : `M${nextMoteNum++}`;
      const sizeKey = !Array.isArray(item) && item.size && FIREFLY_TYPES[item.size] ? item.size : "small";
      const type = creativeVariants ? FIREFLY_TYPES[sizeKey] : FIREFLY_TYPES.small;
      motes.push({ id, pos, size: type.key, value: type.value });
    }
  } else if (randomMotes) {
    for (let i = 0; i < INITIAL_RANDOM_MOTES; i++) {
      const type = pickFireflyType(prng, creativeVariants);
      motes.push({
        id: `M${nextMoteNum++}`,
        pos: prng.pickIslandPoint(4, ISLAND_RADIUS - 4),
        size: type.key,
        value: type.value
      });
    }
  }

  if (parsedScenario.shades !== undefined) {
    for (const item of parsedScenario.shades) {
      const id = item.id ?? `S${nextShadeNum++}`;
      const numMatch = /^S(\d+)$/.exec(id);
      if (numMatch) {
        nextShadeNum = Math.max(nextShadeNum, Number(numMatch[1]) + 1);
      }
      const shade = { id, pos: [...item.pos], state: "chase", stunTimer: 0 };
      enforceSafeRadius(shade, lanterns, player.pos);
      shades.push(shade);
    }
  } else if (randomShades) {
    for (let i = 0; i < INITIAL_RANDOM_SHADES; i++) {
      const shade = {
        id: `S${nextShadeNum++}`,
        pos: prng.pickIslandPoint(18, ISLAND_RADIUS - 3),
        state: "chase",
        stunTimer: 0
      };
      shade.pos[1] = 1.0;
      enforceSafeRadius(shade, lanterns, player.pos);
      shades.push(shade);
    }
  }

  let simTick = 0;
  let state = "playing";
  let score = 0;
  let timeLeftS = initialTimeLeft;
  let moteSpawnTimer = MOTE_RESPAWN_S;
  let shadeSpawnTimer = SHADE_SPAWN_S;

  const heldInput = {
    move: [0, 0],
    cam_yaw_deg: 0,
    jump: false,
    interact: false,
    pulse: false,
    dash: false
  };

  function applyInputFrame(rawInput) {
    const prev = {
      jump: heldInput.jump,
      interact: heldInput.interact,
      pulse: heldInput.pulse,
      dash: heldInput.dash
    };
    if (rawInput) {
      if (rawInput.move !== undefined) heldInput.move = [...rawInput.move];
      if (rawInput.cam_yaw_deg !== undefined) heldInput.cam_yaw_deg = rawInput.cam_yaw_deg;
      if (rawInput.jump !== undefined) heldInput.jump = rawInput.jump;
      if (rawInput.interact !== undefined) heldInput.interact = rawInput.interact;
      if (rawInput.pulse !== undefined) heldInput.pulse = rawInput.pulse;
      if (rawInput.dash !== undefined) heldInput.dash = rawInput.dash;
    }
    return {
      jumpPressed: !prev.jump && heldInput.jump,
      interactPressed: !prev.interact && heldInput.interact,
      pulsePressed: !prev.pulse && heldInput.pulse
    };
  }

  function updatePlayerMovement(edges) {
    let [mx, mz] = heldInput.move;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const theta = (heldInput.cam_yaw_deg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const wx = mx * cosT + mz * sinT;
    const wz = -mx * sinT + mz * cosT;

    player.pos[0] += wx * TUNING.player_speed * DT;
    player.pos[2] += wz * TUNING.player_speed * DT;
    clampToIsland(player.pos);

    if (edges.jumpPressed && player.pos[1] <= 0) {
      player.vy = JUMP_VELOCITY;
    }
    if (player.pos[1] > 0 || player.vy > 0) {
      player.vy -= GRAVITY * DT;
      player.pos[1] += player.vy * DT;
      if (player.pos[1] <= 0) {
        player.pos[1] = 0;
        player.vy = 0;
      }
    }
  }

  function collectMotes(tick, events) {
    for (let i = motes.length - 1; i >= 0; i--) {
      if (player.carried >= TUNING.carry_capacity) break;
      const mote = motes[i];
      if (distXZ(player.pos, mote.pos) <= TUNING.pickup_radius) {
        const gain = Math.min(mote.value, TUNING.carry_capacity - player.carried);
        player.carried += gain;
        score += gain * TUNING.score.per_mote;
        motes.splice(i, 1);
        events.push({ type: "event", tick, name: "mote_picked", data: { carried: player.carried } });
      }
    }
  }

  function tryInteractLantern(tick, events) {
    if (player.carried <= 0) return;
    let bestLantern = null;
    let bestDist = Infinity;
    for (const lantern of lanterns) {
      if (lantern.lit) continue;
      const d = distXZ(player.pos, lantern.pos);
      if (d <= TUNING.interact_radius && d < bestDist - 1e-9) {
        bestDist = d;
        bestLantern = lantern;
      }
    }
    if (!bestLantern) return;

    const needed = Math.max(0, TUNING.lantern_cost - bestLantern.deposited);
    const amount = Math.min(player.carried, needed);
    if (amount <= 0) return;

    bestLantern.deposited += amount;
    player.carried -= amount;
    events.push({
      type: "event",
      tick,
      name: "deposit",
      data: { lantern_id: bestLantern.id, amount, deposited: bestLantern.deposited }
    });

    if (bestLantern.deposited >= TUNING.lantern_cost && !bestLantern.lit) {
      bestLantern.lit = true;
      score += TUNING.score.per_lantern;
      events.push({ type: "event", tick, name: "lantern_lit", data: { lantern_id: bestLantern.id } });
      for (const shade of shades) {
        enforceSafeRadius(shade, lanterns, player.pos);
      }
    }
  }

  function tryPulse(tick, events) {
    if (player.pulseCooldownTimer > 0 || player.carried < TUNING.pulse_cost) return;
    player.carried -= TUNING.pulse_cost;
    player.pulseCooldownTimer = TUNING.pulse_cooldown_s;

    const stunnedIds = [];
    for (const shade of shades) {
      const dx = shade.pos[0] - player.pos[0];
      const dz = shade.pos[2] - player.pos[2];
      const d = Math.hypot(dx, dz);
      if (d <= TUNING.pulse_radius) {
        const nx = d > 1e-6 ? dx / d : 1;
        const nz = d > 1e-6 ? dz / d : 0;
        shade.pos[0] += nx * TUNING.pulse_push_m;
        shade.pos[2] += nz * TUNING.pulse_push_m;
        clampToIsland(shade.pos);
        enforceSafeRadius(shade, lanterns, player.pos);
        shade.state = "stunned";
        shade.stunTimer = TUNING.pulse_stun_s;
        stunnedIds.push(shade.id);
        score += TUNING.score.per_stun;
      }
    }

    events.push({ type: "event", tick, name: "pulse", data: { stunned_ids: stunnedIds } });
  }

  function updateShades(tick, events) {
    for (const shade of shades) {
      if (shade.stunTimer > 0) {
        shade.stunTimer = Math.max(0, shade.stunTimer - DT);
        if (shade.stunTimer <= 0) shade.state = "chase";
        continue;
      }

      const dx = player.pos[0] - shade.pos[0];
      const dz = player.pos[2] - shade.pos[2];
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        const stepDist = Math.min(d, TUNING.shade_speed * DT);
        shade.pos[0] += (dx / d) * stepDist;
        shade.pos[2] += (dz / d) * stepDist;
      }

      enforceSafeRadius(shade, lanterns, player.pos);

      if (player.invulnTimer <= 0 && distXZ(player.pos, shade.pos) <= TUNING.shade_hit_radius) {
        player.flames = Math.max(0, player.flames - 1);
        const dropped = Math.floor(player.carried * TUNING.hit_drop_ratio);
        player.carried -= dropped;
        player.invulnTimer = TUNING.invuln_s;
        events.push({
          type: "event",
          tick,
          name: "player_hit",
          data: { by: "shade", flames: player.flames, dropped }
        });

        if (player.flames <= 0) {
          state = "lost";
          events.push({
            type: "event",
            tick,
            name: "game_over",
            data: { result: "lost", reason: "no_flames" }
          });
          return;
        }
      }
    }
  }

  function updateSpawners(tick, events) {
    if (randomMotes && motes.length < MAX_RANDOM_MOTES) {
      moteSpawnTimer -= DT;
      if (moteSpawnTimer <= 0) {
        moteSpawnTimer = MOTE_RESPAWN_S;
        const type = pickFireflyType(prng, creativeVariants);
        motes.push({
          id: `M${nextMoteNum++}`,
          pos: prng.pickIslandPoint(4, ISLAND_RADIUS - 4),
          size: type.key,
          value: type.value
        });
      }
    }

    if (randomShades && shades.length < MAX_RANDOM_SHADES) {
      shadeSpawnTimer -= DT;
      if (shadeSpawnTimer <= 0) {
        shadeSpawnTimer = SHADE_SPAWN_S;
        let pos = prng.pickIslandPoint(22, ISLAND_RADIUS - 3);
        for (let attempt = 0; attempt < 5; attempt++) {
          if (distXZ(pos, player.pos) >= 15) break;
          pos = prng.pickIslandPoint(22, ISLAND_RADIUS - 3);
        }
        pos[1] = 1.0;
        const id = `S${nextShadeNum++}`;
        const shade = { id, pos, state: "chase", stunTimer: 0 };
        enforceSafeRadius(shade, lanterns, player.pos);
        shades.push(shade);
        events.push({ type: "event", tick, name: "shade_spawned", data: { id } });
      }
    }
  }

  function step(rawInput = null) {
    if (state !== "playing") return [];

    simTick += 1;
    const tick = simTick;
    timeLeftS = Math.max(0, initialTimeLeft - simTick / 60);
    player.invulnTimer = Math.max(0, player.invulnTimer - DT);
    player.pulseCooldownTimer = Math.max(0, player.pulseCooldownTimer - DT);

    const events = [];
    const edges = applyInputFrame(rawInput);

    updatePlayerMovement(edges);
    collectMotes(tick, events);
    if (edges.interactPressed) tryInteractLantern(tick, events);

    if (lanterns.every((l) => l.lit)) {
      state = "won";
      score +=
        Math.floor(Math.max(0, timeLeftS)) * TUNING.score.per_second_left +
        player.flames * TUNING.score.per_flame_left;
      events.push({ type: "event", tick, name: "game_over", data: { result: "won", reason: "all_lit" } });
      return events;
    }

    if (edges.pulsePressed) tryPulse(tick, events);
    updateShades(tick, events);
    if (state !== "playing") return events;

    updateSpawners(tick, events);

    if (timeLeftS <= 0 && state === "playing") {
      timeLeftS = 0;
      state = "lost";
      events.push({ type: "event", tick, name: "game_over", data: { result: "lost", reason: "dawn" } });
    }

    return events;
  }

  function getSnapshot() {
    return {
      type: "snapshot",
      tick: simTick,
      sim_tick: simTick,
      state,
      time_left_s: round3(timeLeftS),
      score,
      player: {
        pos: player.pos.map(round3),
        flames: player.flames,
        carried: player.carried
      },
      lanterns: lanterns.map((l) => ({
        id: l.id,
        pos: l.pos.map(round3),
        lit: l.lit,
        deposited: l.deposited
      })),
      shades: shades.map((s) => ({
        id: s.id,
        pos: s.pos.map(round3),
        state: s.state
      })),
      motes: motes.map((m) => ({
        id: m.id,
        pos: m.pos.map(round3)
      })),
      motes_active: motes.length
    };
  }

  function getRenderState() {
    return {
      simTick,
      state,
      timeLeftS,
      score,
      player: {
        pos: [...player.pos],
        flames: player.flames,
        carried: player.carried,
        invulnTimer: player.invulnTimer,
        pulseCooldownTimer: player.pulseCooldownTimer
      },
      lanterns: lanterns.map((l) => ({ ...l, pos: [...l.pos] })),
      shades: shades.map((s) => ({ ...s, pos: [...s.pos] })),
      motes: motes.map((m) => ({ ...m, pos: [...m.pos] }))
    };
  }

  function getEndLine() {
    return {
      type: "end",
      ticks: simTick,
      state,
      score
    };
  }

  return { step, getSnapshot, getRenderState, getEndLine };
}

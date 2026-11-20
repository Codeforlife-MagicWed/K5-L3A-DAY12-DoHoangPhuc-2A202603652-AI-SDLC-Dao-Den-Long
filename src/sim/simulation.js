import {
  CONSTANTS,
  DT,
  FIREFLY_TYPES,
  TUNING,
  dist3D,
  distXZ,
  round1,
  round3
} from "./config.js";
import { getNightMap, isWithinPlayableXZ, resolvePlayerTerrain } from "./maps.js";
import { createPRNG } from "./prng.js";
import { validateScenario } from "./validators.js";

function pickFireflyType(prng, creativeVariants) {
  if (!creativeVariants) return FIREFLY_TYPES.small;
  const roll = prng.next();
  if (roll < 0.55) return FIREFLY_TYPES.small;
  if (roll < 0.85) return FIREFLY_TYPES.medium;
  return FIREFLY_TYPES.large;
}

function moveTowardXZ(pos, targetPos, maxStep) {
  const dx = targetPos[0] - pos[0];
  const dz = targetPos[2] - pos[2];
  const d = Math.hypot(dx, dz);
  if (d <= 1e-6) return;
  const step = Math.min(d, maxStep);
  pos[0] += (dx / d) * step;
  pos[2] += (dz / d) * step;
}

function isLanternSafe(lantern) {
  return lantern.lit && lantern.fuelUnits >= CONSTANTS.FUEL_LOW_UNITS;
}

function clampShadeOutsideSafeLanterns(shade, lanterns, playerPos) {
  for (const lantern of lanterns) {
    if (!isLanternSafe(lantern)) continue;
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

/**
 * Creates a deterministic 60Hz simulation instance conforming to Test Contract v1.2.
 */
export function createSimulation({ seed = 1, night = 1, scenario = null, creativeVariants = false } = {}) {
  const map = getNightMap(night);
  const parsedScenario = validateScenario(scenario);
  const prng = createPRNG(seed);

  let successfulLights = parsedScenario.player?.successful_lights ?? 0;

  const player = {
    pos: parsedScenario.player?.pos ? [...parsedScenario.player.pos] : [...map.spawnPos],
    vel: [0, 0, 0],
    grounded: true,
    facing: [0, 0, 1],
    carried: parsedScenario.player?.carried ?? 0,
    flames: parsedScenario.player?.flames ?? TUNING.flames,
    invulnTicks: parsedScenario.player?.invuln_ticks ?? 0,
    dashCooldownTicks: parsedScenario.player?.dash_cd_ticks ?? 0,
    dashTicksLeft: 0,
    dashDir: [0, 0, 1],
    pulseCooldownTicks: parsedScenario.player?.pulse_cd_ticks ?? 0,
    slashCooldownTicks: 0,
    charmTicks: parsedScenario.player?.charm_ticks ?? 0,
    launchLock: false,
    fallingTriggered: false,
    respawnWaitTicks: 0
  };

  const lanterns = map.lanterns.map((l) => ({
    ...l,
    pos: [...l.pos],
    fuelUnits: 0,
    ever_lit: false,
    relit_count: 0
  }));

  if (parsedScenario.lanterns) {
    const byId = new Map(lanterns.map((l) => [l.id, l]));
    for (const patch of parsedScenario.lanterns) {
      const target = byId.get(patch.id);
      if (!target) continue;
      if (patch.pos !== undefined) target.pos = [...patch.pos];
      if (patch.deposited !== undefined) target.deposited = patch.deposited;
      if (patch.lit !== undefined) target.lit = patch.lit;
      if (patch.ever_lit !== undefined) target.ever_lit = patch.ever_lit;
      if (target.lit) {
        target.ever_lit = true;
        target.fuelUnits = patch.fuel !== undefined ? Math.round(patch.fuel * 60) : CONSTANTS.FUEL_MAX_UNITS;
      } else {
        target.fuelUnits = 0;
      }
    }
  }

  function getCarryCapacity() {
    return Math.min(TUNING.capacity_max, TUNING.carry_capacity + 2 * successfulLights);
  }

  const randomMotes = parsedScenario.random_motes !== false;
  const randomShades = parsedScenario.random_shades !== false;
  const randomDrifters = parsedScenario.random_drifters ?? map.driftersEnabled;
  const windEnabled = parsedScenario.wind_enabled ?? map.windEnabled;

  let nextMoteNum = 1;
  let nextShadeNum = 1;
  let nextDrifterNum = 1;

  const motes = [];
  const shades = [];
  const drifters = [];
  const charms = (parsedScenario.charms ?? map.charms).map((c) => ({
    id: c.id,
    pos: c.pos ? [...c.pos] : [0, 0, 0],
    available: c.available ?? true,
    respawnTicks: c.respawn_ticks ?? 0
  }));

  function spawnMoteAtPoint(pt, kind = "random", ttlTicks = null, explicitId = null, sizeKey = null) {
    const type =
      sizeKey && FIREFLY_TYPES[sizeKey]
        ? creativeVariants
          ? FIREFLY_TYPES[sizeKey]
          : FIREFLY_TYPES.small
        : pickFireflyType(prng, creativeVariants);
    motes.push({
      id: explicitId ?? `M${nextMoteNum++}`,
      pos: [...pt],
      kind,
      ttlTicks,
      justDropped: kind === "dropped",
      size: type.key,
      value: type.value,
      moveAngle: prng.range(0, Math.PI * 2),
      moveSpeed: creativeVariants ? (type.key === "large" ? 2.6 : type.key === "medium" ? 1.5 : 0) : 0
    });
  }

  if (parsedScenario.motes !== undefined) {
    for (const item of parsedScenario.motes) {
      const pos = Array.isArray(item) ? item : item.pos;
      const id = !Array.isArray(item) && item.id ? item.id : null;
      const sizeKey = !Array.isArray(item) && item.size ? item.size : null;
      spawnMoteAtPoint(pos, "random", null, id, sizeKey);
    }
  } else if (randomMotes) {
    const indices = map.moteSpawnPoints.map((_, idx) => idx);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(prng.next() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const baseCount = creativeVariants ? indices.length : Math.min(CONSTANTS.MOTE_INITIAL_COUNT, indices.length);
    for (let i = 0; i < baseCount; i++) {
      spawnMoteAtPoint(map.moteSpawnPoints[indices[i]], "random", null);
    }
    if (creativeVariants) {
      // Extra lively fireflies scattered in 3D play mode
      for (let i = 0; i < 10; i++) {
        const pt = map.moteSpawnPoints[Math.floor(prng.next() * map.moteSpawnPoints.length)];
        const jitterX = pt[0] + prng.range(-3.5, 3.5);
        const jitterZ = pt[2] + prng.range(-3.5, 3.5);
        const candidate = isWithinPlayableXZ(night, jitterX, jitterZ) ? [jitterX, pt[1], jitterZ] : pt;
        spawnMoteAtPoint(candidate, "random", null);
      }
    }
  }

  if (parsedScenario.shades !== undefined) {
    for (const item of parsedScenario.shades) {
      const id = item.id ?? `S${nextShadeNum++}`;
      const match = /^S(\d+)$/.exec(id);
      if (match) nextShadeNum = Math.max(nextShadeNum, Number(match[1]) + 1);
      shades.push({
        id,
        pos: [...item.pos],
        state: item.state ?? "wander",
        stateTicksLeft: item.state_ticks_left ?? 0,
        targetLanternId: item.target_lantern_id ?? null,
        drainEmitTicks: 0,
        pulsePushTicks: 0,
        pulsePushDir: [1, 0],
        safePushTicks: 0,
        safePushLantern: null,
        recoilDir: [1, 0],
        wanderAngle: prng.range(0, Math.PI * 2),
        justSpawned: false
      });
    }
  }

  if (parsedScenario.drifters !== undefined) {
    for (const item of parsedScenario.drifters) {
      const id = item.id ?? `D${nextDrifterNum++}`;
      const match = /^D(\d+)$/.exec(id);
      if (match) nextDrifterNum = Math.max(nextDrifterNum, Number(match[1]) + 1);
      drifters.push({
        id,
        pos: [...item.pos],
        state: item.state ?? "idle",
        stolen: item.stolen ?? 0,
        fleeTicks: item.flee_ticks ?? 0,
        fleeDir: [1, 0],
        wanderAngle: prng.range(0, Math.PI * 2),
        justSpawned: false
      });
    }
  }

  let outerTick = 0;
  let simTick = 0;
  let state = "playing";
  let score = 0;
  let timeLeftS = parsedScenario.time_left_s ?? map.durationS;
  const initialTimeLeft = timeLeftS;
  let nightStartedEmitted = false;

  let windActive = false;
  let windWarning = false;
  let windDirDeg = 0;
  let windCycleTick = 0;

  const heldInput = {
    move: [0, 0],
    cam_yaw_deg: 0,
    jump: false,
    interact: false,
    pulse: false,
    dash: false,
    pause: false,
    slash: false
  };

  function readInputAndEdges(rawInput) {
    const prev = { ...heldInput };
    if (rawInput) {
      if (rawInput.move !== undefined) heldInput.move = [...rawInput.move];
      if (rawInput.cam_yaw_deg !== undefined) heldInput.cam_yaw_deg = rawInput.cam_yaw_deg;
      if (rawInput.jump !== undefined) heldInput.jump = rawInput.jump;
      if (rawInput.interact !== undefined) heldInput.interact = rawInput.interact;
      if (rawInput.pulse !== undefined) heldInput.pulse = rawInput.pulse;
      if (rawInput.dash !== undefined) heldInput.dash = rawInput.dash;
      if (rawInput.pause !== undefined) heldInput.pause = rawInput.pause;
      if (rawInput.slash !== undefined) heldInput.slash = rawInput.slash;
    }
    return {
      jumpPressed: !prev.jump && heldInput.jump,
      interactPressed: !prev.interact && heldInput.interact,
      pulsePressed: !prev.pulse && heldInput.pulse,
      dashPressed: !prev.dash && heldInput.dash,
      pausePressed: !prev.pause && heldInput.pause,
      slashPressed: !prev.slash && heldInput.slash
    };
  }

  function decrementCountersAndDrainFuel(events) {
    timeLeftS = Math.max(0, initialTimeLeft - simTick / 60);
    if (player.invulnTicks > 0) player.invulnTicks--;
    if (player.dashCooldownTicks > 0) player.dashCooldownTicks--;
    if (player.pulseCooldownTicks > 0) player.pulseCooldownTicks--;
    if (player.slashCooldownTicks > 0) player.slashCooldownTicks--;
    if (player.charmTicks > 0) player.charmTicks--;
    if (player.respawnWaitTicks > 0) {
      player.respawnWaitTicks--;
      if (player.respawnWaitTicks === 0) {
        player.pos = [...map.spawnPos];
        player.vel = [0, 0, 0];
        player.grounded = true;
        player.facing = [0, 0, 1];
        player.fallingTriggered = false;
        player.launchLock = false;
        player.invulnTicks = CONSTANTS.INVULN_TICKS;
      }
    }

    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.justDropped = false;
      if (m.kind === "dropped" && m.ttlTicks !== null) {
        m.ttlTicks--;
        if (m.ttlTicks <= 0) motes.splice(i, 1);
      }
    }

    for (const c of charms) {
      if (!c.available && c.respawnTicks > 0) {
        c.respawnTicks--;
        if (c.respawnTicks === 0) c.available = true;
      }
    }

    // Lantern natural decay + shade drain (Step 2)
    const lanternById = new Map(lanterns.map((l) => [l.id, l]));
    for (const l of lanterns) {
      if (l.lit) {
        l.fuelUnits = Math.max(0, l.fuelUnits - CONSTANTS.FUEL_DECAY_UNITS);
      }
    }

    for (const s of shades) {
      s.justSpawned = false;
      if (s.stateTicksLeft > 0) {
        s.stateTicksLeft--;
        if (s.stateTicksLeft === 0) {
          if (s.state === "spawning" || s.state === "stunned") {
            s.state = "wander";
          } else if (s.state === "recoil") {
            s.state = distXZ(s.pos, player.pos) <= CONSTANTS.SHADE_DETECT_R ? "chase" : "wander";
          }
        }
      }
      if (s.pulsePushTicks > 0) s.pulsePushTicks--;
      if (s.safePushTicks > 0) s.safePushTicks--;

      if (s.state === "drain") {
        const target = lanternById.get(s.targetLanternId);
        if (target && target.lit) {
          target.fuelUnits = Math.max(0, target.fuelUnits - CONSTANTS.FUEL_DRAIN_UNITS);
          s.drainEmitTicks += 1;
          if (s.drainEmitTicks % CONSTANTS.DRAIN_EMIT_INTERVAL === 0) {
            events.push({
              type: "event",
              tick: outerTick,
              name: "fuel_drain",
              data: { lantern_id: target.id, shade_id: s.id, fuel: round1(target.fuelUnits / 60) }
            });
          }
        }
      }
    }

    // Extinguish any lantern whose fuel reached 0 right after Step 2
    for (const l of lanterns) {
      if (l.lit && l.fuelUnits <= 0) {
        l.lit = false;
        l.fuelUnits = 0;
        l.deposited = 0;
        l.ever_lit = true;
        events.push({ type: "event", tick: outerTick, name: "lantern_out", data: { lantern_id: l.id } });
      }
    }

    // Move high-value medium/large fireflies in 3D creative mode
    if (creativeVariants) {
      for (const m of motes) {
        if (m.moveSpeed <= 0 || m.kind === "dropped") continue;
        m.moveAngle += prng.range(-0.08, 0.08);
        const nx = m.pos[0] + Math.cos(m.moveAngle) * m.moveSpeed * DT;
        const nz = m.pos[2] + Math.sin(m.moveAngle) * m.moveSpeed * DT;
        if (isWithinPlayableXZ(night, nx, nz)) {
          m.pos[0] = nx;
          m.pos[2] = nz;
        } else {
          m.moveAngle += Math.PI;
        }
      }
    }

    for (const d of drifters) {
      d.justSpawned = false;
      if (d.state === "flee" && d.fleeTicks > 0) {
        d.fleeTicks--;
        if (d.fleeTicks === 0) d.state = "removed";
      }
    }

    if (windEnabled) {
      windCycleTick = (windCycleTick + 1) % CONSTANTS.WIND_INTERVAL_TICKS;
      if (windCycleTick === CONSTANTS.WIND_INTERVAL_TICKS - CONSTANTS.WIND_WARN_TICKS) {
        windDirDeg = Math.floor(prng.next() * 360);
        windWarning = true;
      } else if (windCycleTick === 0) {
        windWarning = false;
        windActive = true;
      } else if (windCycleTick === CONSTANTS.WIND_DURATION_TICKS) {
        windActive = false;
      }
    } else {
      windActive = false;
      windWarning = false;
    }
  }

  function movePlayerAndCheckFall(events, edges) {
    if (player.respawnWaitTicks > 0) return;

    let [mx, mz] = heldInput.move;
    const mLen = Math.hypot(mx, mz);
    if (mLen > 1) {
      mx /= mLen;
      mz /= mLen;
    }
    const theta = (heldInput.cam_yaw_deg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const wx = mx * cosT + mz * sinT;
    const wz = -mx * sinT + mz * cosT;

    if (Math.hypot(wx, wz) > 1e-4) {
      const wLen = Math.hypot(wx, wz);
      player.facing = [wx / wLen, 0, wz / wLen];
    }

    if (edges.dashPressed && player.dashTicksLeft === 0 && (player.charmTicks > 0 || player.dashCooldownTicks === 0)) {
      player.dashTicksLeft = CONSTANTS.DASH_TICKS;
      player.dashCooldownTicks = player.charmTicks > 0 ? 0 : CONSTANTS.DASH_COOLDOWN_TICKS;
      player.dashDir = Math.hypot(wx, wz) > 1e-4 ? [player.facing[0], 0, player.facing[2]] : [...player.facing];
      player.launchLock = false;
      events.push({ type: "event", tick: outerTick, name: "dash", data: {} });
    }

    if (player.dashTicksLeft > 0) {
      player.dashTicksLeft--;
      player.vel[0] = player.dashDir[0] * TUNING.dash_speed;
      player.vel[2] = player.dashDir[2] * TUNING.dash_speed;
      if (!player.grounded) player.vel[1] = 0;
    } else {
      if (!player.launchLock) {
        const maxSpeed = player.charmTicks > 0 ? CONSTANTS.CHARM_SPEED : TUNING.player_speed;
        const targetVx = wx * maxSpeed;
        const targetVz = wz * maxSpeed;
        const maxDelta = (maxSpeed / CONSTANTS.ACCEL_TIME_S) * DT;
        const dvx = targetVx - player.vel[0];
        const dvz = targetVz - player.vel[2];
        const dvLen = Math.hypot(dvx, dvz);
        if (dvLen <= maxDelta || dvLen === 0) {
          player.vel[0] = targetVx;
          player.vel[2] = targetVz;
        } else {
          player.vel[0] += (dvx / dvLen) * maxDelta;
          player.vel[2] += (dvz / dvLen) * maxDelta;
        }
      }

      if (edges.jumpPressed && player.grounded) {
        player.vel[1] = CONSTANTS.JUMP_VELOCITY;
        player.grounded = false;
      }

      if (!player.grounded) {
        player.vel[1] -= CONSTANTS.GRAVITY * DT;
      }
    }

    let windVx = 0;
    let windVz = 0;
    if (windActive) {
      const wRad = (windDirDeg * Math.PI) / 180;
      windVx = Math.cos(wRad) * CONSTANTS.WIND_SPEED;
      windVz = Math.sin(wRad) * CONSTANTS.WIND_SPEED;
    }

    const prevPos = [...player.pos];
    const nextPos = [
      player.pos[0] + (player.vel[0] + windVx) * DT,
      player.pos[1] + player.vel[1] * DT,
      player.pos[2] + (player.vel[2] + windVz) * DT
    ];

    const resolved = resolvePlayerTerrain(night, prevPos, nextPos);
    player.pos[0] = resolved.x;
    player.pos[2] = resolved.z;

    if (resolved.supportY !== null && nextPos[1] <= resolved.supportY && player.vel[1] <= 0) {
      player.pos[1] = resolved.supportY;
      player.vel[1] = 0;
      player.grounded = true;
      player.launchLock = false;
    } else {
      player.pos[1] = nextPos[1];
      player.grounded = false;
    }

    if (player.grounded && map.launchpads.length > 0) {
      for (const pad of map.launchpads) {
        if (distXZ(player.pos, pad.pos) <= pad.radius && Math.abs(player.pos[1] - pad.pos[1]) <= 0.6) {
          let dirX = pad.dir ? pad.dir[0] : 0;
          let dirZ = pad.dir ? pad.dir[1] : 0;
          if (pad.target) {
            const dx = pad.target[0] - player.pos[0];
            const dz = pad.target[1] - player.pos[2];
            const d = Math.hypot(dx, dz) || 1;
            dirX = dx / d;
            dirZ = dz / d;
          }
          player.vel[0] = dirX * pad.horizSpeed;
          player.vel[2] = dirZ * pad.horizSpeed;
          player.vel[1] = pad.vy;
          player.grounded = false;
          player.launchLock = true;
          break;
        }
      }
    }

    if (!player.fallingTriggered && player.pos[1] < CONSTANTS.FALL_Y_THRESHOLD) {
      player.fallingTriggered = true;
      player.flames = Math.max(0, player.flames - 1);
      const lost = player.carried;
      player.carried = 0;
      events.push({
        type: "event",
        tick: outerTick,
        name: "player_hit",
        data: { by: "fall", flames: player.flames, dropped: 0, lost }
      });
      if (player.flames > 0) {
        player.respawnWaitTicks = CONSTANTS.RESPAWN_WAIT_TICKS;
        player.vel = [0, 0, 0];
      }
    }
  }

  function pickupMotesAndCharms(events) {
    if (player.respawnWaitTicks > 0 || player.fallingTriggered) return;
    const cap = getCarryCapacity();

    for (let i = motes.length - 1; i >= 0; i--) {
      if (player.carried >= cap) break;
      const m = motes[i];
      if (m.justDropped) continue;
      if (distXZ(player.pos, m.pos) <= TUNING.pickup_radius && Math.abs(player.pos[1] - m.pos[1]) <= CONSTANTS.MOTE_PICKUP_DY) {
        const gain = Math.min(m.value, cap - player.carried);
        player.carried += gain;
        motes.splice(i, 1);
        events.push({ type: "event", tick: outerTick, name: "mote_picked", data: { carried: player.carried } });
      }
    }

    for (const c of charms) {
      if (!c.available) continue;
      if (distXZ(player.pos, c.pos) <= TUNING.pickup_radius && Math.abs(player.pos[1] - c.pos[1]) <= CONSTANTS.MOTE_PICKUP_DY) {
        c.available = false;
        c.respawnTicks = CONSTANTS.CHARM_RESPAWN_TICKS;
        player.charmTicks = CONSTANTS.CHARM_DURATION_TICKS;
        events.push({
          type: "event",
          tick: outerTick,
          name: "charm_picked",
          data: { charm_id: c.id, charm_ticks: CONSTANTS.CHARM_DURATION_TICKS }
        });
      }
    }
  }

  function pushNearbyShadesFromSafeZone(lantern) {
    for (const s of shades) {
      if (distXZ(s.pos, lantern.pos) < TUNING.safe_radius) {
        s.safePushTicks = CONSTANTS.SAFE_PUSH_TICKS;
        s.safePushLantern = lantern;
        if (s.state === "drain" && s.targetLanternId === lantern.id) {
          s.state = "wander";
          s.targetLanternId = null;
          s.drainEmitTicks = 0;
        }
      }
    }
  }

  function interactLanterns(events, edges) {
    if (!edges.interactPressed || player.carried <= 0 || player.respawnWaitTicks > 0) return;

    let best = null;
    let bestDist = Infinity;
    for (const l of lanterns) {
      const canReceive = !l.lit || l.fuelUnits < CONSTANTS.FUEL_MAX_UNITS;
      if (!canReceive) continue;
      const d = distXZ(player.pos, l.pos);
      if (d <= TUNING.interact_radius && Math.abs(player.pos[1] - l.pos[1]) <= 2.5) {
        if (d < bestDist - 1e-9 || (Math.abs(d - bestDist) <= 1e-9 && l.id < best.id)) {
          bestDist = d;
          best = l;
        }
      }
    }
    if (!best) return;

    if (!best.lit) {
      const cost = best.ever_lit ? TUNING.relight_cost : TUNING.lantern_cost;
      const needed = Math.max(0, cost - best.deposited);
      const amount = Math.min(player.carried, needed);
      if (amount <= 0) return;

      best.deposited += amount;
      player.carried -= amount;
      score += amount * TUNING.score.per_mote;
      events.push({
        type: "event",
        tick: outerTick,
        name: "deposit",
        data: { lantern_id: best.id, amount, deposited: best.deposited }
      });

      if (best.deposited >= cost) {
        const isRelight = best.ever_lit;
        best.lit = true;
        best.ever_lit = true;
        best.fuelUnits = CONSTANTS.FUEL_MAX_UNITS;
        successfulLights += 1;
        if (isRelight) {
          best.relit_count += 1;
          score += TUNING.score.per_relight;
        } else {
          score += TUNING.score.per_lantern;
        }
        events.push({
          type: "event",
          tick: outerTick,
          name: "lantern_lit",
          data: { lantern_id: best.id, relight: isRelight }
        });
        pushNearbyShadesFromSafeZone(best);
      }
    } else {
      const maxNeeded = Math.ceil((CONSTANTS.FUEL_MAX_UNITS - best.fuelUnits) / CONSTANTS.FUEL_MOTE_UNITS);
      const used = Math.min(player.carried, maxNeeded);
      if (used <= 0) return;

      const wasLow = best.fuelUnits < CONSTANTS.FUEL_LOW_UNITS;
      best.fuelUnits = Math.min(CONSTANTS.FUEL_MAX_UNITS, best.fuelUnits + used * CONSTANTS.FUEL_MOTE_UNITS);
      player.carried -= used;
      score += used * TUNING.score.per_mote;
      events.push({
        type: "event",
        tick: outerTick,
        name: "refuel",
        data: { lantern_id: best.id, amount: used, fuel: round1(best.fuelUnits / 60) }
      });
      if (wasLow && best.fuelUnits >= CONSTANTS.FUEL_LOW_UNITS) {
        pushNearbyShadesFromSafeZone(best);
      }
    }
  }

  function updateSafeZones() {
    for (const s of shades) {
      if (s.safePushTicks > 0 && s.safePushLantern) {
        const l = s.safePushLantern;
        const dx = s.pos[0] - l.pos[0];
        const dz = s.pos[2] - l.pos[2];
        const d = Math.hypot(dx, dz);
        if (d >= TUNING.safe_radius) {
          s.safePushTicks = 0;
          s.safePushLantern = null;
        } else {
          const nx = d > 1e-6 ? dx / d : 1;
          const nz = d > 1e-6 ? dz / d : 0;
          const remain = TUNING.safe_radius - d;
          const step = remain / s.safePushTicks;
          s.pos[0] += nx * step;
          s.pos[2] += nz * step;
        }
      }
    }
  }

  function triggerPulse(events, edges) {
    if (!edges.pulsePressed || player.respawnWaitTicks > 0) return;
    if (player.pulseCooldownTicks > 0 || player.carried < TUNING.pulse_cost) return;

    player.carried -= TUNING.pulse_cost;
    player.pulseCooldownTicks = CONSTANTS.PULSE_COOLDOWN_TICKS;

    const pulseOrigin = [player.pos[0], player.pos[1] + CONSTANTS.PULSE_ORIGIN_Y, player.pos[2]];
    const stunnedIds = [];

    for (const s of shades) {
      if (s.justSpawned) continue;
      if (dist3D(pulseOrigin, s.pos) <= TUNING.pulse_radius) {
        const wasDraining = s.state === "drain";
        const dx = s.pos[0] - player.pos[0];
        const dz = s.pos[2] - player.pos[2];
        const d = Math.hypot(dx, dz);
        s.pulsePushDir = d > 1e-6 ? [dx / d, dz / d] : [1, 0];
        s.pulsePushTicks = CONSTANTS.PULSE_PUSH_TICKS;
        s.state = "stunned";
        s.stateTicksLeft = CONSTANTS.PULSE_STUN_TICKS;
        s.targetLanternId = null;
        s.drainEmitTicks = 0;
        stunnedIds.push(s.id);
        score += wasDraining ? TUNING.score.per_drain_stun : TUNING.score.per_stun;
      }
    }

    // Move high-value medium/large fireflies in 3D creative mode
    if (creativeVariants) {
      for (const m of motes) {
        if (m.moveSpeed <= 0 || m.kind === "dropped") continue;
        m.moveAngle += prng.range(-0.08, 0.08);
        const nx = m.pos[0] + Math.cos(m.moveAngle) * m.moveSpeed * DT;
        const nz = m.pos[2] + Math.sin(m.moveAngle) * m.moveSpeed * DT;
        if (isWithinPlayableXZ(night, nx, nz)) {
          m.pos[0] = nx;
          m.pos[2] = nz;
        } else {
          m.moveAngle += Math.PI;
        }
      }
    }

    for (const d of drifters) {
      if (d.justSpawned || d.state === "removed") continue;
      if (dist3D(pulseOrigin, d.pos) <= TUNING.pulse_radius) {
        if (d.state === "chase") {
          d.state = "flee";
          d.fleeTicks = CONSTANTS.DRIFTER_FLEE_TICKS;
          const dx = d.pos[0] - player.pos[0];
          const dz = d.pos[2] - player.pos[2];
          const len = Math.hypot(dx, dz) || 1;
          d.fleeDir = [dx / len, dz / len];
        } else if (d.state === "flee" && d.stolen > 0) {
          const droppedAmount = d.stolen;
          for (let i = 0; i < droppedAmount; i++) {
            spawnMoteAtPoint(d.pos, "dropped", CONSTANTS.MOTE_DROPPED_TTL_TICKS);
          }
          d.stolen = 0;
          d.fleeTicks = CONSTANTS.DRIFTER_DROP_FLEE_TICKS;
          events.push({
            type: "event",
            tick: outerTick,
            name: "drifter_drop",
            data: { drifter_id: d.id, amount: droppedAmount }
          });
        }
      }
    }

    events.push({ type: "event", tick: outerTick, name: "pulse", data: { stunned_ids: stunnedIds } });
  }

  function tryCreativeLightSlash(events, edges) {
    if (!creativeVariants || !edges.slashPressed || player.respawnWaitTicks > 0) return;
    if (player.slashCooldownTicks > 0) return;
    player.slashCooldownTicks = 72;
    const hitIds = [];
    for (const s of shades) {
      if (s.justSpawned || s.state === "spawning") continue;
      const dx = s.pos[0] - player.pos[0];
      const dz = s.pos[2] - player.pos[2];
      const d = Math.hypot(dx, dz);
      if (d <= 3.5 && Math.abs(s.pos[1] - player.pos[1]) <= 2.0) {
        const dot = d > 1e-4 ? (dx / d) * player.facing[0] + (dz / d) * player.facing[2] : 1;
        if (dot >= -0.25) {
          s.pulsePushDir = d > 1e-4 ? [dx / d, dz / d] : [player.facing[0], player.facing[2]];
          s.pulsePushTicks = 10;
          s.state = "stunned";
          s.stateTicksLeft = 60;
          s.targetLanternId = null;
          s.drainEmitTicks = 0;
          hitIds.push(s.id);
        }
      }
    }
    events.push({ type: "event", tick: outerTick, name: "creative_slash", data: { hit_ids: hitIds } });
  }

  function pickWanderLanternTarget(shade) {
    // Nearest lit lantern with fuel < 30; if none, nearest unlit lantern
    let weak = null;
    let weakDist = Infinity;
    let unlit = null;
    let unlitDist = Infinity;

    for (const l of lanterns) {
      const d = distXZ(shade.pos, l.pos);
      if (l.lit && l.fuelUnits < CONSTANTS.FUEL_LOW_UNITS) {
        if (d < weakDist - 1e-9 || (Math.abs(d - weakDist) <= 1e-9 && l.id < weak.id)) {
          weakDist = d;
          weak = l;
        }
      } else if (!l.lit) {
        if (d < unlitDist - 1e-9 || (Math.abs(d - unlitDist) <= 1e-9 && l.id < unlit.id)) {
          unlitDist = d;
          unlit = l;
        }
      }
    }
    return weak ?? unlit;
  }

  function moveShadesAndDrifters() {
    const lanternById = new Map(lanterns.map((l) => [l.id, l]));

    for (const s of shades) {
      if (s.justSpawned || s.state === "spawning") continue;

      if (s.state === "stunned") {
        if (s.pulsePushTicks > 0) {
          const stepDist = TUNING.pulse_push_m / CONSTANTS.PULSE_PUSH_TICKS;
          const nx = s.pos[0] + s.pulsePushDir[0] * stepDist;
          const nz = s.pos[2] + s.pulsePushDir[1] * stepDist;
          if (isWithinPlayableXZ(night, nx, nz)) {
            s.pos[0] = nx;
            s.pos[2] = nz;
          }
        }
        continue;
      }

      if (s.state === "recoil") {
        const stepDist = CONSTANTS.SHADE_RECOIL_M / CONSTANTS.SHADE_RECOIL_TICKS;
        const nx = s.pos[0] + s.recoilDir[0] * stepDist;
        const nz = s.pos[2] + s.recoilDir[1] * stepDist;
        if (isWithinPlayableXZ(night, nx, nz)) {
          s.pos[0] = nx;
          s.pos[2] = nz;
        }
        continue;
      }

      const dPlayer = distXZ(s.pos, player.pos);

      if (s.state === "drain") {
        const target = lanternById.get(s.targetLanternId);
        if (dPlayer <= TUNING.safe_radius) {
          s.state = "chase";
          s.targetLanternId = null;
          s.drainEmitTicks = 0;
        } else if (!target || !target.lit || target.fuelUnits >= CONSTANTS.FUEL_LOW_UNITS || distXZ(s.pos, target.pos) > CONSTANTS.DRAIN_RADIUS) {
          s.state = "wander";
          s.targetLanternId = null;
          s.drainEmitTicks = 0;
        } else {
          continue; // Stands still while draining
        }
      }

      if (s.state === "wander" && dPlayer <= CONSTANTS.SHADE_DETECT_R) {
        s.state = "chase";
        s.targetLanternId = null;
      } else if (s.state === "chase" && dPlayer > CONSTANTS.SHADE_DROP_R) {
        s.state = "wander";
      }

      if (s.state === "chase") {
        moveTowardXZ(s.pos, player.pos, map.shadeSpeed * DT);
      } else {
        const targetLantern = pickWanderLanternTarget(s);
        if (targetLantern) {
          s.targetLanternId = targetLantern.id;
          moveTowardXZ(s.pos, targetLantern.pos, map.shadeSpeed * DT);
          if (targetLantern.lit && targetLantern.fuelUnits < CONSTANTS.FUEL_LOW_UNITS && distXZ(s.pos, targetLantern.pos) <= CONSTANTS.DRAIN_RADIUS) {
            s.state = "drain";
            s.drainEmitTicks = 0;
          }
        } else {
          s.targetLanternId = null;
          s.wanderAngle += 0.02;
          const nx = s.pos[0] + Math.cos(s.wanderAngle) * (map.shadeSpeed * 0.4 * DT);
          const nz = s.pos[2] + Math.sin(s.wanderAngle) * (map.shadeSpeed * 0.4 * DT);
          if (isWithinPlayableXZ(night, nx, nz)) {
            s.pos[0] = nx;
            s.pos[2] = nz;
          } else {
            s.wanderAngle += Math.PI;
          }
        }
      }

      if (s.safePushTicks === 0) {
        clampShadeOutsideSafeLanterns(s, lanterns, player.pos);
      }
    }

    // Move high-value medium/large fireflies in 3D creative mode
    if (creativeVariants) {
      for (const m of motes) {
        if (m.moveSpeed <= 0 || m.kind === "dropped") continue;
        m.moveAngle += prng.range(-0.08, 0.08);
        const nx = m.pos[0] + Math.cos(m.moveAngle) * m.moveSpeed * DT;
        const nz = m.pos[2] + Math.sin(m.moveAngle) * m.moveSpeed * DT;
        if (isWithinPlayableXZ(night, nx, nz)) {
          m.pos[0] = nx;
          m.pos[2] = nz;
        } else {
          m.moveAngle += Math.PI;
        }
      }
    }

    for (const d of drifters) {
      if (d.justSpawned || d.state === "removed") continue;
      const distP = distXZ(d.pos, player.pos);

      if (d.state === "idle") {
        if (player.carried >= CONSTANTS.DRIFTER_TRIGGER_MOTES && distP <= CONSTANTS.DRIFTER_TRIGGER_R) {
          d.state = "chase";
        } else {
          d.wanderAngle += 0.03;
          d.pos[0] += Math.cos(d.wanderAngle) * CONSTANTS.DRIFTER_IDLE_SPEED * DT;
          d.pos[2] += Math.sin(d.wanderAngle) * CONSTANTS.DRIFTER_IDLE_SPEED * DT;
        }
      }

      if (d.state === "chase") {
        if (player.carried < CONSTANTS.DRIFTER_TRIGGER_MOTES || distP > CONSTANTS.DRIFTER_TRIGGER_R) {
          d.state = "idle";
        } else {
          moveTowardXZ(d.pos, player.pos, CONSTANTS.DRIFTER_SPEED * DT);
        }
      } else if (d.state === "flee") {
        const dx = d.pos[0] - player.pos[0];
        const dz = d.pos[2] - player.pos[2];
        const len = Math.hypot(dx, dz);
        if (len > 1e-4) d.fleeDir = [dx / len, dz / len];
        d.pos[0] += d.fleeDir[0] * CONSTANTS.DRIFTER_SPEED * DT;
        d.pos[2] += d.fleeDir[1] * CONSTANTS.DRIFTER_SPEED * DT;
      }
    }
  }

  function resolveCollisions(events) {
    if (player.respawnWaitTicks > 0 || player.fallingTriggered) return;

    // Move high-value medium/large fireflies in 3D creative mode
    if (creativeVariants) {
      for (const m of motes) {
        if (m.moveSpeed <= 0 || m.kind === "dropped") continue;
        m.moveAngle += prng.range(-0.08, 0.08);
        const nx = m.pos[0] + Math.cos(m.moveAngle) * m.moveSpeed * DT;
        const nz = m.pos[2] + Math.sin(m.moveAngle) * m.moveSpeed * DT;
        if (isWithinPlayableXZ(night, nx, nz)) {
          m.pos[0] = nx;
          m.pos[2] = nz;
        } else {
          m.moveAngle += Math.PI;
        }
      }
    }

    for (const d of drifters) {
      if (d.justSpawned || d.state !== "chase" || d.stolen > 0) continue;
      if (distXZ(d.pos, player.pos) <= CONSTANTS.DRIFTER_STEAL_R) {
        const amount = Math.min(CONSTANTS.DRIFTER_STEAL_MAX, player.carried);
        player.carried -= amount;
        d.stolen = amount;
        d.state = "flee";
        d.fleeTicks = CONSTANTS.DRIFTER_FLEE_TICKS;
        const dx = d.pos[0] - player.pos[0];
        const dz = d.pos[2] - player.pos[2];
        const len = Math.hypot(dx, dz) || 1;
        d.fleeDir = [dx / len, dz / len];
        events.push({
          type: "event",
          tick: outerTick,
          name: "drifter_steal",
          data: { drifter_id: d.id, amount, carried: player.carried }
        });
      }
    }

    if (player.invulnTicks > 0) return;
    const sortedShades = [...shades].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    for (const s of sortedShades) {
      if (s.justSpawned || s.safePushTicks > 0) continue;
      if (s.state === "stunned" || s.state === "recoil" || s.state === "spawning" || s.state === "drain") continue;
      if (distXZ(s.pos, player.pos) <= TUNING.shade_hit_radius && Math.abs(player.pos[1] - s.pos[1]) <= CONSTANTS.SHADE_HIT_DY) {
        player.flames = Math.max(0, player.flames - 1);
        const dropped = Math.floor(player.carried * TUNING.hit_drop_ratio);
        player.carried -= dropped;
        for (let i = 0; i < dropped; i++) {
          const angle = prng.range(0, Math.PI * 2);
          const rad = prng.range(1.5, 2.5);
          spawnMoteAtPoint(
            [player.pos[0] + rad * Math.cos(angle), player.pos[1], player.pos[2] + rad * Math.sin(angle)],
            "dropped",
            CONSTANTS.MOTE_DROPPED_TTL_TICKS
          );
        }
        player.invulnTicks = CONSTANTS.INVULN_TICKS;
        const dx = s.pos[0] - player.pos[0];
        const dz = s.pos[2] - player.pos[2];
        const len = Math.hypot(dx, dz) || 1;
        s.recoilDir = [dx / len, dz / len];
        s.state = "recoil";
        s.stateTicksLeft = CONSTANTS.SHADE_RECOIL_TICKS;
        events.push({
          type: "event",
          tick: outerTick,
          name: "player_hit",
          data: { by: "shade", flames: player.flames, dropped }
        });
        break;
      }
    }
  }

  function spawnScheduledEntities(events) {
    const moteMax = creativeVariants ? 45 : CONSTANTS.MOTE_MAX_COUNT;
    const moteInterval = creativeVariants ? 90 : CONSTANTS.MOTE_SPAWN_INTERVAL_TICKS;
    if (randomMotes && simTick > 0 && simTick % moteInterval === 0 && motes.length < moteMax) {
      const emptyPts = map.moteSpawnPoints.filter(
        (pt) => !motes.some((m) => distXZ(m.pos, pt) < 0.5 && Math.abs(m.pos[1] - pt[1]) < 0.5)
      );
      if (emptyPts.length > 0) {
        const chosen = emptyPts[Math.floor(prng.next() * emptyPts.length)];
        spawnMoteAtPoint(chosen, "random", null);
      } else if (creativeVariants) {
        const pt = map.moteSpawnPoints[Math.floor(prng.next() * map.moteSpawnPoints.length)];
        const jx = pt[0] + prng.range(-3.0, 3.0);
        const jz = pt[2] + prng.range(-3.0, 3.0);
        spawnMoteAtPoint(isWithinPlayableXZ(night, jx, jz) ? [jx, pt[1], jz] : pt, "random", null);
      }
    }

    if (randomShades && simTick >= CONSTANTS.SHADE_FIRST_SPAWN_TICK) {
      const spawnCount =
        simTick === CONSTANTS.SHADE_FIRST_SPAWN_TICK
          ? 2
          : (simTick - CONSTANTS.SHADE_FIRST_SPAWN_TICK) % map.shadeSpawnIntervalTicks === 0
            ? 1
            : 0;
      for (let i = 0; i < spawnCount; i++) {
        if (shades.length >= map.shadeMax) break;
        const candidates = map.shadeSpawnPoints.filter((pt) => distXZ(pt, player.pos) >= 15.0);
        if (candidates.length === 0) break;
        const pt = candidates[Math.floor(prng.next() * candidates.length)];
        const id = `S${nextShadeNum++}`;
        const shade = {
          id,
          pos: [pt[0], pt[1], pt[2]],
          state: "spawning",
          stateTicksLeft: CONSTANTS.SHADE_SPAWN_TICKS,
          targetLanternId: null,
          drainEmitTicks: 0,
          pulsePushTicks: 0,
          pulsePushDir: [1, 0],
          safePushTicks: 0,
          safePushLantern: null,
          recoilDir: [1, 0],
          wanderAngle: prng.range(0, Math.PI * 2),
          justSpawned: true
        };
        clampShadeOutsideSafeLanterns(shade, lanterns, player.pos);
        shades.push(shade);
        events.push({ type: "event", tick: outerTick, name: "shade_spawned", data: { id } });
      }
    }

    if (randomDrifters && map.drifterSpawnPoints.length > 0 && simTick > 0 && simTick % CONSTANTS.DRIFTER_SPAWN_INTERVAL_TICKS === 0) {
      const activeDrifters = drifters.filter((d) => d.state !== "removed").length;
      if (activeDrifters < CONSTANTS.DRIFTER_MAX_COUNT) {
        const pt = map.drifterSpawnPoints[Math.floor(prng.next() * map.drifterSpawnPoints.length)];
        drifters.push({
          id: `D${nextDrifterNum++}`,
          pos: [...pt],
          state: "idle",
          stolen: 0,
          fleeTicks: 0,
          fleeDir: [1, 0],
          wanderAngle: prng.range(0, Math.PI * 2),
          justSpawned: true
        });
      }
    }
  }

  function evaluateWinLoss(events) {
    if (player.flames <= 0) {
      state = "lost";
      events.push({ type: "event", tick: outerTick, name: "game_over", data: { result: "lost", reason: "no_flames" } });
      return;
    }

    if (timeLeftS <= 0) {
      timeLeftS = 0;
      const litLanterns = lanterns.filter((l) => l.lit);
      const threshold = Math.ceil(TUNING.win_ratio * lanterns.length);
      if (litLanterns.length >= threshold) {
        state = "won";
        for (const l of litLanterns) {
          score += 50 + Math.floor(l.fuelUnits / 60);
        }
        score += player.flames * TUNING.score.per_flame_left;
        events.push({ type: "event", tick: outerTick, name: "game_over", data: { result: "won", reason: "dawn_survived" } });
      } else {
        state = "lost";
        events.push({ type: "event", tick: outerTick, name: "game_over", data: { result: "lost", reason: "dawn" } });
      }
    }
  }

  function step(rawInput = null) {
    if (state === "won" || state === "lost") return [];

    outerTick += 1;
    const events = [];
    const edges = readInputAndEdges(rawInput);

    if (edges.pausePressed) {
      if (state === "playing") {
        state = "paused";
        events.push({ type: "event", tick: outerTick, name: "paused", data: {} });
        return events;
      }
      if (state === "paused") {
        state = "playing";
        events.push({ type: "event", tick: outerTick, name: "resumed", data: {} });
      }
    }
    if (state === "paused") return events;

    simTick += 1;
    if (!nightStartedEmitted) {
      nightStartedEmitted = true;
      events.push({ type: "event", tick: outerTick, name: "night_start", data: { night } });
    }

    decrementCountersAndDrainFuel(events);
    movePlayerAndCheckFall(events, edges);
    pickupMotesAndCharms(events);
    interactLanterns(events, edges);
    updateSafeZones();
    triggerPulse(events, edges);
    tryCreativeLightSlash(events, edges);
    moveShadesAndDrifters();
    resolveCollisions(events);
    spawnScheduledEntities(events);
    evaluateWinLoss(events);

    return events;
  }

  function getSnapshot() {
    return {
      type: "snapshot",
      tick: outerTick,
      sim_tick: simTick,
      night,
      state,
      time_left_s: round3(timeLeftS),
      score,
      wind: { active: windActive, dir_deg: round3(windDirDeg) },
      player: {
        pos: player.pos.map(round3),
        vel: player.vel.map(round3),
        grounded: player.grounded,
        flames: player.flames,
        carried: player.carried,
        capacity: getCarryCapacity(),
        invuln: player.invulnTicks > 0,
        dash_cd_s: round3(player.dashCooldownTicks / 60),
        pulse_cd_s: round3(player.pulseCooldownTicks / 60),
        charm_s: round3(player.charmTicks / 60)
      },
      lanterns: lanterns.map((l) => ({
        id: l.id,
        pos: l.pos.map(round3),
        lit: l.lit,
        deposited: l.deposited,
        fuel: l.lit ? round1(l.fuelUnits / 60) : 0,
        ever_lit: l.ever_lit,
        relit_count: l.relit_count
      })),
      shades: shades.map((s) => ({
        id: s.id,
        pos: s.pos.map(round3),
        state: s.state
      })),
      motes: motes.map((m) => ({
        id: m.id,
        pos: m.pos.map(round3),
        kind: m.kind,
        ttl_s: m.ttlTicks === null ? null : round3(m.ttlTicks / 60)
      })),
      drifters: drifters.map((d) => ({
        id: d.id,
        pos: d.pos.map(round3),
        state: d.state,
        stolen: d.stolen
      })),
      charms: charms.map((c) => ({
        id: c.id,
        available: c.available,
        respawn_s: round3(c.respawnTicks / 60)
      })),
      motes_active: motes.length
    };
  }

  function getRenderState() {
    return {
      outerTick,
      simTick,
      night,
      map,
      state,
      timeLeftS,
      score,
      wind: { active: windActive, warning: windWarning, dirDeg: windDirDeg },
      player: {
        pos: [...player.pos],
        vel: [...player.vel],
        facing: [...player.facing],
        grounded: player.grounded,
        flames: player.flames,
        carried: player.carried,
        capacity: getCarryCapacity(),
        invulnTicks: player.invulnTicks,
        dashCooldownTicks: player.dashCooldownTicks,
        dashTicksLeft: player.dashTicksLeft,
        pulseCooldownTicks: player.pulseCooldownTicks,
        slashCooldownTicks: player.slashCooldownTicks,
        charmTicks: player.charmTicks,
        respawnWaitTicks: player.respawnWaitTicks
      },
      lanterns: lanterns.map((l) => ({ ...l, pos: [...l.pos], fuel: l.lit ? l.fuelUnits / 60 : 0 })),
      shades: shades.map((s) => ({ ...s, pos: [...s.pos] })),
      motes: motes.map((m) => ({ ...m, pos: [...m.pos] })),
      drifters: drifters.map((d) => ({ ...d, pos: [...d.pos] })),
      charms: charms.map((c) => ({ ...c, pos: [...c.pos] }))
    };
  }

  function getEndLine() {
    return { type: "end", ticks: outerTick, state, score };
  }

  return { step, getSnapshot, getRenderState, getEndLine };
}

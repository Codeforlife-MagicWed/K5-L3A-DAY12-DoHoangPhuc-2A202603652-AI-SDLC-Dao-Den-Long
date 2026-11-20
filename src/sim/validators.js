/**
 * Validation helpers for Test Contract v1.1 scenario and inputs files.
 */

export class ContractInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "ContractInputError";
    this.exitCode = 2;
  }
}

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function assertVec3(v, label) {
  if (!Array.isArray(v) || v.length !== 3 || !v.every((n) => typeof n === "number" && Number.isFinite(n))) {
    throw new ContractInputError(`Invalid ${label}: expected [x, y, z] finite numbers`);
  }
}

function assertNonNegInt(v, label) {
  if (!Number.isInteger(v) || v < 0) {
    throw new ContractInputError(`${label} must be a non-negative integer`);
  }
}

export function validateScenario(scenario) {
  if (scenario === null || scenario === undefined) return {};
  if (!isPlainObject(scenario)) {
    throw new ContractInputError("Scenario must be a JSON object");
  }
  if (scenario.player !== undefined) {
    if (!isPlainObject(scenario.player)) throw new ContractInputError("scenario.player must be an object");
    if (scenario.player.pos !== undefined) assertVec3(scenario.player.pos, "scenario.player.pos");
    for (const k of ["carried", "flames", "invuln_ticks", "dash_cd_ticks", "pulse_cd_ticks", "charm_ticks", "successful_lights"]) {
      if (scenario.player[k] !== undefined) assertNonNegInt(scenario.player[k], `scenario.player.${k}`);
    }
  }
  for (const key of ["random_motes", "random_shades", "random_drifters", "wind_enabled"]) {
    if (scenario[key] !== undefined && typeof scenario[key] !== "boolean") {
      throw new ContractInputError(`scenario.${key} must be a boolean`);
    }
  }
  if (scenario.motes !== undefined) {
    if (!Array.isArray(scenario.motes)) throw new ContractInputError("scenario.motes must be an array");
    for (let i = 0; i < scenario.motes.length; i++) {
      const m = scenario.motes[i];
      if (Array.isArray(m)) {
        assertVec3(m, `scenario.motes[${i}]`);
      } else if (isPlainObject(m) && m.pos !== undefined) {
        assertVec3(m.pos, `scenario.motes[${i}].pos`);
      } else {
        throw new ContractInputError(`Invalid scenario.motes[${i}]`);
      }
    }
  }
  if (scenario.shades !== undefined) {
    if (!Array.isArray(scenario.shades)) throw new ContractInputError("scenario.shades must be an array");
    for (let i = 0; i < scenario.shades.length; i++) {
      const s = scenario.shades[i];
      if (!isPlainObject(s) || s.pos === undefined) {
        throw new ContractInputError(`scenario.shades[${i}] must be an object with pos`);
      }
      assertVec3(s.pos, `scenario.shades[${i}].pos`);
      if (s.state_ticks_left !== undefined) assertNonNegInt(s.state_ticks_left, `scenario.shades[${i}].state_ticks_left`);
      if (s.target_lantern_id !== undefined && s.target_lantern_id !== null && typeof s.target_lantern_id !== "string") {
        throw new ContractInputError(`scenario.shades[${i}].target_lantern_id must be a string or null`);
      }
    }
  }
  if (scenario.drifters !== undefined) {
    if (!Array.isArray(scenario.drifters)) throw new ContractInputError("scenario.drifters must be an array");
    for (let i = 0; i < scenario.drifters.length; i++) {
      const d = scenario.drifters[i];
      if (!isPlainObject(d) || d.pos === undefined) {
        throw new ContractInputError(`scenario.drifters[${i}] must be an object with pos`);
      }
      assertVec3(d.pos, `scenario.drifters[${i}].pos`);
    }
  }
  if (scenario.charms !== undefined) {
    if (!Array.isArray(scenario.charms)) throw new ContractInputError("scenario.charms must be an array");
    for (let i = 0; i < scenario.charms.length; i++) {
      const c = scenario.charms[i];
      if (!isPlainObject(c) || typeof c.id !== "string") {
        throw new ContractInputError(`scenario.charms[${i}] must have string id`);
      }
      if (c.pos !== undefined) assertVec3(c.pos, `scenario.charms[${i}].pos`);
    }
  }
  if (scenario.lanterns !== undefined) {
    if (!Array.isArray(scenario.lanterns)) throw new ContractInputError("scenario.lanterns must be an array");
    for (let i = 0; i < scenario.lanterns.length; i++) {
      const l = scenario.lanterns[i];
      if (!isPlainObject(l) || typeof l.id !== "string") {
        throw new ContractInputError(`scenario.lanterns[${i}] must have string id`);
      }
      if (l.pos !== undefined) assertVec3(l.pos, `scenario.lanterns[${i}].pos`);
      if (l.deposited !== undefined) assertNonNegInt(l.deposited, `scenario.lanterns[${i}].deposited`);
      if (l.lit !== undefined && typeof l.lit !== "boolean") {
        throw new ContractInputError(`scenario.lanterns[${i}].lit must be boolean`);
      }
      if (l.ever_lit !== undefined && typeof l.ever_lit !== "boolean") {
        throw new ContractInputError(`scenario.lanterns[${i}].ever_lit must be boolean`);
      }
      if (l.fuel !== undefined && (typeof l.fuel !== "number" || !Number.isFinite(l.fuel) || l.fuel < 0 || l.fuel > 100)) {
        throw new ContractInputError(`scenario.lanterns[${i}].fuel must be a number in [0, 100]`);
      }
    }
  }
  if (
    scenario.time_left_s !== undefined &&
    (typeof scenario.time_left_s !== "number" || !Number.isFinite(scenario.time_left_s) || scenario.time_left_s < 0)
  ) {
    throw new ContractInputError("scenario.time_left_s must be a non-negative number");
  }
  return scenario;
}

export function validateInputs(inputs) {
  if (inputs === null || inputs === undefined) return [];
  if (!isPlainObject(inputs) || !Array.isArray(inputs.frames)) {
    throw new ContractInputError("Inputs must be an object with a frames array");
  }
  let prevTick = -1;
  for (let i = 0; i < inputs.frames.length; i++) {
    const f = inputs.frames[i];
    if (!isPlainObject(f) || !Number.isInteger(f.tick) || f.tick < 0) {
      throw new ContractInputError(`frames[${i}].tick must be a non-negative integer`);
    }
    if (f.tick <= prevTick) {
      throw new ContractInputError(`frames[${i}].tick (${f.tick}) must strictly increase`);
    }
    prevTick = f.tick;
    if (f.move !== undefined) {
      if (
        !Array.isArray(f.move) ||
        f.move.length !== 2 ||
        !f.move.every((n) => typeof n === "number" && Number.isFinite(n) && n >= -1 && n <= 1)
      ) {
        throw new ContractInputError(`frames[${i}].move must be [x, z] with values in [-1, 1]`);
      }
    }
    if (f.cam_yaw_deg !== undefined && (typeof f.cam_yaw_deg !== "number" || !Number.isFinite(f.cam_yaw_deg))) {
      throw new ContractInputError(`frames[${i}].cam_yaw_deg must be a finite number`);
    }
    for (const btn of ["jump", "interact", "pulse", "dash", "pause"]) {
      if (f[btn] !== undefined && typeof f[btn] !== "boolean") {
        throw new ContractInputError(`frames[${i}].${btn} must be a boolean`);
      }
    }
  }
  return inputs.frames;
}

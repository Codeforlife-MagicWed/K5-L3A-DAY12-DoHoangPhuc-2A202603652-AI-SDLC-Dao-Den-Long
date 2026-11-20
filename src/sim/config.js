/**
 * Shared simulation configuration synchronized with game.contract.json (v1.2).
 */

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export const TUNING = {
  player_speed: 6.0,
  dash_speed: 14.0,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  carry_capacity: 10,
  capacity_max: 20,
  lantern_cost: 10,
  relight_cost: 5,
  lantern_count_night1: 5,
  fuel_max: 100,
  fuel_decay_per_s: 1.0,
  fuel_per_mote: 10,
  drain_per_s: 5,
  low_fuel_threshold: 30,
  win_ratio: 0.6,
  pickup_radius: 1.0,
  interact_radius: 2.0,
  pulse_cost: 3,
  pulse_radius: 5.0,
  night1_duration_s: 240,
  night2_duration_s: 270,
  night3_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2.0,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 3.0,
  safe_radius: 6.0,
  shade_speed: 4.0,
  shade_hit_radius: 1.0,
  fall_enabled: true,
  score: {
    per_mote: 5,
    per_lantern: 100,
    per_relight: 40,
    per_stun: 5,
    per_drain_stun: 15,
    per_second_left: 0,
    per_flame_left: 50
  }
};

export const PALETTE = {
  skyNight: 0x0e1430,
  fogNight: 0x1b2350,
  grass: 0x2f5d50,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  cloudSea: 0x12384a,
  lanternLit: 0xffb347,
  lanternCore: 0xffe9b0,
  lanternUnlit: 0x5b5f6e,
  fireflyCore: 0xfff6c2,
  fireflyGlow: 0xffe58a,
  shadeBody: 0x120a1a,
  shadeRim: 0x7a3cff,
  shadeRimColorblind: 0x00b3ff,
  shadeStunned: 0x3a3450,
  mayCoat: 0xe8e2d0,
  mayScarf: 0xc8102e,
  goldAccent: 0xf2c14e,
  drifter: 0x8fa3b8,
  uiDanger: 0xff5a5f,
  uiDangerColorblind: 0xffffff,
  uiText: 0xf5f1e6
};

export const FIREFLY_TYPES = {
  small: { key: "small", label: "Đom đóm nhỏ", value: 1, scale: 0.75 },
  medium: { key: "medium", label: "Đom đóm vừa", value: 2, scale: 1.1 },
  large: { key: "large", label: "Đom đóm lớn", value: 3, scale: 1.5 }
};

export const CONSTANTS = {
  ACCEL_TIME_S: 0.1,
  JUMP_VELOCITY: 7.0,
  GRAVITY: 20.0,
  DASH_TICKS: 12,
  DASH_COOLDOWN_TICKS: 90,
  INVULN_TICKS: 90,
  RESPAWN_WAIT_TICKS: 60,
  FALL_Y_THRESHOLD: -10.0,
  FUEL_MAX_UNITS: 6000,
  FUEL_LOW_UNITS: 1800,
  FUEL_MOTE_UNITS: 600,
  FUEL_DECAY_UNITS: 1,
  FUEL_DRAIN_UNITS: 5,
  DRAIN_RADIUS: 2.0,
  DRAIN_EMIT_INTERVAL: 60,
  MOTE_INITIAL_COUNT: 20,
  MOTE_MAX_COUNT: 30,
  MOTE_SPAWN_INTERVAL_TICKS: 240,
  MOTE_DROPPED_TTL_TICKS: 480,
  MOTE_PICKUP_DY: 1.5,
  PULSE_ORIGIN_Y: 0.8,
  PULSE_STUN_TICKS: 120,
  PULSE_PUSH_TICKS: 15,
  PULSE_COOLDOWN_TICKS: 180,
  SAFE_PUSH_TICKS: 30,
  SHADE_DETECT_R: 12.0,
  SHADE_DROP_R: 18.0,
  SHADE_HIT_DY: 1.5,
  SHADE_RECOIL_M: 2.0,
  SHADE_RECOIL_TICKS: 60,
  SHADE_FIRST_SPAWN_TICK: 300,
  SHADE_SPAWN_TICKS: 60,
  DRIFTER_SPEED: 7.0,
  DRIFTER_IDLE_SPEED: 2.0,
  DRIFTER_TRIGGER_MOTES: 5,
  DRIFTER_TRIGGER_R: 15.0,
  DRIFTER_STEAL_R: 1.2,
  DRIFTER_STEAL_MAX: 3,
  DRIFTER_FLEE_TICKS: 240,
  DRIFTER_DROP_FLEE_TICKS: 120,
  DRIFTER_SPAWN_INTERVAL_TICKS: 1200,
  DRIFTER_MAX_COUNT: 2,
  CHARM_DURATION_TICKS: 600,
  CHARM_SPEED: 7.2,
  CHARM_RESPAWN_TICKS: 2700,
  WIND_INTERVAL_TICKS: 1800,
  WIND_DURATION_TICKS: 300,
  WIND_WARN_TICKS: 120,
  WIND_SPEED: 2.0
};

export function round1(value) {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

export function round3(value) {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? 0 : rounded;
}

export function distXZ(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

export function dist3D(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

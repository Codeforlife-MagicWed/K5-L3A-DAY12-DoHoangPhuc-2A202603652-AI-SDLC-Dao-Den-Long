/**
 * Shared simulation configuration synchronized with game.contract.json.
 */

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
export const ISLAND_RADIUS = 40.0;
export const LANTERN_RING_RADIUS = 25.0;

export const TUNING = {
  player_speed: 7.0,
  carry_capacity: 5,
  lantern_cost: 4,
  lantern_count_night1: 5,
  pickup_radius: 2.0,
  interact_radius: 3.0,
  pulse_cost: 1,
  pulse_radius: 8.0,
  night1_duration_s: 180,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 3.0,
  pulse_push_m: 5.0,
  pulse_cooldown_s: 2.0,
  safe_radius: 6.0,
  shade_speed: 4.5,
  shade_hit_radius: 1.2,
  fall_enabled: false,
  score: {
    per_mote: 10,
    per_lantern: 100,
    per_stun: 25,
    per_second_left: 5,
    per_flame_left: 50
  }
};

export const FIREFLY_TYPES = {
  small: { key: "small", label: "Đom đóm nhỏ", value: 1, scale: 0.75, color: 0xffd266 },
  medium: { key: "medium", label: "Đom đóm vừa", value: 2, scale: 1.1, color: 0xffaa33 },
  large: { key: "large", label: "Đom đóm lớn", value: 3, scale: 1.5, color: 0xff7b1c }
};

export function round3(value) {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? 0 : rounded;
}

export function distXZ(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

export function createDefaultLanterns() {
  const lanterns = [];
  for (let i = 0; i < TUNING.lantern_count_night1; i++) {
    const angle = (i * 2 * Math.PI) / TUNING.lantern_count_night1;
    lanterns.push({
      id: `L${i + 1}`,
      pos: [
        round3(LANTERN_RING_RADIUS * Math.sin(angle)),
        0,
        round3(LANTERN_RING_RADIUS * Math.cos(angle))
      ],
      lit: false,
      deposited: 0
    });
  }
  return lanterns;
}

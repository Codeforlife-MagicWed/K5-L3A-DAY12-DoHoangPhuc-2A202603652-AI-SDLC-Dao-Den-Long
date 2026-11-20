/**
 * Deterministic 32-bit seeded PRNG (Mulberry32).
 */
export function createPRNG(seed) {
  let state = (Number(seed) >>> 0) || 1;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(min, max) {
    return min + next() * (max - min);
  }

  function pickIslandPoint(minRadius, maxRadius) {
    const angle = range(0, Math.PI * 2);
    const r = Math.sqrt(range(minRadius * minRadius, maxRadius * maxRadius));
    return [r * Math.sin(angle), 0, r * Math.cos(angle)];
  }

  return { next, range, pickIslandPoint };
}

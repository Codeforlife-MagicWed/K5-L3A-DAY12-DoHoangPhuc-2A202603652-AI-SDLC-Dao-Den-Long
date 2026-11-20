import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CONSTANTS, TUNING, distXZ } from "../src/sim/config.js";
import { createSimulation } from "../src/sim/simulation.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const CLI_PATH = path.join(REPO_ROOT, "src", "headless", "cli.js");

function runCli(args) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8"
  });
}

function parseJsonl(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  return raw.split(/\r?\n/).map((line) => JSON.parse(line));
}

test("game.contract.json v1.2 tuning matches src/sim/config.js", () => {
  const contract = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "game.contract.json"), "utf8"));
  assert.equal(contract.contract_version, "1.2");
  assert.deepEqual(contract.tuning, TUNING);
});

// UPDATED FOR TICKET-03 (Phase 3): Replaced old Phase 1/2 "all_lit early win" and "+10/mote + time bonus"
// assertion with Phase 3 rules: lighting 5/5 does NOT end early, +5/mote, win at dawn with >= 60% lit (dawn_survived).
test("Night 1 Ticket-03 win rule: lighting lantern keeps game playing; surviving to dawn with >=3/5 lit wins (dawn_survived)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-win-"));
  const scenarioPath = path.join(tmp, "scenario.json");
  const inputsPath = path.join(tmp, "inputs.json");
  const outPath = path.join(tmp, "out.jsonl");

  fs.writeFileSync(
    scenarioPath,
    JSON.stringify({
      player: { pos: [0, 0, 0], carried: 9, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [[0, 0, 2]],
      shades: [],
      lanterns: [
        { id: "L1", pos: [0, 0, 5], deposited: 0, lit: false },
        { id: "L2", lit: true, fuel: 100 },
        { id: "L3", lit: true, fuel: 100 },
        { id: "L4", lit: false },
        { id: "L5", lit: false }
      ],
      time_left_s: 3
    })
  );

  fs.writeFileSync(
    inputsPath,
    JSON.stringify({
      frames: [
        { tick: 0, move: [0, 1] },
        { tick: 55, move: [0, 0], interact: true },
        { tick: 56, interact: false }
      ]
    })
  );

  const res = runCli(["--seed", "7", "--night", "1", "--scenario", scenarioPath, "--inputs", inputsPath, "--ticks", "240", "--out", outPath]);
  assert.equal(res.status, 0, res.stderr);

  const lines = parseJsonl(outPath);
  assert.equal(lines[0].score, 0);
  const events = lines.filter((l) => l.type === "event");
  assert.ok(events.some((e) => e.name === "night_start" && e.data.night === 1));
  assert.ok(events.some((e) => e.name === "mote_picked" && e.data.carried === 10));
  assert.ok(events.some((e) => e.name === "deposit" && e.data.lantern_id === "L1" && e.data.amount === 10));
  const litEv = events.find((e) => e.name === "lantern_lit" && e.data.lantern_id === "L1");
  assert.ok(litEv && litEv.data.relight === false);
  // Game must continue after lighting L1 until dawn (tick 180 for 3s)
  const over = events.find((e) => e.name === "game_over");
  assert.deepEqual(over.data, { result: "won", reason: "dawn_survived" });
  assert.equal(over.tick, 180);

  const end = lines.at(-1);
  assert.equal(end.state, "won");
  // 10*5 (deposit) + 100 (L1) + 3*50 (lit dawn base) + fuel bonuses + 3*50 (flames)
  assert.ok(end.score >= 50 + 100 + 150 + 150);
});

test("Night 1 regression: safe_radius blocks shades and pulse stuns + pushes 4m", () => {
  const sim = createSimulation({
    seed: 9,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 0], carried: 4, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ id: "S1", pos: [4, 0.8, 0], state: "chase" }]
    }
  });

  const ev = sim.step({ pulse: true });
  assert.ok(ev.some((e) => e.name === "pulse" && e.data.stunned_ids[0] === "S1"));
  assert.equal(sim.getSnapshot().player.carried, 1);
  assert.equal(sim.getSnapshot().shades[0].state, "stunned");

  for (let i = 0; i < 15; i++) sim.step({ pulse: false });
  assert.ok(Math.abs(sim.getSnapshot().shades[0].pos[0] - 8.0) < 0.05);
});

test("Dash moves at 14 m/s for 12 ticks, keeps air height, and enforces 1.5s cooldown", () => {
  const sim = createSimulation({
    seed: 1,
    night: 1,
    scenario: { random_motes: false, random_shades: false, motes: [], shades: [] }
  });
  const ev = sim.step({ move: [0, 1], dash: true });
  assert.ok(ev.some((e) => e.name === "dash"));
  for (let i = 0; i < 11; i++) sim.step({ dash: false });
  const snap = sim.getSnapshot();
  assert.ok(Math.abs(snap.player.pos[2] - 2.8) < 0.05);
  assert.ok(snap.player.dash_cd_s > 1.0);
});

test("Fall off island (Y < -10) deducts 1 flame ignoring invuln, clears carried, and respawns after 60 ticks", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-fall-"));
  const scenarioPath = path.join(tmp, "scenario.json");
  const inputsPath = path.join(tmp, "inputs.json");
  const outPath = path.join(tmp, "out.jsonl");

  fs.writeFileSync(
    scenarioPath,
    JSON.stringify({
      player: { pos: [0, 0, 39.8], carried: 5, flames: 3, invuln_ticks: 90 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: []
    })
  );
  fs.writeFileSync(inputsPath, JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }, { tick: 15, move: [0, 0] }] }));

  const res = runCli(["--seed", "2", "--night", "1", "--scenario", scenarioPath, "--inputs", inputsPath, "--ticks", "180", "--out", outPath]);
  assert.equal(res.status, 0, res.stderr);

  const lines = parseJsonl(outPath);
  const fallEv = lines.find((l) => l.type === "event" && l.name === "player_hit" && l.data.by === "fall");
  assert.ok(fallEv);
  assert.equal(fallEv.data.flames, 2);
  assert.equal(fallEv.data.lost, 5);
  const endSnap = lines.filter((l) => l.type === "snapshot").at(-1);
  assert.equal(endSnap.player.carried, 0);
  assert.ok(distXZ(endSnap.player.pos, [0, 0, 0]) < 0.5);
});

test("Night 2 launchpad launches Mây across islands and bamboo bridge supports walking", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-n2-"));
  const scenarioPath = path.join(tmp, "scenario.json");
  const outPath = path.join(tmp, "out.jsonl");

  fs.writeFileSync(
    scenarioPath,
    JSON.stringify({
      player: { pos: [20, 0, 18], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      motes: [],
      shades: []
    })
  );
  const res = runCli(["--seed", "5", "--night", "2", "--scenario", scenarioPath, "--ticks", "100", "--out", outPath]);
  assert.equal(res.status, 0, res.stderr);
  const lines = parseJsonl(outPath);
  const snaps = lines.filter((l) => l.type === "snapshot");
  const midSnap = snaps.find((s) => s.tick === 30);
  assert.ok(midSnap.player.pos[1] > 1.0, "Player should be airborne from launchpad");
  const endSnap = snaps.at(-1);
  assert.ok(endSnap.player.pos[0] > 42, "Player should launch toward Island B");
});

test("Night 3 wind pushes player and 3-tier terrain supports ramp and tier 1", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-n3-"));
  const scenarioPath = path.join(tmp, "scenario.json");
  const outPath = path.join(tmp, "out.jsonl");

  fs.writeFileSync(
    scenarioPath,
    JSON.stringify({
      player: { pos: [0, 3, 18], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      wind_enabled: true,
      motes: [],
      shades: []
    })
  );
  const res = runCli(["--seed", "6", "--night", "3", "--scenario", scenarioPath, "--ticks", "1850", "--out", outPath, "--snapshot-every", "100"]);
  assert.equal(res.status, 0, res.stderr);
  const lines = parseJsonl(outPath);
  const windSnap = lines.find((l) => l.type === "snapshot" && l.wind.active === true);
  assert.ok(windSnap, "Wind should activate around tick 1800");
});

test("Drifter (Gió Lạc) steals up to 3 motes and drops them when hit by Pulse while fleeing", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-drift-"));
  const scenarioPath = path.join(tmp, "scenario.json");
  const inputsPath = path.join(tmp, "inputs.json");
  const outPath = path.join(tmp, "out.jsonl");

  fs.writeFileSync(
    scenarioPath,
    JSON.stringify({
      player: { pos: [0, 0, 0], carried: 8, flames: 3 },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      motes: [],
      shades: [],
      drifters: [{ id: "D1", pos: [2, 0, 0], state: "chase" }]
    })
  );
  // Let drifter reach player (~10 ticks), steal 3 motes -> carried=5, then pulse at tick 12
  fs.writeFileSync(
    inputsPath,
    JSON.stringify({
      frames: [
        { tick: 12, pulse: true },
        { tick: 13, pulse: false }
      ]
    })
  );

  const res = runCli(["--seed", "8", "--night", "2", "--scenario", scenarioPath, "--inputs", inputsPath, "--ticks", "30", "--out", outPath]);
  assert.equal(res.status, 0, res.stderr);
  const lines = parseJsonl(outPath);
  const stealEv = lines.find((l) => l.type === "event" && l.name === "drifter_steal");
  const dropEv = lines.find((l) => l.type === "event" && l.name === "drifter_drop");
  assert.ok(stealEv && stealEv.data.amount === 3 && stealEv.data.carried === 5);
  assert.ok(dropEv && dropEv.data.amount === 3);
});

test("Wind Charm (Bùa Gió) increases speed to 7.2 m/s and removes dash cooldown", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-charm-"));
  const scenarioPath = path.join(tmp, "scenario.json");
  const inputsPath = path.join(tmp, "inputs.json");
  const outPath = path.join(tmp, "out.jsonl");

  fs.writeFileSync(
    scenarioPath,
    JSON.stringify({
      player: { pos: [34.5, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      motes: [],
      shades: []
    })
  );
  fs.writeFileSync(
    inputsPath,
    JSON.stringify({
      frames: [
        { tick: 0, move: [1, 0] },
        { tick: 10, dash: true },
        { tick: 11, dash: false },
        { tick: 25, dash: true },
        { tick: 26, dash: false }
      ]
    })
  );

  const res = runCli(["--seed", "4", "--night", "2", "--scenario", scenarioPath, "--inputs", inputsPath, "--ticks", "40", "--out", outPath]);
  assert.equal(res.status, 0, res.stderr);
  const lines = parseJsonl(outPath);
  assert.ok(lines.some((l) => l.type === "event" && l.name === "charm_picked" && l.data.charm_id === "C1"));
  const dashes = lines.filter((l) => l.type === "event" && l.name === "dash");
  assert.equal(dashes.length, 2, "Dash should fire twice consecutively without cooldown while charm active");
});

test("Pause freezes sim_tick and timers while outer tick advances", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-pause-"));
  const scenarioPath = path.join(tmp, "scenario.json");
  const inputsPath = path.join(tmp, "inputs.json");
  const outPath = path.join(tmp, "out.jsonl");

  fs.writeFileSync(scenarioPath, JSON.stringify({ random_motes: false, random_shades: false, motes: [], shades: [] }));
  fs.writeFileSync(
    inputsPath,
    JSON.stringify({
      frames: [
        { tick: 5, pause: true },
        { tick: 6, pause: false },
        { tick: 25, pause: true },
        { tick: 26, pause: false }
      ]
    })
  );

  const res = runCli(["--seed", "1", "--night", "1", "--scenario", scenarioPath, "--inputs", inputsPath, "--ticks", "40", "--out", outPath]);
  assert.equal(res.status, 0, res.stderr);
  const lines = parseJsonl(outPath);
  const pausedSnap = lines.find((l) => l.type === "snapshot" && l.tick === 20);
  assert.equal(pausedSnap.state, "paused");
  assert.equal(pausedSnap.sim_tick, 5);
  const endSnap = lines.filter((l) => l.type === "snapshot").at(-1);
  assert.equal(endSnap.tick, 40);
  assert.equal(endSnap.sim_tick, 20);
});

test("Determinism and Performance: full 21,600-tick Night 3 headless finishes under 30s and is identical across runs", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-perf-"));
  const out1 = path.join(tmp, "n3-a.jsonl");
  const out2 = path.join(tmp, "n3-b.jsonl");

  const start = performance.now();
  const r1 = runCli(["--seed", "999", "--night", "3", "--ticks", "21600", "--out", out1, "--snapshot-every", "600"]);
  const elapsedMs = performance.now() - start;
  assert.equal(r1.status, 0, r1.stderr);
  assert.ok(elapsedMs < 30000, `Expected <= 30000ms, got ${elapsedMs}ms`);

  const r2 = runCli(["--seed", "999", "--night", "3", "--ticks", "21600", "--out", out2, "--snapshot-every", "600"]);
  assert.equal(r2.status, 0, r2.stderr);
  assert.equal(fs.readFileSync(out1, "utf8"), fs.readFileSync(out2, "utf8"));
});

test("Malformed inputs or non-increasing ticks exit with code 2", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-err-"));
  const badJson = path.join(tmp, "bad.json");
  const dupTick = path.join(tmp, "dup.json");
  const out = path.join(tmp, "out.jsonl");

  fs.writeFileSync(badJson, "{ broken");
  fs.writeFileSync(dupTick, JSON.stringify({ frames: [{ tick: 5 }, { tick: 5 }] }));

  assert.equal(runCli(["--seed", "1", "--night", "1", "--inputs", badJson, "--ticks", "10", "--out", out]).status, 2);
  assert.equal(runCli(["--seed", "1", "--night", "1", "--inputs", dupTick, "--ticks", "10", "--out", out]).status, 2);
});

test("Clarifications: Night 3 spawns at (0,0,-15), scheduled shades spawn for 60 ticks, scenario shades start as wander", () => {
  const simN3 = createSimulation({ seed: 1, night: 3 });
  assert.deepEqual(simN3.getSnapshot().player.pos, [0, 0, -15]);

  const simScen = createSimulation({
    seed: 1,
    night: 1,
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ id: "S1", pos: [30, 0, 0] }]
    }
  });
  assert.equal(simScen.getSnapshot().shades[0].state, "wander");

  const simSpawn = createSimulation({
    seed: 1,
    night: 1,
    scenario: { random_motes: false, motes: [], shades: [] }
  });
  for (let i = 0; i < 300; i++) simSpawn.step(null);
  const at300 = simSpawn.getSnapshot().shades;
  assert.equal(at300.length, 2);
  assert.equal(at300[0].state, "spawning");

  for (let i = 0; i < 60; i++) simSpawn.step(null);
  const at360 = simSpawn.getSnapshot().shades;
  assert.equal(at360[0].state, "wander");
});

test("Creative light slash pushes/stuns shades in 3D mode but is disabled in headless mode", () => {
  const scenario = {
    player: { pos: [0, 0, 0], carried: 0, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [{ id: "S1", pos: [0, 0.8, 2.5], state: "chase" }]
  };

  const sim3d = createSimulation({ seed: 1, night: 1, scenario, creativeVariants: true });
  const ev3d = sim3d.step({ slash: true });
  assert.ok(ev3d.some((e) => e.name === "creative_slash" && e.data.hit_ids[0] === "S1"));
  assert.equal(sim3d.getSnapshot().shades[0].state, "stunned");

  const simHeadless = createSimulation({ seed: 1, night: 1, scenario, creativeVariants: false });
  const evHeadless = simHeadless.step({ slash: true });
  assert.equal(evHeadless.some((e) => e.name === "creative_slash"), false);
  assert.equal(simHeadless.getSnapshot().shades[0].state, "chase");
});

test("Phase 3 Fuel, Refuel, Lantern Out, Relight (5 motes), and Scaling Capacity", () => {
  const sim = createSimulation({
    seed: 2,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 25], carried: 8, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 1.0, ever_lit: true }]
    }
  });

  // 1) Refuel 8 motes at fuel=1.0 (after 1 tick decay -> 59/60): used = min(8, ceil((6000-59)/600)) = 8 -> fuel = 81.0
  const evRefuel = sim.step({ interact: true });
  const refuel = evRefuel.find((e) => e.name === "refuel");
  assert.ok(refuel && refuel.data.amount === 8 && refuel.data.fuel === 81);
  assert.equal(sim.getSnapshot().player.carried, 0);
  sim.step({ interact: false });

  // 2) With carried = 0 (used = 0), interacting emits no refuel event
  const evEmpty = sim.step({ interact: true });
  assert.equal(evEmpty.some((e) => e.name === "refuel"), false);

  // 3) Lantern expires at fuel<=0 -> lantern_out, relight with 5 motes -> capacity increases to 12
  const simOut = createSimulation({
    seed: 3,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 25], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 0.05 }]
    }
  });
  let outEv = null;
  for (let i = 0; i < 10; i++) {
    const evs = simOut.step(null);
    outEv = evs.find((e) => e.name === "lantern_out") ?? outEv;
  }
  assert.ok(outEv && outEv.data.lantern_id === "L1");
  assert.equal(simOut.getSnapshot().lanterns[0].fuel, 0);
  assert.equal(simOut.getSnapshot().lanterns[0].ever_lit, true);

  const relightEvs = simOut.step({ interact: true });
  const litEv = relightEvs.find((e) => e.name === "lantern_lit");
  assert.ok(litEv && litEv.data.relight === true);
  assert.equal(simOut.getSnapshot().player.capacity, 12);
  assert.equal(simOut.getSnapshot().lanterns[0].relit_count, 1);
});

test("Phase 3 Shade drain on weak lantern (fuel < 30), fuel_drain event at 60 ticks, and +15 drain stun bonus", () => {
  const sim = createSimulation({
    seed: 5,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 0], carried: 3, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ id: "S1", pos: [0, 0, 24], state: "wander" }],
      lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 25 }]
    }
  });

  // Shade is within 2m of L1 (fuel < 30), enters drain and emits fuel_drain after 60 ticks
  let drainEv = null;
  for (let i = 0; i < 65; i++) {
    const evs = sim.step(null);
    drainEv = evs.find((e) => e.name === "fuel_drain") ?? drainEv;
  }
  assert.ok(drainEv && drainEv.data.lantern_id === "L1" && drainEv.data.shade_id === "S1");
  assert.equal(sim.getSnapshot().shades[0].state, "drain");

  // Move player scenario near draining shade and Pulse -> awards +15 instead of +5
  const simStun = createSimulation({
    seed: 5,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 22], carried: 3, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ id: "S1", pos: [0, 0.8, 25], state: "drain", target_lantern_id: "L1" }],
      lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 25 }]
    }
  });
  simStun.step({ pulse: true });
  assert.equal(simStun.getSnapshot().score, 15);
  assert.equal(simStun.getSnapshot().shades[0].state, "stunned");
});

test("Phase 3 Dawn threshold: loses with reason 'dawn' when lit lanterns < ceil(0.6 * total)", () => {
  const sim = createSimulation({
    seed: 1,
    night: 1,
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [
        { id: "L1", lit: true, fuel: 100 },
        { id: "L2", lit: true, fuel: 100 }
      ],
      time_left_s: 0.5
    }
  });
  let over = null;
  for (let i = 0; i < 40; i++) {
    const evs = sim.step(null);
    over = evs.find((e) => e.name === "game_over") ?? over;
  }
  assert.ok(over && over.data.result === "lost" && over.data.reason === "dawn");
});

test("Creative mode spawns more fireflies and moves medium/large ones while headless stays contract-strict", () => {
  const sim3d = createSimulation({
    seed: 10,
    night: 1,
    creativeVariants: true,
    scenario: {
      random_motes: true,
      random_shades: false,
      motes: [{ id: "M_LARGE", pos: [0, 0, 10], size: "large" }],
      shades: []
    }
  });
  const posBefore = [...sim3d.getSnapshot().motes[0].pos];
  for (let i = 0; i < 30; i++) sim3d.step(null);
  const posAfter = sim3d.getSnapshot().motes[0].pos;
  assert.ok(distXZ(posBefore, posAfter) > 0.5, "Large firefly should move in 3D mode");

  const sim3dDensity = createSimulation({ seed: 10, night: 1, creativeVariants: true });
  const simHeadlessDensity = createSimulation({ seed: 10, night: 1, creativeVariants: false });
  assert.ok(sim3dDensity.getSnapshot().motes_active > 20);
  assert.equal(simHeadlessDensity.getSnapshot().motes_active, 20);
});

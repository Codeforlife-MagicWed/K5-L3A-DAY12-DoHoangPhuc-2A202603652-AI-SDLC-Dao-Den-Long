import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { TUNING, distXZ } from "../src/sim/config.js";
import { createSimulation } from "../src/sim/simulation.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const CLI_PATH = path.join(REPO_ROOT, "src", "headless", "cli.js");

function runCli(args, tempDir) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8"
  });
  return result;
}

function parseJsonl(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  return raw.split(/\r?\n/).map((line) => JSON.parse(line));
}

test("game.contract.json tuning matches src/sim/config.js", () => {
  const contract = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "game.contract.json"), "utf8"));
  assert.equal(contract.contract_version, "1.0");
  assert.deepEqual(contract.tuning, TUNING);
});

test("Headless tick model, movement rotation, and vector normalization", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-move-"));
  const scenarioPath = path.join(tmp, "scenario.json");
  const inputsPath = path.join(tmp, "inputs.json");
  const outPath = path.join(tmp, "out.jsonl");

  fs.writeFileSync(
    scenarioPath,
    JSON.stringify({
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: []
    })
  );
  fs.writeFileSync(
    inputsPath,
    JSON.stringify({
      frames: [
        { tick: 0, move: [0, 1], cam_yaw_deg: 0 },
        { tick: 60, move: [1, 1], cam_yaw_deg: 0 }
      ]
    })
  );

  const res = runCli(
    ["--seed", "1", "--night", "1", "--scenario", scenarioPath, "--inputs", inputsPath, "--ticks", "120", "--out", outPath, "--snapshot-every", "60"],
    tmp
  );
  assert.equal(res.status, 0, res.stderr);

  const lines = parseJsonl(outPath);
  const snaps = lines.filter((l) => l.type === "snapshot");
  assert.equal(snaps.length, 3);
  assert.equal(snaps[0].tick, 0);
  assert.deepEqual(snaps[0].player.pos, [0, 0, 0]);

  assert.equal(snaps[1].tick, 60);
  assert.ok(Math.abs(snaps[1].player.pos[2] - TUNING.player_speed) < 0.01);

  assert.equal(snaps[2].tick, 120);
  const expectedDiag = TUNING.player_speed / Math.SQRT2;
  assert.ok(Math.abs(snaps[2].player.pos[0] - expectedDiag) < 0.02);
  assert.ok(Math.abs(snaps[2].player.pos[2] - (TUNING.player_speed + expectedDiag)) < 0.02);

  const end = lines.at(-1);
  assert.equal(end.type, "end");
  assert.equal(end.ticks, 120);
});

test("Pickup mote, deposit, light final lantern, and win without scenario bonus", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-win-"));
  const scenarioPath = path.join(tmp, "scenario.json");
  const inputsPath = path.join(tmp, "inputs.json");
  const outPath = path.join(tmp, "out.jsonl");

  fs.writeFileSync(
    scenarioPath,
    JSON.stringify({
      player: { pos: [0, 0, 0], carried: 3, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [[0, 0, 2]],
      shades: [],
      lanterns: [
        { id: "L1", pos: [0, 0, 5], deposited: 0, lit: false },
        { id: "L2", lit: true },
        { id: "L3", lit: true },
        { id: "L4", lit: true },
        { id: "L5", lit: true }
      ],
      time_left_s: 100
    })
  );

  // Move +Z for ~45 ticks (reach z=5.25), then interact
  fs.writeFileSync(
    inputsPath,
    JSON.stringify({
      frames: [
        { tick: 0, move: [0, 1] },
        { tick: 45, move: [0, 0], interact: true },
        { tick: 46, interact: false }
      ]
    })
  );

  const res = runCli(
    ["--seed", "7", "--night", "1", "--scenario", scenarioPath, "--inputs", inputsPath, "--ticks", "120", "--out", outPath],
    tmp
  );
  assert.equal(res.status, 0, res.stderr);

  const lines = parseJsonl(outPath);
  assert.equal(lines[0].score, 0, "Scenario setup must not award score");

  const events = lines.filter((l) => l.type === "event");
  assert.ok(events.some((e) => e.name === "mote_picked" && e.data.carried === 4));
  assert.ok(events.some((e) => e.name === "deposit" && e.data.lantern_id === "L1" && e.data.amount === 4 && e.data.deposited === 4));
  assert.ok(events.some((e) => e.name === "lantern_lit" && e.data.lantern_id === "L1"));
  assert.ok(events.some((e) => e.name === "game_over" && e.data.result === "won" && e.data.reason === "all_lit"));

  const end = lines.at(-1);
  assert.equal(end.state, "won");
});

test("Safe radius blocks shades around lit lanterns", () => {
  const sim = createSimulation({
    seed: 5,
    scenario: {
      player: { pos: [0, 0, 25], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ id: "S1", pos: [0, 1, 35] }],
      lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, deposited: 4 }]
    }
  });

  for (let i = 0; i < 180; i++) sim.step(null);
  const snap = sim.getSnapshot();
  const l1 = snap.lanterns.find((l) => l.id === "L1");
  const s1 = snap.shades[0];
  assert.ok(distXZ(s1.pos, l1.pos) >= TUNING.safe_radius - 0.01);
  assert.equal(snap.player.flames, 3);
});

test("Pulse consumes carried light, pushes and stuns shades, and respects cooldown", () => {
  const sim = createSimulation({
    seed: 9,
    scenario: {
      player: { pos: [0, 0, 0], carried: 2, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ id: "S1", pos: [5, 1, 0] }]
    }
  });

  const ev1 = sim.step({ pulse: true });
  const pulseEv = ev1.find((e) => e.name === "pulse");
  assert.ok(pulseEv);
  assert.deepEqual(pulseEv.data.stunned_ids, ["S1"]);

  const snap1 = sim.getSnapshot();
  assert.equal(snap1.player.carried, 2 - TUNING.pulse_cost);
  assert.equal(snap1.shades[0].state, "stunned");
  assert.ok(snap1.shades[0].pos[0] >= 5 + TUNING.pulse_push_m - 0.01);

  // Immediately attempting pulse again during cooldown should not consume light
  sim.step({ pulse: false });
  const ev2 = sim.step({ pulse: true });
  assert.equal(ev2.some((e) => e.name === "pulse"), false);
  assert.equal(sim.getSnapshot().player.carried, 2 - TUNING.pulse_cost);
});

test("Shade hit reduces flames, drops carried light, and triggers no_flames loss", () => {
  const sim = createSimulation({
    seed: 3,
    scenario: {
      player: { pos: [0, 0, 0], carried: 4, flames: 1 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ id: "S1", pos: [0.5, 1, 0] }]
    }
  });

  const events = sim.step(null);
  const hit = events.find((e) => e.name === "player_hit");
  assert.ok(hit);
  assert.equal(hit.data.by, "shade");
  assert.equal(hit.data.flames, 0);
  assert.equal(hit.data.dropped, 2);

  const over = events.find((e) => e.name === "game_over");
  assert.deepEqual(over.data, { result: "lost", reason: "no_flames" });
});

test("Dawn timeout ends game as lost", () => {
  const sim = createSimulation({
    seed: 1,
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      time_left_s: 0.5
    }
  });
  let events = [];
  for (let i = 0; i < 40; i++) {
    events = sim.step(null);
    if (sim.getSnapshot().state !== "playing") break;
  }
  assert.equal(sim.getSnapshot().state, "lost");
  assert.deepEqual(events.at(-1).data, { result: "lost", reason: "dawn" });
});

test("Determinism: identical seed, scenario, and inputs yield byte-for-byte identical JSONL", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-det-"));
  const out1 = path.join(tmp, "run1.jsonl");
  const out2 = path.join(tmp, "run2.jsonl");

  const r1 = runCli(["--seed", "12345", "--night", "1", "--ticks", "600", "--out", out1], tmp);
  const r2 = runCli(["--seed", "12345", "--night", "1", "--ticks", "600", "--out", out2], tmp);
  assert.equal(r1.status, 0, r1.stderr);
  assert.equal(r2.status, 0, r2.stderr);
  assert.equal(fs.readFileSync(out1, "utf8"), fs.readFileSync(out2, "utf8"));
});

test("Malformed inputs or non-increasing ticks exit with code 2", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddl-err-"));
  const badJson = path.join(tmp, "bad.json");
  const dupTick = path.join(tmp, "dup.json");
  const out = path.join(tmp, "out.jsonl");

  fs.writeFileSync(badJson, "{ not json");
  fs.writeFileSync(dupTick, JSON.stringify({ frames: [{ tick: 5 }, { tick: 5 }] }));

  const r1 = runCli(["--seed", "1", "--night", "1", "--inputs", badJson, "--ticks", "10", "--out", out], tmp);
  assert.equal(r1.status, 2);

  const r2 = runCli(["--seed", "1", "--night", "1", "--inputs", dupTick, "--ticks", "10", "--out", out], tmp);
  assert.equal(r2.status, 2);
});

test("Creative firefly sizes work in 3D mode while headless keeps contract value 1", () => {
  const sim3d = createSimulation({
    seed: 11,
    creativeVariants: true,
    scenario: {
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [{ id: "M1", pos: [0, 0, 1], size: "large" }],
      shades: []
    }
  });
  sim3d.step(null);
  assert.equal(sim3d.getSnapshot().player.carried, 3);

  const simHeadless = createSimulation({
    seed: 11,
    creativeVariants: false,
    scenario: {
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [{ id: "M1", pos: [0, 0, 1], size: "large" }],
      shades: []
    }
  });
  simHeadless.step(null);
  assert.equal(simHeadless.getSnapshot().player.carried, 1);
});

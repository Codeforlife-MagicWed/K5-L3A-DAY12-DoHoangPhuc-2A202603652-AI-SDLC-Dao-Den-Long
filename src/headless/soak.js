import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPRNG } from "../sim/prng.js";
import { createSimulation } from "../sim/simulation.js";

function parseArgs(argv) {
  const args = { seed: 7, nights: 10, outPath: "soak.json" };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--seed":
        args.seed = Number(argv[++i]);
        break;
      case "--nights":
        args.nights = Number(argv[++i]);
        break;
      case "--out":
        args.outPath = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  if (!Number.isInteger(args.seed)) throw new Error("Invalid --seed");
  if (!Number.isInteger(args.nights) || args.nights <= 0) throw new Error("Invalid --nights");
  return args;
}

function getRssMb() {
  return Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;
}

export function runSoak(argv) {
  const args = parseArgs(argv);
  // Warm up V8 JIT across all 3 night paths before taking Night 1 baseline RSS
  for (const n of [1, 2, 3]) {
    let warm = createSimulation({ seed: args.seed, night: n, creativeVariants: false });
    for (let w = 0; w < 1800; w++) warm.step(null);
    warm = null;
  }

  const startTime = performance.now();
  const results = [];
  let crashes = 0;
  let memStartMb = 0;
  let memEndMb = 0;

  for (let i = 1; i <= args.nights; i++) {
    const night = ((i - 1) % 3) + 1;
    const nightSeed = args.seed + i;
    const prng = createPRNG(nightSeed * 131 + 17);
    let sim = createSimulation({ seed: nightSeed, night, creativeVariants: false });
    if (i === 1) memStartMb = getRssMb();

    let moveDir = [0, 1];
    let tick = 0;
    const maxTicks = night === 1 ? 240 * 60 : night === 2 ? 270 * 60 : 300 * 60;

    try {
      while (tick < maxTicks + 60) {
        const snap = sim.getSnapshot();
        if (snap.state === "won" || snap.state === "lost") {
          results.push(snap.state);
          break;
        }
        if (tick % 30 === 0) {
          const angle = prng.range(0, Math.PI * 2);
          moveDir = [Math.cos(angle), Math.sin(angle)];
        }
        sim.step({
          move: moveDir,
          cam_yaw_deg: 0,
          jump: prng.next() < 0.05,
          dash: prng.next() < 0.03,
          pulse: prng.next() < 0.02,
          interact: prng.next() < 0.1
        });
        tick++;
      }
      if (results.length < i) {
        const end = sim.getSnapshot();
        results.push(end.state === "won" ? "won" : "lost");
      }
    } catch {
      crashes++;
      results.push("crash");
    }

    sim = null;
    if (globalThis.gc) globalThis.gc();
    if (i === args.nights) memEndMb = getRssMb();
  }

  const output = {
    nights: args.nights,
    crashes,
    results,
    mem_start_mb: memStartMb,
    mem_end_mb: memEndMb,
    duration_s: Math.round(((performance.now() - startTime) / 1000) * 100) / 100
  };

  fs.mkdirSync(path.dirname(path.resolve(args.outPath)), { recursive: true });
  fs.writeFileSync(args.outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  return output;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    runSoak(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}

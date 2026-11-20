import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSimulation } from "../sim/simulation.js";
import { ContractInputError, validateInputs } from "../sim/validators.js";

function parseArgs(argv) {
  const args = { snapshotEvery: 10 };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case "--seed":
        args.seed = Number(next);
        i++;
        break;
      case "--night":
        args.night = Number(next);
        i++;
        break;
      case "--scenario":
        args.scenarioPath = next;
        i++;
        break;
      case "--inputs":
        args.inputsPath = next;
        i++;
        break;
      case "--ticks":
        args.ticks = Number(next);
        i++;
        break;
      case "--out":
        args.outPath = next;
        i++;
        break;
      case "--snapshot-every":
        args.snapshotEvery = Number(next);
        i++;
        break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
  }

  if (!Number.isInteger(args.seed)) throw new Error("Missing or invalid --seed <int>");
  if (args.night !== 1) throw new Error("Invalid or unsupported --night (expected 1)");
  if (!Number.isInteger(args.ticks) || args.ticks < 0) throw new Error("Missing or invalid --ticks <int>");
  if (!args.outPath) throw new Error("Missing --out <file.jsonl>");
  if (!Number.isInteger(args.snapshotEvery) || args.snapshotEvery <= 0) {
    throw new Error("Invalid --snapshot-every <int>");
  }
  return args;
}

function readJsonFile(filePath, label) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new Error(`Cannot read ${label} file '${filePath}': ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new ContractInputError(`Malformed JSON in ${label} file '${filePath}': ${err.message}`);
  }
}

export function runHeadless(argv) {
  const args = parseArgs(argv);
  const scenario = args.scenarioPath ? readJsonFile(args.scenarioPath, "scenario") : null;
  const inputsJson = args.inputsPath ? readJsonFile(args.inputsPath, "inputs") : null;
  const frames = validateInputs(inputsJson);

  const frameMap = new Map(frames.map((f) => [f.tick, f]));
  const sim = createSimulation({ seed: args.seed, scenario, creativeVariants: false });

  const lines = [];
  lines.push(JSON.stringify(sim.getSnapshot()));

  for (let k = 0; k < args.ticks; k++) {
    const snapBefore = sim.getSnapshot();
    if (snapBefore.state !== "playing") break;

    const input = frameMap.get(k) ?? null;
    const events = sim.step(input);
    for (const ev of events) {
      lines.push(JSON.stringify(ev));
    }

    const snapAfter = sim.getSnapshot();
    if ((k + 1) % args.snapshotEvery === 0) {
      lines.push(JSON.stringify(snapAfter));
    }
    if (snapAfter.state !== "playing") break;
  }

  lines.push(JSON.stringify(sim.getEndLine()));

  fs.mkdirSync(path.dirname(path.resolve(args.outPath)), { recursive: true });
  fs.writeFileSync(args.outPath, `${lines.join("\n")}\n`, "utf8");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    runHeadless(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(err instanceof ContractInputError ? err.exitCode : 1);
  }
}

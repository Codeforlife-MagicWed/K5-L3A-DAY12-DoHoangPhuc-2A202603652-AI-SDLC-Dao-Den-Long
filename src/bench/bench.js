import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { startAppServer } from "../server/run.js";

function parseArgs(argv) {
  const args = { seed: 42, duration: 30, outPath: "bench.json" };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--seed":
        args.seed = Number(argv[++i]);
        break;
      case "--duration":
        args.duration = Number(argv[++i]);
        break;
      case "--out":
        args.outPath = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  if (!Number.isInteger(args.seed)) throw new Error("Invalid --seed");
  if (!Number.isFinite(args.duration) || args.duration <= 0) throw new Error("Invalid --duration");
  return args;
}

async function launchBrowser() {
  const commonArgs = [
    "--window-size=1280,720",
    "--disable-gpu-vsync",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--no-sandbox"
  ];
  try {
    return await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      args: commonArgs
    });
  } catch {
    return await puppeteer.launch({
      headless: "new",
      defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      args: commonArgs
    });
  }
}

export async function runBenchmark(argv) {
  const args = parseArgs(argv);
  const startWall = performance.now();
  const { server, port } = await startAppServer({ port: 0 });
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    const url = `http://127.0.0.1:${port}/?bench=1&seed=${args.seed}&duration=${args.duration}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const timeoutMs = (args.duration + 25) * 1000;
    await page.waitForFunction(() => Boolean(window.__BENCH_RESULT__), { timeout: timeoutMs });
    const result = await page.evaluate(() => window.__BENCH_RESULT__);

    const benchJson = {
      contract_version: "1.3",
      avg_fps: result.avg_fps,
      p1_low_fps: result.p1_low_fps,
      frame_ms_p95: result.frame_ms_p95,
      frames: result.frames,
      load_ms: Math.round(result.load_ms ?? performance.now() - startWall),
      peak_mem_mb: result.peak_mem_mb ?? null,
      vsync_off: true,
      renderer: result.renderer,
      os: `${os.platform()} ${os.release()} (${os.arch()})`
    };

    fs.mkdirSync(path.dirname(path.resolve(args.outPath)), { recursive: true });
    fs.writeFileSync(args.outPath, `${JSON.stringify(benchJson, null, 2)}\n`, "utf8");
    return benchJson;
  } finally {
    await browser.close();
    server.close();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runBenchmark(process.argv.slice(2))
    .then(() => process.exit(0))
    .catch((err) => {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    });
}

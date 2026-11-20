import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addLeaderboardEntry, readLeaderboard } from "./leaderboard.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST_DIR = path.join(REPO_ROOT, "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function parseArgs(argv) {
  const args = { port: Number(process.env.PORT) || 4173 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--export-leaderboard") {
      args.exportPath = argv[++i];
    } else if (argv[i] === "--port") {
      args.port = Number(argv[++i]);
    }
  }
  return args;
}

function sendJson(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

export function startAppServer({ port = 4173 } = {}) {
  if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
    throw new Error("dist/ not found. Run 'npm run build' first.");
  }

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, "http://127.0.0.1");

    if (reqUrl.pathname === "/api/leaderboard") {
      if (req.method === "GET") {
        return sendJson(res, 200, readLeaderboard());
      }
      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body || "{}");
            const updated = addLeaderboardEntry(payload);
            return sendJson(res, 200, updated);
          } catch (err) {
            return sendJson(res, 400, { error: err.message });
          }
        });
        return;
      }
    }

    const relPath = reqUrl.pathname === "/" ? "index.html" : reqUrl.pathname.replace(/^\/+/, "");
    const safePath = path.normalize(path.join(DIST_DIR, relPath));
    if (!safePath.startsWith(DIST_DIR) || !fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const ext = path.extname(safePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream" });
    fs.createReadStream(safePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.exportPath) {
    const data = readLeaderboard();
    fs.mkdirSync(path.dirname(path.resolve(args.exportPath)), { recursive: true });
    fs.writeFileSync(args.exportPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    process.exit(0);
  } else {
    startAppServer({ port: args.port })
      .then(({ port }) => {
        console.log(`Đảo Đèn Lồng đang chạy tại: http://localhost:${port}`);
      })
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  }
}

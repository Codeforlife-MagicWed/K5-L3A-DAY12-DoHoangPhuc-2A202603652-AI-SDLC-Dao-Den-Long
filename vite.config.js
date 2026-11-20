import { defineConfig } from "vite";
import { addLeaderboardEntry, readLeaderboard } from "./src/server/leaderboard.js";

function leaderboardDevPlugin() {
  return {
    name: "dao-den-long-leaderboard-api",
    configureServer(server) {
      server.middlewares.use("/api/leaderboard", (req, res, next) => {
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(readLeaderboard()));
          return;
        }
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            try {
              const payload = JSON.parse(body || "{}");
              const updated = addLeaderboardEntry(payload);
              res.statusCode = 200;
              res.end(JSON.stringify(updated));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [leaderboardDevPlugin()]
});

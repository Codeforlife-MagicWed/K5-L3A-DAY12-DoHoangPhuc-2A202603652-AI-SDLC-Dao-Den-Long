import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const NAME_REGEX = /^[\p{L}0-9_]{3,12}$/u;

export function getLeaderboardPath() {
  if (process.env.DDL_LEADERBOARD_PATH) {
    return path.resolve(process.env.DDL_LEADERBOARD_PATH);
  }
  return path.join(os.homedir(), ".dao-den-long", "leaderboard.json");
}

export function formatIsoWithTimezone(date = new Date()) {
  const tzOffsetMin = -date.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(tzOffsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${hh}:${mm}`;
}

export function sortLeaderboard(entries) {
  return [...entries]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.achieved_at).getTime() - new Date(b.achieved_at).getTime();
    })
    .slice(0, 10);
}

export function readLeaderboard(filePath = getLeaderboardPath()) {
  try {
    if (!fs.existsSync(filePath)) return { entries: [] };
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return { entries: sortLeaderboard(entries) };
  } catch {
    return { entries: [] };
  }
}

export function addLeaderboardEntry(entry, filePath = getLeaderboardPath()) {
  const cleanName = typeof entry.name === "string" ? entry.name.trim() : "";
  if (!NAME_REGEX.test(cleanName)) {
    throw new Error("Tên phải dài 3–12 ký tự ([A-Za-z0-9_] hoặc chữ có dấu, không khoảng trắng)");
  }
  const current = readLeaderboard(filePath).entries;
  const record = {
    name: cleanName,
    score: Math.max(0, Math.floor(Number(entry.score) || 0)),
    nights_won: Math.min(3, Math.max(0, Math.floor(Number(entry.nights_won) || 0))),
    achieved_at: entry.achieved_at ?? formatIsoWithTimezone(),
    seed: Number.isInteger(entry.seed) ? entry.seed : Number(entry.seed) || 0
  };
  const next = sortLeaderboard([...current, record]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ entries: next }, null, 2)}\n`, "utf8");
  return { entries: next };
}

---
name: verify-contract
description: Quy trình kiểm chứng Test Contract v1.3 (Benchmark 3D, Soak test, Leaderboard cục bộ, Accessibility, Nhiên liệu & Bình minh), regression và bằng chứng trước khi gắn tag phase-4 / v1.0.0.
---

# Skill: Verify Contract v1.3 & Release Check

Dùng skill này sau mọi chỉnh sửa `src/sim/`, `src/headless/`, `src/game/`, `src/bench/`, `src/server/` và bắt buộc trước khi gắn tag `phase-4` / `v1.0.0`.

## Các bước bắt buộc
1. Kiểm tra đồng bộ `game.contract.json` (`contract_version: "1.3"`, `run_cmd`, `bench_cmd`, `soak_cmd`, `tuning`) với `src/sim/config.js`.
2. Chạy `npm test` (`22/22` tests):
   - Contract `v1.3`, luật Phase 3 (`dawn_survived`, nhiên liệu `100`, `drain`, sức chứa `10 -> 20`).
   - Regression Phase 1–2 và tách biệt `creativeVariants` (chém choáng `180` tick, đom đóm 3 cỡ).
   - `benchmarkMode` (`200` Bóng Mực `wander`, `100` đom đóm, `L1–L3` sáng `fuel: 100`, không kết thúc Đêm).
   - `runSoak` (3 Đêm xoay vòng `0` crash) và `leaderboard.js` + `run.js --export-leaderboard`.
3. Chạy `npm run build` để đóng gói `dist/`.
4. Chạy trực tiếp (không sửa tay JSON kết quả):
   - `node src/headless/soak.js --seed 7 --nights 10 --out soak.json` (`crashes === 0`, `mem_end_mb <= 1.2 * mem_start_mb`).
   - `node src/bench/bench.js --seed 42 --duration 30 --out bench.json` (`1280×720`, kiểm `avg_fps`, `p1_low_fps`, `load_ms`, `renderer`, `peak_mem_mb`).
5. Cập nhật `README.md`, `CHANGELOG.md`, `CREDITS.md`, `docs/notes/retro.md` và `docs/proof/phase-4/README.md`.

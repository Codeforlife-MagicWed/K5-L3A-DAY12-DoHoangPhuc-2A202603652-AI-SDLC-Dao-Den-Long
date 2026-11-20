# Bằng chứng Kiểm chứng — Phase 4 (`phase-4`, `v1.0.0`, Contract `v1.3`)

Mọi kết quả dưới đây được chạy trực tiếp trên mã nguồn Phase 4 cuối cùng (không chỉnh sửa tay output JSON).

## 1. Bảng truy vết Yêu cầu (`Ticket-04`) → Kiểm chứng → Kết quả

| Yêu cầu (`Ticket-04` / `Contract v1.3`) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` `v1.3` khớp `TUNING` và khai báo `run_cmd`, `bench_cmd`, `soak_cmd` | Đối chiếu JSON với `src/sim/config.js` | `tests/contract.test.js` (test #1) | **Đạt** |
| **Chế độ Benchmark (`1280×720`, `--disable-gpu-vsync`)**: Đêm 1 tắt sáng tạo, `L1–L3` sáng (`fuel: 100`), `200` Bóng Mực `wander`, `100` đom đóm, camera bay tròn `R=30m, Y=15m`, `15s/vòng`, bỏ `3s` đầu, đo `30s` | Unit test `benchmarkMode` + chạy thật `node src/bench/bench.js --seed 42 --duration 30 --out bench.json` | `tests/contract.test.js` (test #20) & [bench.json](../../../bench.json) (`avg_fps: 59.1`, `p1_low_fps: 30`, `frame_ms_p95: 16.8`, `load_ms: 849`, `peak_mem_mb: 15.6`, `vsync_off: true`) | **Đạt** |
| **Soak Test**: `10` Đêm xoay vòng `1->2->3` cùng tiến trình, input ngẫu nhiên theo seed, kiểm `crashes = 0` và `mem_end_mb <= 1.2 * mem_start_mb` | Unit test `runSoak` + chạy thật `node src/headless/soak.js --seed 7 --nights 10 --out soak.json` | `tests/contract.test.js` (test #21) & [soak.json](../../../soak.json) (`crashes: 0`, `mem_start_mb: 44.1`, `mem_end_mb: 48` = `1.09x <= 1.2x`, `duration_s: 0.81`) | **Đạt** |
| **Local Leaderboard**: tên `3–12` ký tự `[A-Za-z0-9_]` + tiếng Việt, Top 10 lưu đĩa cục bộ, màn hình Leaderboard từ Menu, `--export-leaderboard out.json` | Kiểm tra validation, sort top 10, lưu/đọc file cục bộ và CLI `--export-leaderboard` | `tests/contract.test.js` (test #22), `src/server/leaderboard.js`, `src/server/run.js` | **Đạt** |
| **Accessibility**: Đổi phím mọi hành động + báo trùng + Khôi phục mặc định; phụ đề + mũi tên Bóng Mực mép màn hình; Giảm chuyển động; chữ tối thiểu `18 px` + Chữ lớn `×1.25` | Kiểm tra code UI + CSS (`index.html`, `src/game/style.css`, `src/game/settings.js`, `src/game/main.js`) & build tĩnh | `npm run build` (`dist/` sạch) | **Đạt** |
| **Yêu cầu đồ họa & gameplay bổ sung**: Lồng đèn cầm tay cho Mây, nâng cấp tạo hình 3D Bóng Mực & Gió Lạc, hiệu ứng ánh sáng 3D, sông chảy liền mạch, sửa địa hình & logic Đêm 3, tăng choáng chém ánh sáng lên `180` tick (`3.0s`) | Unit test Đêm 3 + choáng `180` tick + kiểm tra build + benchmark với `InstancedMesh` | `tests/contract.test.js` (tests #14, #19, #23) & `src/game/scene.js` | **Đạt** |
| **Đóng gói, Tài liệu & Retro**: `README.md` (`<= 3` lệnh từ clone sạch), `CHANGELOG.md` 4 phase, `CREDITS.md`, `LICENSE`, `Dockerfile`, `docs/notes/retro.md` | Rà soát đầy đủ file tài liệu trong repo và `npm run build` | [README.md](../../../README.md), [CHANGELOG.md](../../../CHANGELOG.md), [retro.md](../../notes/retro.md), [Dockerfile](../../../Dockerfile) | **Đạt** |

## 2. Lệnh tái lập kiểm chứng Phase 4

```bash
npm install && npm run build
npm test
node src/headless/soak.js --seed 7 --nights 10 --out soak.json
node src/bench/bench.js --seed 42 --duration 30 --out bench.json
node src/server/run.js --export-leaderboard docs/proof/phase-4/leaderboard-sample.json
```

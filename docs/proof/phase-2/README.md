# Bằng chứng Kiểm chứng — Phase 2 (`phase-2`, Contract v1.1)

Mọi kết quả dưới đây được chạy trực tiếp từ mã nguồn Phase 2 (không chỉnh sửa tay output).

## 1. Bảng truy vết Yêu cầu → Kiểm chứng → Kết quả

| Yêu cầu (`Ticket-02` / `Contract v1.1`) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` `v1.1` khớp số chuẩn Phần 1 | Đối chiếu tự động `game.contract.json` với `TUNING` | `tests/contract.test.js` (test #1) | **Đạt** |
| Regression Đêm 1 theo số chuẩn (`per_mote` khi nạp, `lantern_cost: 10`, `safe_radius: 6`, `pulse`) | Chạy CLI headless Đêm 1 kịch bản thắng & pulse | `tests/contract.test.js` (test #2, #3) | **Đạt** |
| Kỹ năng Lướt (`dash`: `14 m/s`, `12` tick, cooldown `1.5 s`) | Mô phỏng kích hoạt `dash` | `tests/contract.test.js` (test #4) | **Đạt** |
| Rơi khỏi đảo (`Y < -10`): mất 1 Ngọn Lửa bỏ qua bất tử, mất đom đóm, hồi sinh sau 60 tick | Chạy CLI Đêm 1 đi qua mép `R = 40 m` | `tests/contract.test.js` (test #5) | **Đạt** |
| Bản đồ chuẩn Đêm 2 (Đảo Cau, cầu tre, bục nhảy `vy=14, horiz=24`) | Chạy CLI `--night 2` kích hoạt bục nhảy `(20,0,18)` | `tests/contract.test.js` (test #6) | **Đạt** |
| Bản đồ chuẩn Đêm 3 (Đảo Chuông 3 tầng, dốc, tháp chuông, gió mạnh mỗi `30 s`) | Chạy CLI `--night 3` 1850 tick kiểm tra `wind.active` | `tests/contract.test.js` (test #7) | **Đạt** |
| Gió Lạc (`drifters`: cướp `min(3, carried)`, bị Pulse nhả lại khi `flee`) | Chạy CLI `--night 2` kịch bản `drifter_steal` & `drifter_drop` | `tests/contract.test.js` (test #8) | **Đạt** |
| Bùa Gió (`charms`: tăng tốc `7.2 m/s`, Lướt không hồi chiêu) | Chạy CLI `--night 2` nhặt `C1` và Dash 2 lần liên tiếp | `tests/contract.test.js` (test #9) | **Đạt** |
| Tạm dừng (`pause`): đóng băng `sim_tick` và timers, `tick` vẫn tăng | Chạy CLI với `pause: true` tại tick 5 và resume tại tick 25 | `tests/contract.test.js` (test #10) | **Đạt** |
| Hiệu năng headless ≤ 30s cho 21.600 tick & tính tất định | Chạy CLI `--night 3 --ticks 21600` 2 lần độc lập & đo thời gian | ~`1.6 s`/lượt (`3198 ms` cho cả 2 lượt trong `test #11`), 2 output giống hệt từng byte; mẫu Đêm 3 ([night3-full.jsonl](night3-full.jsonl)) chạy `958 ms` | **Đạt** |
| Giải đáp bổ sung: Đêm 3 xuất phát `(0,0,-15)`, `spawning` `60` tick -> `wander`, scenario shades bắt đầu `wander` | Kiểm thử trực tiếp 3 quy tắc qua `createSimulation` | `tests/contract.test.js` (test #13) | **Đạt** |
| Lỗi định dạng inputs/scenario -> mã thoát `2` | Chạy CLI với JSON hỏng và `tick` không tăng | `tests/contract.test.js` (test #12) | **Đạt** |
| Đóng gói giao diện 3D WebGL (3 Đêm, HUD, Âm thanh, Cài đặt, Bảng màu chuẩn, trang phục Mây & ánh sáng tối/sáng) | Chạy `npm run build` & kiểm tra trên Chrome `1280×720` | `dist/` biên dịch thành công (`1.38s`); Chrome `1280×720` chạy 0 lỗi JS/WebGL/404 (`70/70` request `200 OK`), ảnh [gameplay-1280x720.png](gameplay-1280x720.png) | **Đạt** |
| Hiệu năng bản thường 3D tại `1280×720` (`>= 30 FPS`) | Đo `requestAnimationFrame` trong 2011.1 ms trên Chrome (`1280×720`) | Lần 1 (trước tối ưu, buffer `2560×1440`, `6` PointLight đom đóm, shadow `1024`): `29.83 FPS` (`60` frames / `2011.1 ms`). Đã tối ưu `setPixelRatio(1)`, shadow `512×512` `BasicShadowMap`, `2` PointLight đom đóm, `antialias: false` và xác nhận render sạch tại `1280×720` (chưa đo lại số FPS mới do `evaluate_script` bị từ chối quyền ở lần 2) | **Cần đo lại sau tối ưu** |

## 2. Lệnh tái lập kiểm chứng

```bash
npm install
npm test
npm run build
node src/headless/cli.js --seed 42 --night 3 --ticks 21600 --out docs/proof/phase-2/night3-full.jsonl --snapshot-every 600
```

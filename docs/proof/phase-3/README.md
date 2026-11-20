# Bằng chứng Kiểm chứng — Phase 3 (`phase-3`, Contract v1.2)

Mọi kết quả dưới đây được chạy trực tiếp trên mã nguồn Phase 3 (không chỉnh sửa tay output).

## 1. Bảng truy vết Yêu cầu → Kiểm chứng → Kết quả

| Yêu cầu (`Ticket-03` / `Contract v1.2`) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` `v1.2` khớp toàn bộ hằng số mới | Đối chiếu `game.contract.json` với `TUNING` | `tests/contract.test.js` (test #1) | **Đạt** |
| Luật thắng mới `dawn_survived`: thắp đủ đèn không kết thúc sớm; thắng khi hết giờ với `>= 60%` đèn sáng | Chạy CLI Đêm 1 thắp `L1` (`3/5` sáng), xác nhận chạy tiếp tới hết giờ và thắng `dawn_survived` | `tests/contract.test.js` (test #2) | **Đạt** |
| Thua `dawn` khi hết giờ mà số đèn sáng `< ceil(0.6 * tổng)` | Mô phỏng Đêm 1 còn `2/5` đèn sáng khi hết giờ | `tests/contract.test.js` (test #17) | **Đạt** |
| Nhiên liệu đèn (`100`, hao `1/s`, châm dầu `refuel`, tắt `lantern_out`, thắp lại `5` đom đóm `relight: true`, sức chứa tăng `10 -> 12`) | Kiểm thử trực tiếp qua `createSimulation` | `tests/contract.test.js` (test #15) | **Đạt** |
| Bóng Mực `drain` khi `fuel < 30` (`5/s`, `fuel_drain` mỗi `60` tick, Tỏa Sáng `+15`) | Mô phỏng bóng `wander` tiếp cận đèn yếu và trúng Pulse | `tests/contract.test.js` (test #16) | **Đạt** |
| Regression Phase 1–2 (`safe_radius`, `dash`, `fall`, Đêm 2, Đêm 3, Gió Lạc, Bùa Gió, Pause, Tính tất định, Exit `2`, Creative `slash` tách khỏi headless) | Chạy đầy đủ bộ test `npm test` + mẫu headless [night1-fuel.jsonl](night1-fuel.jsonl) | `tests/contract.test.js` (tests #3–#14) | **Đạt** |
| Giao diện 3D (`fuel bar`, nhấp nháy `1 Hz`, chế độ mù màu `#00B3FF`/`#FFFFFF + ⚠`, đèn tắt xẹp `20%` + vết rách) | Chạy `npm run build` | `dist/` biên dịch thành công | **Đạt** |

## 2. Lệnh tái lập kiểm chứng

```bash
npm install
npm test
npm run build
node src/headless/cli.js --seed 42 --night 1 --ticks 3600 --out docs/proof/phase-3/night1-fuel.jsonl --snapshot-every 300
```

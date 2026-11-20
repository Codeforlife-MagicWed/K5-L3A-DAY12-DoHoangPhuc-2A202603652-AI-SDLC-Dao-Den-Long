# Bằng chứng Kiểm chứng — Phase 1 (`phase-1`)

Mọi bằng chứng dưới đây được chạy trực tiếp trên mã nguồn Phase 1 (không chỉnh sửa tay output).

## 1. Bảng truy vết Yêu cầu → Kiểm chứng → Kết quả

| Yêu cầu (`PRD-0` / `Test Contract v1.0`) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` khớp toàn bộ thông số game | Unit test đối chiếu `game.contract.json` với `TUNING` trong `src/sim/config.js` | `tests/contract.test.js` (test #1) | **Đạt** |
| Chạy headless 60 tick/s, mô hình tick & xoay `move` theo `cam_yaw_deg` + chuẩn hóa vector | Chạy CLI headless với scenario trống & inputs xoay hướng/chéo | `tests/contract.test.js` (test #2) | **Đạt** |
| Nhặt đom đóm, nạp đèn, thắp đèn cuối & thắng (`all_lit`), dựng scenario không cộng điểm | Chạy CLI headless kịch bản thắng tại đèn `L1` | `tests/contract.test.js` (test #3) | **Đạt** |
| Khu vực đèn đã thắp là vùng an toàn (`safe_radius = 6.0 m`) | Mô phỏng Bóng Mực đuổi Mây đứng trong `safe_radius` quanh đèn `L1` đã thắp | `tests/contract.test.js` (test #4) | **Đạt** |
| Kỹ năng tỏa sáng (`pulse`) tốn `1` ánh sáng, đẩy lùi `5 m`, choáng `3 s`, có cooldown | Mô phỏng gọi `pulse` và gọi lại ngay trong thời gian cooldown | `tests/contract.test.js` (test #5) | **Đạt** |
| Bóng Mực chạm làm mất máu, rơi ánh sáng (`0.5`), thua khi `flames = 0` hoặc hết giờ (`dawn`) | Mô phỏng kịch bản va chạm & hết giờ | `tests/contract.test.js` (test #6, #7) | **Đạt** |
| Tính tất định (cùng `seed`, `scenario`, `inputs` -> output giống hệt) | Chạy CLI 2 lần độc lập với `--seed 12345 --ticks 600` và so byte-by-byte | `tests/contract.test.js` (test #8) & [headless-sample.jsonl](headless-sample.jsonl) | **Đạt** |
| Sai định dạng `inputs`/`scenario` hoặc `tick` không tăng nghiêm ngặt -> mã thoát `2` | Chạy CLI với JSON hỏng và `tick` trùng nhau | `tests/contract.test.js` (test #9) | **Đạt** |
| Đom đóm nhỏ/vừa/lớn (`+1/+2/+3`) trong 3D không phá Test Contract ở headless | So sánh `creativeVariants: true` vs `false` trên cùng scenario | `tests/contract.test.js` (test #10) | **Đạt** |
| Bản Web 3D Đêm 1 biên dịch sạch không lỗi | Chạy `npm run build` (Vite) | `dist/` tạo thành công trong `1.16s` | **Đạt** |

## 2. Lệnh tái lập kiểm chứng tại tag `phase-1`

```bash
npm install
npm test
npm run build
node src/headless/cli.js --seed 42 --night 1 --ticks 120 --out docs/proof/phase-1/headless-sample.jsonl --snapshot-every 30
```

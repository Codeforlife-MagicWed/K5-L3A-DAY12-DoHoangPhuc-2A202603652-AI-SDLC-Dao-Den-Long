# AGENTS.md — Đảo Đèn Lồng (Contract v1.2)

## Lệnh chuẩn của dự án
- Cài đặt & build: `npm install && npm run build`
- Chạy game 3D (Vite): `npm run dev`
- Chạy headless theo Test Contract v1.2 (`--night 1|2|3`): `node src/headless/cli.js --seed <int> --night <1|2|3> --ticks <int> --out <file.jsonl>`
- Chạy toàn bộ test & kiểm chứng contract + regression: `npm test`

## Kiến trúc bắt buộc
- `src/sim/` chứa **toàn bộ logic game thuần** (60 tick/s, thứ tự 12 bước mỗi tick, nhiên liệu tính theo đơn vị nguyên `1/60`, PRNG tất định).
- Luật Phase 3 (`v1.2`): đèn hao dầu `1/s`, Bóng Mực `wander` hút dầu `5/s` ở đèn `fuel < 30` (`drain`), thắng khi sống tới bình minh với `lit >= ceil(0.6 * total)` (`dawn_survived`), sức chứa tăng dần `10 + 2 * successful_lights` (tối đa `20`).
- `src/game/` là lớp hiển thị 3D (thanh dầu đèn, nhấp nháy `fuel < 30`, đèn tắt xẹp `20%` + vết rách, chế độ mù màu `#00B3FF` / `#FFFFFF` + `⚠`).
- Sáng tạo thêm (đom đóm nhỏ/vừa/lớn, chém ánh sáng `slash`, tạo hình mây, sông suối) **không làm đổi đầu ra headless** của Test Contract.

## Quy ước & Điều cấm
- Đọc `game.contract.json` (`v1.2`) trước khi sửa thông số; số trong code và contract phải khớp tuyệt đối.
- Không skip/xóa test cũ âm thầm: mọi test bị luật mới thay thế phải ghi rõ lý do trong `docs/notes/phase-3-adr.md` và `CHANGELOG.md`.
- Không kết thúc phase khi `npm test` hoặc `npm run build` còn lỗi.

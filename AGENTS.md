# AGENTS.md — Đảo Đèn Lồng

## Lệnh chuẩn của dự án
- Cài đặt & build: `npm install && npm run build`
- Chạy game 3D (Vite): `npm run dev`
- Chạy headless theo Test Contract: `node src/headless/cli.js --seed <int> --night 1 --ticks <int> --out <file.jsonl>`
- Chạy toàn bộ test & kiểm chứng contract: `npm test`

## Kiến trúc bắt buộc
- `src/sim/` chứa **toàn bộ logic game thuần** (60 tick/s, PRNG tất định theo `--seed`, không phụ thuộc DOM/WebGL/Three.js).
- `src/headless/` là CLI đọc `--scenario`, `--inputs` và xuất JSONL chuẩn `game.contract.json`.
- `src/game/` là lớp hiển thị 3D (Three.js + HUD) đọc trạng thái từ `src/sim/`.
- Các tính năng sáng tạo thêm (như đom đóm nhỏ/vừa/lớn) **không được làm thay đổi đầu ra headless** của Test Contract.

## Quy ước & Điều cấm
- Đọc `game.contract.json` trước khi sửa bất kỳ hằng số gameplay nào; số trong code và trong `game.contract.json` phải khớp tuyệt đối.
- Không sửa tay output bằng chứng, không viết test luôn đạt, không tắt test cũ âm thầm khi yêu cầu đổi.
- Không kết thúc phase khi `npm test` còn đỏ.
- Không commit `.env`, API key hoặc token.

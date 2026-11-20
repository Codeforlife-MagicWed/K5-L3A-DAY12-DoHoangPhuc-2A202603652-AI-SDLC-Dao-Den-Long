# AGENTS.md — Đảo Đèn Lồng (Contract v1.1)

## Lệnh chuẩn của dự án
- Cài đặt & build: `npm install && npm run build`
- Chạy game 3D (Vite): `npm run dev`
- Chạy headless theo Test Contract v1.1 (`--night 1|2|3`): `node src/headless/cli.js --seed <int> --night <1|2|3> --ticks <int> --out <file.jsonl>`
- Chạy toàn bộ test & kiểm chứng contract + regression: `npm test`

## Kiến trúc bắt buộc
- `src/sim/` chứa **toàn bộ logic game thuần** (60 tick/s, thứ tự 12 bước mỗi tick, PRNG tất định theo `--seed`, không phụ thuộc DOM/WebGL/Three.js).
- `src/sim/maps.js` định nghĩa 3 bản đồ chuẩn (Đêm 1 Đảo Bến, Đêm 2 Đảo Cau, Đêm 3 Đảo Chuông), điểm sinh chuẩn, cầu tre, bục nhảy, dốc 3 tầng và tháp chuông.
- `src/headless/` là CLI đọc `--scenario`, `--inputs` (`dash`, `pause`) và xuất JSONL chuẩn `Contract v1.1`.
- `src/game/` là lớp hiển thị 3D (Three.js, bảng màu chuẩn, âm thanh WebAudio, HUD, 3 Đêm, cài đặt lưu `localStorage`).
- Sáng tạo thêm (đom đóm nhỏ/vừa/lớn) **chỉ bật ở giao diện 3D (`creativeVariants: true`)**, tắt ở chế độ headless.

## Quy ước & Điều cấm
- Đọc `game.contract.json` trước khi sửa thông số; số chuẩn Phần 1 của Ticket-02 và `game.contract.json` phải khớp tuyệt đối.
- Đảm bảo điểm `+10` tính khi **nạp đom đóm vào đèn**, không phải lúc nhặt.
- Không tắt test cũ âm thầm; test cũ thay đổi do chuẩn hóa số liệu phải cập nhật kèm lý do trong `docs/notes/phase-2.md`.
- Không kết thúc phase khi `npm test` hoặc `npm run build` còn lỗi.
- Không commit `.env`, API key hoặc token.

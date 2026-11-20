# AGENTS.md — Đảo Đèn Lồng (Contract v1.3)

## Lệnh chuẩn của dự án
- Cài đặt & build bản phát hành tĩnh: `npm install && npm run build`
- Chạy bản phát hành (`dist/` + API Leaderboard cục bộ): `npm start` (`node src/server/run.js`)
- Xuất bảng xếp hạng: `node src/server/run.js --export-leaderboard out.json`
- Chạy dev 3D (Vite): `npm run dev`
- Chạy headless theo Test Contract v1.3 (`--night 1|2|3`): `node src/headless/cli.js --seed <int> --night <1|2|3> --ticks <int> --out <file.jsonl>`
- Chạy Benchmark 3D 1280×720 (`v1.3`): `node src/bench/bench.js --seed 42 --duration 30 --out bench.json`
- Chạy Soak 10 Đêm liên tiếp (`v1.3`): `node src/headless/soak.js --seed 7 --nights 10 --out soak.json`
- Chạy toàn bộ test & kiểm chứng contract + regression: `npm test`

## Kiến trúc bắt buộc
- `src/sim/` chứa **toàn bộ logic game thuần** (60 tick/s, thứ tự 12 bước mỗi tick, nhiên liệu tính theo đơn vị nguyên `1/60`, PRNG tất định). Hỗ trợ `benchmarkMode` (Đêm 1: `L1–L3` sáng `fuel: 100`, `200` Bóng Mực `wander`, `100` đom đóm, tắt hao/sát thương/nhặt/spawn/kết thúc) và `creativeVariants` (tắt ở headless & benchmark).
- `src/game/` là lớp hiển thị 3D (Mây cầm lồng đèn tay, Bóng Mực & Gió Lạc nâng cấp đồ họa, `InstancedMesh` gộp batch cho Bóng Mực/đom đóm để giữ FPS cao, accessibility: đổi phím trùng kiểm lỗi, phụ đề + mũi tên Bóng Mực, giảm chuyển động, chữ tối thiểu `18 px` / `×1.25`, chế độ mù màu).
- `src/server/` (`run.js`, `leaderboard.js`) phục vụ `dist/` và lưu Top 10 Leaderboard xuống đĩa cục bộ (`~/.dao-den-long/leaderboard.json` hoặc `DDL_LEADERBOARD_PATH`).
- `src/bench/bench.js` dùng Puppeteer `1280×720` (`--disable-gpu-vsync`) đo benchmark `bench.json` sau 3 giây khởi động.

## Quy ước & Điều cấm
- Đọc `game.contract.json` (`v1.3`) trước khi sửa thông số; số trong code và contract phải khớp tuyệt đối.
- Sáng tạo thêm (đom đóm 3 cỡ biết bay, chém ánh sáng choáng `180` tick, đèn cầm tay, nút dev chọn màn/rút giờ) **không làm đổi đầu ra headless** hoặc **chế độ benchmark**.
- Không skip/xóa test cũ âm thầm; mọi thay đổi breaking phải ghi rõ trong ADR & `CHANGELOG.md`.
- Không kết thúc phase khi `npm test` hoặc `npm run build` còn lỗi.

# Đảo Đèn Lồng (Day 12 — AI SDLC)

Game 3D góc nhìn thứ ba: điều khiển **Mây** (người giữ đèn nhỏ tuổi đội nón lá treo đèn lồng) trên **Đêm 1 – Đảo Bến**, thu thập đom đóm để thắp sáng **5 Đèn Lồng Lớn** và né **Bóng Mực** trong sương đen.

> *Video demo:* Sẽ đính kèm tại Release `v1.0.0` ở Phase 4.
> *Tài liệu hướng dẫn gốc của lab:* [GUIDE.md](GUIDE.md) · [CHECKPOINTS.md](CHECKPOINTS.md) · [SUBMISSION.md](SUBMISSION.md) · [RULES.md](RULES.md) · [RUBRIC.md](RUBRIC.md)

---

## Cài đặt và chạy (2 lệnh)

Yêu cầu: **Node.js >= 22.12** (chạy được trên macOS, Linux và Windows).

```bash
npm install
npm run dev
```

Mở trình duyệt theo đường dẫn Vite hiển thị (mặc định `http://localhost:5173`).

---

## Điều khiển

| Phím / Thao tác | Tác dụng |
|---|---|
| `W A S D` hoặc `Mũi tên` | Di chuyển Mây theo hướng camera |
| Kéo chuột trái hoặc `Q` / `C` | Xoay camera quanh Mây |
| `Space` | Nhảy |
| `E` | Nạp ánh sáng vào Đèn Lồng Lớn gần nhất |
| `F` | **Tỏa sáng (Pulse)**: tốn `1` ánh sáng để đẩy lùi (`5 m`) và làm choáng (`3 s`) Bóng Mực trong `8 m` |

- **Vùng an toàn:** Khi một Đèn Lồng Lớn đã được thắp sáng, khu vực bán kính `6 m` quanh đèn trở thành vùng an toàn — Bóng Mực không thể tiến vào.

---

## Cách tính điểm

- Nhặt ánh sáng đom đóm: `+10` điểm / đơn vị ánh sáng (`per_mote: 10`)
- Thắp sáng một Đèn Lồng Lớn (đủ `4` ánh sáng): `+100` điểm (`per_lantern: 100`)
- Làm choáng Bóng Mực bằng kỹ năng Tỏa sáng: `+25` điểm / Bóng Mực (`per_stun: 25`)
- Thưởng khi thắng (`all_lit`): `+5` điểm / giây còn lại + `+50` điểm / ngọn lửa (máu) còn lại

---

## Kiểm thử & Chế độ Headless (`Test Contract v1.0`)

Chạy toàn bộ unit test và kiểm chứng contract (1 lệnh):

```bash
npm test
```

Chạy chế độ headless (60 tick/giây cố định, không giao diện):

```bash
node src/headless/cli.js --seed 42 --night 1 --ticks 300 --out out.jsonl
```

Tùy chọn: `--scenario <file.json>`, `--inputs <file.json>`, `--snapshot-every <int>`.

---

## Sáng tạo của tôi

- **Đom đóm 3 kích cỡ (Nhỏ / Vừa / Lớn):** Trong bản chơi 3D tương tác, đom đóm xuất hiện với 3 kích thước và sắc độ vàng cam khác nhau: **Nhỏ (`+1`)**, **Vừa (`+2`)**, và **Lớn (`+3` ánh sáng)**.
- **Bảo toàn Test Contract:** Tính năng phân loại kích cỡ chỉ bật ở giao diện 3D (`creativeVariants: true`); ở chế độ headless (`cli.js`), mọi đom đóm đều chuẩn hóa giá trị `+1` nên **không làm thay đổi đầu ra Test Contract v1.0** (đã kiểm chứng trong `tests/contract.test.js` test #10 và bộ test tất định).

---

## Tài liệu SDLC & Bằng chứng
- Ghi chép & giả định Phase 1: [docs/notes/phase-1.md](docs/notes/phase-1.md)
- Bằng chứng kiểm chứng Phase 1: [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md)
- Harness AI: [AGENTS.md](AGENTS.md) · [.agents/skills/verify-contract/SKILL.md](.agents/skills/verify-contract/SKILL.md) · [.github/workflows/ci.yml](.github/workflows/ci.yml)

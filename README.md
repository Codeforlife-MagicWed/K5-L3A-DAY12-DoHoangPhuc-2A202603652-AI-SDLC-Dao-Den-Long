# Đảo Đèn Lồng — Ba Hòn Đảo (Day 12 — AI SDLC)

Game 3D góc nhìn thứ ba qua **3 Đêm**: **Đêm 1 – Đảo Bến**, **Đêm 2 – Đảo Cau**, **Đêm 3 – Đảo Chuông**. Điều khiển **Mây** thu thập đom đóm, thắp sáng các Đèn Lồng Lớn, né Bóng Mực và Gió Lạc trước bình minh.

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
| `W A S D` hoặc `Mũi tên` | Di chuyển Mây theo hướng camera (`6.0 m/s`, `7.2 m/s` khi có Bùa Gió) |
| Kéo chuột trái hoặc `Q` / `C` | Xoay camera quanh Mây (độ nhạy chỉnh trong Cài đặt, tự lưu) |
| `Space` | Nhảy (`7.0 m/s`, chỉ khi chạm đất) |
| `Shift` | **Lướt (Dash)**: `14 m/s` trong `0.2 s` (giữ độ cao trên không, hồi chiêu `1.5 s`) |
| `E` | Nạp ánh sáng vào Đèn Lồng Lớn gần nhất (`<= 2.0 m`, tối đa `10`/đèn) |
| `F` | **Tỏa Sáng (Pulse)**: tốn `3` đom đóm, choáng `120` tick & đẩy `4 m` Bóng Mực trong `5 m` |
| `Esc` hoặc `P` | Tạm dừng / Tiếp tục |

---

## Cách tính điểm (`Contract v1.1`)

- Nạp đom đóm vào đèn: `+10` điểm / đom đóm nạp
- Thắp sáng 1 Đèn Lồng Lớn (đủ `10` đom đóm): `+100` điểm
- Bóng Mực trúng Tỏa Sáng: `+5` điểm / lần
- Thưởng khi thắng mỗi Đêm: `+ floor(giây còn lại) × 2` + `+50 × Ngọn Lửa còn lại`

---

## Kiểm thử & Chế độ Headless (`Test Contract v1.1`)

Chạy toàn bộ unit test, scenario Phase 2, regression Phase 1 và kiểm tra hiệu năng (1 lệnh):

```bash
npm test
```

Chạy chế độ headless (`--night 1 | 2 | 3`, 60 tick/giây cố định, không giao diện):

```bash
node src/headless/cli.js --seed 42 --night 3 --ticks 21600 --out out.jsonl
```

---

## Sáng tạo của tôi

- **Đom đóm 3 kích cỡ (Nhỏ / Vừa / Lớn):** Trong bản chơi 3D tương tác (`creativeVariants: true`), đom đóm xuất hiện với 3 kích thước và lượng ánh sáng mang theo (**Nhỏ +1**, **Vừa +2**, **Lớn +3**).
- **Bảo toàn Test Contract v1.1:** Ở chế độ headless (`cli.js`, `creativeVariants: false`), mọi đom đóm giữ nguyên chuẩn `+1` theo đúng Test Contract v1.1 nên không làm sai lệch đầu ra chấm tự động.

---

## Tài liệu SDLC & Bằng chứng
- Phase 1: [docs/notes/phase-1.md](docs/notes/phase-1.md) · [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md)
- Phase 2: [docs/notes/phase-2.md](docs/notes/phase-2.md) · [docs/proof/phase-2/README.md](docs/proof/phase-2/README.md)
- Harness AI: [AGENTS.md](AGENTS.md) · [.agents/skills/verify-contract/SKILL.md](.agents/skills/verify-contract/SKILL.md) · [.github/workflows/ci.yml](.github/workflows/ci.yml)

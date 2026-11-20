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
| Kéo chuột trái hoặc `Q` / `C` | Xoay camera ngang và **kéo dọc / cuộn chuột** để chuyển góc nhìn trên xuống |
| `Space` | Nhảy (`7.0 m/s`, chỉ khi chạm đất) |
| `Shift` | **Lướt (Dash)**: `14 m/s` trong `0.2 s` (giữ độ cao trên không, hồi chiêu `1.5 s`) |
| `E` | Nạp ánh sáng vào Đèn Lồng Lớn gần nhất (`<= 2.0 m`, tối đa `10`/đèn) |
| `F` | **Tỏa Sáng (Pulse)**: tốn `3` đom đóm, choáng `120` tick & đẩy `4 m` Bóng Mực trong `5 m` |
| `Click chuột trái` hoặc `J` / `X` | **Chém ánh sáng (3D)**: quét gậy đẩy lùi & làm choáng nhẹ Bóng Mực trước mặt (hồi `1.2 s`, không giết ma) |
| `Esc` hoặc `P` | Tạm dừng / Tiếp tục |

---

## Cách tính điểm (`Contract v1.2`)

- Nạp đom đóm vào đèn (thắp mới, thắp lại hoặc châm dầu): `+5` điểm / đom đóm
- Thắp đèn lần đầu: `+100` điểm · Thắp lại (`ever_lit`): `+40` điểm
- Bóng Mực trúng Tỏa Sáng: `+5` điểm (`+15` nếu đang ở trạng thái `drain`)
- Thưởng bình minh (khi sống hết giờ và đạt `>= 60%` đèn sáng): `+50 + floor(fuel)` mỗi đèn đang sáng + `+50` mỗi Ngọn Lửa còn lại

---

## Kiểm thử & Chế độ Headless (`Test Contract v1.2`)

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

- **Tạo hình Mây như đám mây bông & Cảnh quan sông suối:** Mây có thân bằng cụm mây trắng kem, đội nón lá treo đèn lồng, khăn đỏ 2 dải; các đảo có sông suối uốn lượn, cầu gỗ nhỏ và tầm nhìn giảm dần theo khoảng cách sương đêm.
- **Đom đóm 3 kích cỡ, nhiều hơn & biết di chuyển:** Trong bản chơi 3D tương tác (`creativeVariants: true`), đảo sinh nhiều đom đóm hơn (`34` ban đầu, trần `45`, hồi mỗi `1.5 s`) với 3 kích thước (**Nhỏ +1** đứng yên, **Vừa +2** bay chậm `1.5 m/s`, **Lớn +3** bay nhanh `2.6 m/s`).
- **Chém ánh sáng xua Bóng Mực (`Click` / `J`) & Góc nhìn trên xuống:** Quét ánh sáng đẩy lùi và làm choáng nhẹ Bóng Mực phía trước trong 1 giây (không giết Bóng Mực, không bạo lực) và kéo chuột dọc / cuộn chuột để quan sát từ trên xuống.
- **Bảo toàn Test Contract v1.1:** Ở chế độ headless (`cli.js`, `creativeVariants: false`), mọi đom đóm giữ chuẩn `+1` và `slash` bị tắt hoàn toàn nên **không làm sai lệch đầu ra chấm tự động** (đã kiểm chứng trong `tests/contract.test.js`).

---

## Tài liệu SDLC & Bằng chứng
- Phase 1: [docs/notes/phase-1.md](docs/notes/phase-1.md) · [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md)
- Phase 2: [docs/notes/phase-2.md](docs/notes/phase-2.md) · [docs/proof/phase-2/README.md](docs/proof/phase-2/README.md)
- Phase 3: [docs/notes/phase-3-adr.md](docs/notes/phase-3-adr.md) · [docs/proof/phase-3/README.md](docs/proof/phase-3/README.md) · [CHANGELOG.md](CHANGELOG.md)
- Harness AI: [AGENTS.md](AGENTS.md) · [.agents/skills/verify-contract/SKILL.md](.agents/skills/verify-contract/SKILL.md) · [.github/workflows/ci.yml](.github/workflows/ci.yml)

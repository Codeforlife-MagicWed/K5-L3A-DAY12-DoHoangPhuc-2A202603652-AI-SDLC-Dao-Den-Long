---
name: verify-contract
description: Quy trình kiểm chứng Test Contract v1.2 (Đèn cạn dầu, drain, sức chứa tăng dần, luật thắng bình minh), regression và bằng chứng trước khi gắn tag phase.
---

# Skill: Verify Contract v1.2 & Capture Proof

Dùng skill này sau mọi chỉnh sửa `src/sim/`, `src/headless/`, `src/game/` và bắt buộc trước khi gắn tag `phase-3` / `phase-4`.

## Các bước bắt buộc
1. Kiểm tra đồng bộ `game.contract.json` (`contract_version: "1.2"`) với `src/sim/config.js`.
2. Chạy `npm test`:
   - Kiểm tra nhiên liệu đèn (hao `1/s`, châm dầu `refuel`, tắt đèn `lantern_out`, thắp lại `5` đom đóm `relight: true`).
   - Kiểm tra Bóng Mực `drain` (đèn `fuel < 30` mất vùng an toàn, hút `5/s`, `fuel_drain` mỗi `60` tick, `+15` khi Tỏa Sáng trúng bóng đang `drain`).
   - Kiểm tra luật thắng mới (`dawn_survived` khi `lit >= ceil(0.6 * total)`, không thắng sớm khi đủ đèn) và sức chứa tăng dần (`10 -> 20`).
   - Kiểm tra regression Phase 1–2 không bị thay thế và tính tất định.
3. Chạy `npm run build` bảo đảm web 3D biên dịch sạch.
4. Cập nhật ADR, `CHANGELOG.md` (breaking changes) và bảng truy vết trong `docs/proof/phase-3/`.

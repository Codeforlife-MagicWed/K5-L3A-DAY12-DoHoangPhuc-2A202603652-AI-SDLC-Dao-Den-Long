---
name: verify-contract
description: Quy trình kiểm chứng Test Contract v1.1 (3 Đêm), regression Phase 1, hiệu năng và bằng chứng trước khi gắn tag phase.
---

# Skill: Verify Contract v1.1 & Capture Proof

Dùng skill này sau mọi chỉnh sửa `src/sim/`, `src/headless/`, `src/game/` và bắt buộc trước khi gắn tag `phase-2`..`phase-4`.

## Các bước bắt buộc
1. Kiểm tra đồng bộ `game.contract.json` (`contract_version: "1.1"`) với `src/sim/config.js`.
2. Chạy `npm test`:
   - Kiểm tra tất cả scenario mới (Dash, Fall `Y < -10`, Đêm 2 bục nhảy/cầu tre, Đêm 3 3 tầng/gió mạnh, Gió Lạc, Bùa Gió, Pause/Resume).
   - Kiểm tra regression Đêm 1 theo số chuẩn, tính tất định và mã thoát lỗi `2`.
3. Kiểm tra hiệu năng headless: chạy 1 Đêm đầy đủ (21.600 tick) phải xong trong `<= 30 giây`.
4. Chạy `npm run build` để bảo đảm bản web 3D biên dịch sạch.
5. Lưu log/kết quả kiểm chứng vào `docs/proof/phase-N/` và cập nhật `docs/notes/phase-N.md`.

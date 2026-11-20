---
name: verify-contract
description: Quy trình kiểm chứng Test Contract v1.0, tính tất định và lưu bằng chứng trước khi gắn tag phase.
---

# Skill: Verify Contract & Capture Proof

Dùng skill này mỗi khi hoàn tất thay đổi logic trong `src/sim/` hoặc `src/headless/`, và bắt buộc trước khi gắn tag `phase-N`.

## Các bước bắt buộc
1. Kiểm tra đồng bộ giữa `game.contract.json` và `src/sim/config.js`.
2. Chạy `npm test` (bao gồm unit tests, scenario tests theo Test Contract v1.0, kiểm tra tính tất định và mã thoát lỗi `2`).
3. Chạy `npm run build` để bảo đảm bản web 3D biên dịch không lỗi.
4. Chạy một lượt headless mẫu ghi log ra tệp tạm và đối chiếu bảng truy vết trong `docs/proof/phase-N/`.
5. Không báo hoàn thành nếu bất kỳ kiểm tra nào thất bại; ghi rõ `"chưa đạt"` nếu còn mục chưa xong.

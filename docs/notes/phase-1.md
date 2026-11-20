# Ghi chép SDLC — Phase 1 (`PRD-0`)

## 1. Giả định cho các chỗ mơ hồ của `PRD-0`

| Hạng mục | Chỗ mơ hồ trong PRD-0 | Giả định đã chốt |
|---|---|---|
| Kích thước Đảo Bến | Chỉ nêu "hòn đảo tròn" | Hình tròn tâm `(0, 0, 0)`, bán kính `40 m`, có bờ giới hạn (`fall_enabled: false`) |
| Vị trí 5 Đèn Lồng Lớn | Không nêu tọa độ | Đặt đối xứng trên vòng tròn bán kính `25 m`, `L1` tại `(0, 0, 25)` |
| Thông số Mây & Đèn | Không nêu số cụ thể | `player_speed = 7.0`, `carry_capacity = 5`, `lantern_cost = 4`, `pickup_radius = 2.0`, `interact_radius = 3.0`, `flames = 3`, `invuln_s = 1.5`, `hit_drop_ratio = 0.5` |
| Tỏa sáng (Pulse) | Không nêu chi phí/tầm | `pulse_cost = 1`, `pulse_radius = 8.0`, `pulse_push_m = 5.0`, `pulse_stun_s = 3.0`, `pulse_cooldown_s = 2.0` |
| Bóng Mực & Vùng an toàn | "Sợ những chiếc đèn" | Chỉ đèn **đã thắp** (`lit: true`) mới tạo vùng an toàn `safe_radius = 6.0 m`; Bóng Mực không thể tiến vào bên trong bán kính này. `shade_speed = 4.5`, `shade_hit_radius = 1.2` |
| Thời lượng & Điểm | "Có điểm số" | `night1_duration_s = 180`; `per_mote = 10`, `per_lantern = 100`, `per_stun = 25`, `per_second_left = 5`, `per_flame_left = 50` |
| Đom đóm nhiều kích cỡ | Sáng tạo thêm | Bản chơi 3D có 3 loại đom đóm (**Nhỏ +1**, **Vừa +2**, **Lớn +3**); chế độ headless (`creativeVariants: false`) chỉ sinh đom đóm chuẩn `+1` để không làm đổi đầu ra Test Contract |

## 2. Tiêu chí nghiệm thu Phase 1
- Chế độ headless chạy 60 tick/s, đúng định dạng `game.contract.json`, `inputs`, `scenario`, JSONL (`snapshot`, `event`, `end`), mã thoát `2` khi file lỗi.
- Cùng `--seed`, `scenario`, `inputs` -> output JSONL giống hệt từng byte.
- Bản 3D chơi được Đêm 1 hoàn chỉnh: Mây đội nón lá có đèn lồng nhỏ, nhặt 3 loại đom đóm, thắp 5 Đèn Lồng Lớn (đảo sáng dần và mở vùng an toàn `safe_radius`), tỏa sáng xua Bóng Mực, HUD đầy đủ, thắng/thua/chơi lại được.

## 3. Nhật ký dùng AI & Quản lý token (Phase 1)
- **Quy trình:** Đọc đề & tách Test Contract -> thiết kế tách thuần `src/sim/` và `src/game/` -> viết bộ test `tests/contract.test.js` kiểm tra contract trước -> chạy `npm test` và `npm run build` -> trích xuất log headless mẫu làm bằng chứng.
- **Lỗi AI / sự cố đã phát hiện và xử lý:**
  - `chrome_devtools` MCP không khởi động được do Node `v22.11.0` -> nâng cấp lên Node `v22.23.5` và bật remote debugging.
  - Trên Windows, `new URL(import.meta.url).pathname` bị lỗi `%20` với đường dẫn có dấu cách -> sửa sang `fileURLToPath(import.meta.url)` và ghi nhớ kiểm tra đường dẫn qua CLI test.
- **Ước tính token Phase 1:** Khoảng ~35k–45k tokens (tiết kiệm nhờ giữ `AGENTS.md` ngắn, tách nhỏ module và dùng `node --test` tích hợp sẵn không cài framework nặng).

## 4. Đánh giá nhanh Phase 1
- **Đạt:** Toàn bộ `Test Contract v1.0`, 10/10 bài test tự động xanh, `vite build` thành công, bản 3D đầy đủ tính năng Phase 1 và sáng tạo đom đóm nhỏ/vừa/lớn tách biệt khỏi headless.
- **Chưa làm / để phase sau:** Chưa quay video demo (để ở Phase 4/CP5 theo lịch lab); chưa kiểm chứng trực quan 3D trên trình duyệt headless macOS/Linux thực tế (sẽ chạy kiểm tra thêm bằng Docker/trình duyệt khi hoàn thiện).

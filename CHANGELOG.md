# Changelog

## [Phase 3 - Contract v1.2] — Ticket-03 "Đèn cạn dầu"

### Breaking Changes (Thay đổi phá vỡ tương thích so với v1.1)
- **Contract version:** Nâng từ `1.1` lên `1.2`.
- **Thời lượng Đêm 1 / 2 / 3:** Rút từ `300 / 330 / 360 s` xuống **`240 / 270 / 300 s`**.
- **Luật thắng (`game_over`):** Gỡ bỏ `all_lit` (thắng sớm khi đủ đèn). Thắng mới dùng `reason: "dawn_survived"` khi còn sống tới hết giờ và số đèn sáng `>= ceil(0.6 * tổng đèn)` (Đêm 1: `3/5`, Đêm 2: `4/6`, Đêm 3: `5/7`).
- **Nhiên liệu đèn & Tương tác:** Đèn đang sáng hao `1.0 fuel/s`, tắt khi `fuel <= 0` (`lantern_out`), thắp lại chỉ tốn `5` đom đóm (`relight: true`); tương tác ở đèn đang sáng chưa đầy dầu sẽ châm dầu (`+10 fuel/đom đóm`, event `refuel`).
- **Vùng an toàn & Bóng Mực `drain`:** Đèn có `fuel < 30` mất vùng an toàn `6 m`; Bóng Mực `wander` có thể vào `<= 2 m` chuyển sang `drain` hút `5 fuel/s` (`fuel_drain` mỗi `60` tick).
- **Bảng điểm (`score`):**
  - `per_mote`: `10` → **`5`**
  - Thêm `per_relight`: **`40`**, `per_drain_stun`: **`15`**
  - Bỏ `per_second_left` (`0`), thêm thưởng bình minh `+50 + floor(fuel)` mỗi đèn sáng.
- **Snapshot & Scenario:** Đèn thêm `fuel`, `ever_lit`, `relit_count`; `player` thêm `capacity` (tăng dần `10 + 2 * successful_lights`, tối đa `20`) và `successful_lights`; `shades` thêm `target_lantern_id` và trạng thái `drain`.

### Added
- Chế độ **"Bảng màu dễ phân biệt"** (mù màu: `#00B3FF`, `#FFFFFF + ⚠`, đèn tắt xẹp 20% + vết rách), thanh dầu trên đèn + nhấp nháy `1 Hz` khi `fuel < 30`.
- Nâng cấp đồ họa sáng tạo (ngoài headless): Mây tạo hình đám mây bông, sông suối & cầu gỗ trên đảo, xoay/kéo chuột góc nhìn trên xuống, tầm nhìn giảm theo khoảng cách, kỹ năng chém ánh sáng (`Click` / `J`).

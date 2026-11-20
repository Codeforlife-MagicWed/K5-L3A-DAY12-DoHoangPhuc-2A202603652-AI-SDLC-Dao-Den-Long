# ADR-003 — Đổi mô hình trạng thái đèn sang Nhiên liệu & Luật thắng Bình Minh (`Ticket-03`)

- **Trạng thái:** Đã áp dụng (`Phase 3`, `Contract v1.2`)
- **Bối cảnh:** Ở Phase 1–2, đèn sau khi thắp sáng là vĩnh viễn và ván chơi kết thúc ngay khi thắp đủ số đèn (`all_lit`), khiến cuối Đêm thiếu căng thẳng. `Ticket-03` yêu cầu thay thế các luật cũ để tạo vòng lặp bảo vệ và tiếp dầu tới bình minh.

## Quyết định thiết kế

1. **Mô hình nhiên liệu đèn theo đơn vị nguyên `1/60`:**
   - Lưu `fuelUnits` nguyên trong `[0, 6000]` (`6000 = 100.0`), tránh hoàn toàn sai số dấu phẩy động khi hao `1/60` mỗi tick hoặc bị Bóng Mực `drain` `5/60` mỗi tick.
   - Đèn mở rộng các trạng thái: `Chưa sáng (ever_lit=false, cost=10)` → `Đang sáng (fuel >= 30, có safe_radius)` → `Đèn yếu (0 < fuel < 30, mất safe_radius, hút Bóng Mực wander)` → `Tắt do cạn dầu (ever_lit=true, relight_cost=5)`.
   - Tương tác ưu tiên đèn hợp lệ gần nhất (đèn tắt hoặc đèn sáng có `fuelUnits < 6000`); đèn đầy `6000` không được chọn.

2. **Trạng thái `drain` của Bóng Mực:**
   - Bổ sung trạng thái `drain` cho `wander` shade tới gần `<= 2 m` đèn yếu (`fuel < 30`).
   - Tại Step 2 trừ dầu (`1` tự hao + `5` mỗi con `drain`), phát `fuel_drain` mỗi `60` tick; ngay sau Step 2 kiểm tra `fuelUnits <= 0` để tắt đèn (`lantern_out`).

3. **Luật thắng mới & Bảng điểm mới:**
   - Gỡ bỏ hoàn toàn điều kiện thắng sớm `all_lit`. Thắng chỉ xảy ra tại `timeLeftS <= 0` nếu `flames > 0` và số đèn sáng `>= ceil(0.6 * tổng đèn)` (`dawn_survived`).
   - Cập nhật công thức điểm sang `+5` mỗi đom đóm nạp, `+100` thắp mới, `+40` thắp lại, `+5` / `+15` Tỏa Sáng, và thưởng bình minh theo đèn sáng + Ngọn Lửa (bỏ thưởng thời gian).

4. **Xử lý test cũ bị ảnh hưởng:**
   - Test #2 trong `tests/contract.test.js` (trước đây kiểm tra `all_lit` và `+10/đom đóm + thưởng thời gian`) được cập nhật tường minh với ghi chú lý do theo `Ticket-03` để kiểm tra luật mới `dawn_survived`, không skip âm thầm.

## Hệ quả & Ghi chú AI
- Mọi tính năng sáng tạo (Mây tạo hình đám mây, sông suối, đom đóm 3 kích cỡ, chém ánh sáng `slash`) giữ nguyên ở giao diện 3D (`creativeVariants: true`) và tự tắt ở headless (`creativeVariants: false`) để bảo toàn `Contract v1.2`.
- Ước tính token Phase 3: ~30k–38k tokens (tận dụng kiến trúc tách lớp `sim/maps/game` có sẵn từ Phase 2 nên sửa tập trung, không phải viết lại giao diện).

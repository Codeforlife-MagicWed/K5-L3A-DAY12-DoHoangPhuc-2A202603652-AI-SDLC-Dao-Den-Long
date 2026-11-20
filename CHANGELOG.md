# Changelog

## [Phase 4 - Contract v1.3 / v1.0.0] — Ticket-04 "Bình minh: Phát hành v1.0.0"

### Contract & CLI Additions (tương thích ngược với v1.2)
- **Contract version:** Nâng từ `1.2` lên `1.3`; `game.contract.json` bổ sung `run_cmd` (`node src/server/run.js`), `bench_cmd` (`node src/bench/bench.js`) và `soak_cmd` (`node src/headless/soak.js`).
- **Benchmark mode (`src/bench/bench.js`, `?bench=1`):** Tải Đêm 1 tắt hiệu ứng/thực thể sáng tạo, đặt `L1–L3` sáng (`fuel: 100`), sinh `200` Bóng Mực (`wander`) và `100` đom đóm, tắt hao/sát thương/nhặt/spawn/kết thúc Đêm, camera quay vòng bán kính `30 m` ở `Y = 15 m` (`15 s`/vòng ngược chiều kim đồng hồ), bỏ `3 s` khởi động, đo `30 s` xuất `bench.json`.
- **Soak test (`src/headless/soak.js`):** Chạy `10` Đêm xoay vòng `1 -> 2 -> 3` cùng 1 tiến trình với input ngẫu nhiên theo seed và đo `mem_start_mb` / `mem_end_mb` xuất `soak.json`.
- **Local Leaderboard (`src/server/leaderboard.js`, `src/server/run.js`):** Nhập tên `3–12` ký tự (`[A-Za-z0-9_]` và tiếng Việt có dấu) sau Bình Minh hoặc thua, lưu Top 10 bền vững trên đĩa (`~/.dao-den-long/leaderboard.json`), xem từ menu chính, và hỗ trợ `node src/server/run.js --export-leaderboard out.json`.

### Added & Improved
- **Accessibility:** Đổi phím toàn bộ hành động + phát hiện trùng phím + "Khôi phục mặc định"; phụ đề hình ảnh + mũi tên mép màn hình chỉ hướng Bóng Mực mới xuất hiện; tùy chọn Giảm chuyển động (tắt rung & chớp); cỡ chữ tối thiểu `18 px` ở `1280×720` kèm chế độ Chữ lớn (`×1.25`).
- **Đồ họa & Gameplay 3D:** Mây có lồng đèn giấy cầm tay phát sáng; nâng cấp tạo hình Bóng Mực nhiều lớp (áo choàng rách, cầu vai, sừng cong, `6` tua mực, vòng hào quang) kèm **mắt `InstancedMesh` nhìn theo Mây**, hiệu ứng ánh sáng 3D + tối dần theo khoảng cách, sông suối chảy liền mạch + ao hồ + thảm cỏ 3D `InstancedMesh` + cây đa dạng, Menu quay cảnh 3D trực tiếp, **hội thoại hướng dẫn cùng Đăng** (chân dung SVG, gõ chữ, đọc phím thật) và **cảnh điện ảnh Bình Minh 3D**; tăng thời gian choáng của chiêu chém ánh sáng lên **`180` tick (`3.0 s`)** và sửa địa hình/logic tầng Đêm 3.

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

## [Phase 2 - Contract v1.1] — Ticket-02 "Ba hòn đảo"

### Breaking Changes
- **Contract version:** Nâng từ `1.0` lên `1.1`; chuẩn hóa toàn bộ hằng số (`player_speed: 6.0`, `carry_capacity: 10`, `lantern_cost: 10`, `pickup_radius: 1.0`, `interact_radius: 2.0`, `pulse_cost: 3`, `pulse_radius: 5.0`, `fall_enabled: true`, `night1_duration_s: 300`).
- **Tính điểm:** `per_mote: 10` chuyển từ lúc nhặt sang lúc nạp vào đèn; `per_stun: 5`; `per_second_left: 2`.

### Added
- **3 Bản đồ chuẩn:** Đêm 1 – Đảo Bến (`5` đèn), Đêm 2 – Đảo Cau (`6` đèn, cầu tre, `2` bục nhảy), Đêm 3 – Đảo Chuông (`7` đèn, `3` tầng, `2` dốc, tháp chuông, gió thổi).
- **Cơ chế & Thực thể mới:** Lướt (`Dash` `14 m/s`), rơi khỏi đảo (`Y < -10`), Gió Lạc (`Drifter` cướp đom đóm & nhả khi trúng Pulse), Bùa Gió (`Wind Charm`), tạm dừng `Esc`/`P`, Web Audio API và màn hình chuyển Đêm + cài đặt âm lượng/độ nhạy.

## [Phase 1 - Contract v1.0] — PRD-0 "Đêm đầu tiên"

### Added
- Tách lớp mô phỏng thuần (`src/sim/`, 60 tick/s, PRNG tất định) và giao diện 3D Three.js (`src/game/`).
- Chế độ headless CLI (`src/headless/cli.js`) hỗ trợ `--seed`, `--inputs`, `--scenario`, `--ticks`, `--snapshot-every`, `--out`, thoát mã `2` khi input lỗi.
- Gameplay Đêm 1 hoàn chỉnh (Mây, `5` Đèn Lồng Lớn, Bóng Mực, Tỏa Sáng, đom đóm 3 kích cỡ trong 3D) và bộ test hợp đồng `tests/contract.test.js`.

# Spec, Acceptance Criteria & Nhật ký SDLC — Phase 2 (`Ticket-02`)

## 1. Thay đổi thiết kế & Lý do cập nhật test Phase 1
- **Chuẩn hóa số liệu theo `Ticket-02` (`Contract v1.1`):**
  - Đổi các hằng số tự chọn Phase 1 sang số chuẩn (`player_speed: 6.0`, `carry_capacity: 10`, `lantern_cost: 10`, `pickup_radius: 1.0`, `interact_radius: 2.0`, `pulse_cost: 3`, `pulse_radius: 5.0`, `pulse_push_m: 4.0`, `pulse_stun_s: 2.0`, `pulse_cooldown_s: 3.0`, `fall_enabled: true`, `night1_duration_s: 300`).
  - Điểm `+10` (`per_mote`) chuyển từ lúc nhặt sang **lúc nạp vào đèn** (`+10` mỗi đom đóm nạp); `per_stun` đổi từ `25` thành `5`; `per_second_left` đổi từ `5` thành `2`.
  - Cập nhật `tests/contract.test.js` để phản ánh đúng `Contract v1.1` (giữ kiểm tra regression Đêm 1 theo số chuẩn, không tắt test âm thầm).
- **Mở rộng kiến trúc:** Tách bản đồ chuẩn 3 Đêm (`src/sim/maps.js`) ra khỏi vòng lặp tick 12 bước (`src/sim/simulation.js`), thêm `src/game/audio.js` và `src/game/settings.js`.

## 2. Acceptance Criteria cho Phần 3 (`Ticket-02`)

| Tính năng | Tiêu chí nghiệm thu kiểm chứng được |
|---|---|
| **Lướt (Dash)** | Nhấn `Shift` lướt `14 m/s` trong `12` tick (`2.8 m`), giữ nguyên `Y` trên không, hồi chiêu `90` tick (`1.5 s`), phát event `dash {}` |
| **Rơi khỏi đảo (`Y < -10`)** | Vượt mép Đảo Bến/cầu tre rơi xuống `Y < -10` mất `1` Ngọn Lửa (bỏ qua bất tử), mất toàn bộ đom đóm, chờ `60` tick rồi hồi sinh `(0,0,0)` với `90` tick bất tử |
| **3 Bản đồ chuẩn** | Đêm 1 (Đảo Bến 5 đèn), Đêm 2 (Đảo Cau 6 đèn, cầu tre, 2 bục nhảy), Đêm 3 (Đảo Chuông 7 đèn, 3 tầng, 2 dốc, bục nhảy, tháp chuông, gió mạnh) |
| **Gió Lạc (`D1, D2`)** | Sinh ở Đêm 2 & 3 tại tick `1200, 2400...`; đuổi khi Mây mang `>= 5` đom đóm và `<= 15 m`; chạm cướp `min(3, carried)` (`drifter_steal`); bị Pulse khi `flee` thì nhả lại (`drifter_drop`) |
| **Bùa Gió (`C1, C2`)** | Nhặt tăng tốc `7.2 m/s` và Dash không hồi chiêu trong `600` tick (`charm_picked`), hồi lại sau `2700` tick |
| **Chuỗi 3 Đêm & Pause** | Menu → Giới thiệu Đêm (lời Ông Đăng) → Chơi → Kết quả → Đêm kế → Bình Minh (tổng điểm); `Esc`/`P` dừng toàn bộ `sim_tick`, timers và spawn (`paused`/`resumed`) |
| **Cài đặt & Âm thanh** | Âm lượng & độ nhạy chuột lưu vào `localStorage`; WebAudio phát âm nền + đầy đủ hiệu ứng hành động & đếm ngược `10 s` cuối |
| **HUD & Bảng màu chuẩn** | Ngọn Lửa, đồng hồ `mm:ss` đỏ nhấp nháy khi `<= 30 s`, đèn `k/n`, điểm, thanh 10 ô đom đóm, cooldown Dash/Pulse, nhắc `E`, mũi tên chỉ đèn ngoài màn hình, bảng màu chuẩn & ambient `0.15 + 0.55 * lit/total` |

## 3. Nhật ký dùng AI & Quản lý token (Phase 2)
- **Các bước thực hiện:** Đọc `Ticket-02` từ Lab Board -> cập nhật `AGENTS.md`, `SKILL.md`, `game.contract.json` `v1.1` -> tách `src/sim/maps.js` + nâng cấp `simulation.js` theo đúng 12 bước/tick -> viết scenario test cho từng tính năng mới + test hiệu năng 21.600 tick -> dựng 3D & âm thanh & UI 3 Đêm -> chạy `npm test` và `npm run build`.
- **Lưu ý / Lỗi đã phát hiện & xử lý:**
  - Chú ý thay đổi quan trọng: ở `v1.1`, `per_mote: 10` tính khi **nạp** vào đèn (không phải khi nhặt), và chiều cao tháp chuông ở tâm Đêm 3 đặt từ `Y = 6..14` để không chặn không gian tầng 0.
  - Cập nhật theo giải đáp Lab Board: Đêm 3 xuất phát tại `(0, 0, -15)`; Bóng Mực sinh theo lịch ở trạng thái `spawning` đúng `60` tick (1.0 s) rồi chuyển `wander`; Bóng Mực dựng bằng scenario bắt đầu ngay ở `wander`.
  - Sửa lỗi Pause trong `src/game/main.js` (trả `pause: false` sau tick tạm dừng và `blur()` nút UI để `Space` không kích hoạt lại menu).
  - Sửa lỗi chuyển Đêm trong `openNightIntro(night)` (`src/game/main.js`): bổ sung `currentNight = night` để sau khi thắng Đêm 1/2 sẽ vào đúng Đêm 2/3 thay vì lặp lại Đêm 1.
  - Nâng cấp đồ họa 3D trong `src/game/scene.js`: trang phục Mây chi tiết (áo 2 lớp viền vàng, đai đỏ, túi đom đóm, khăn 2 dải, gậy tre, hài gỗ), ánh sáng tối/sáng tập trung quanh nhân vật/đèn/đom đóm, cây cối và bến gỗ quanh đảo (không thay đổi số liệu/bản đồ chuẩn).
- **Ước tính token Phase 2:** ~45k–55k tokens (chia module `maps.js` / `audio.js` / `settings.js` gọn, không lặp logic).

## 4. Đánh giá Phase 2
- **Đạt:** Đồng bộ 100% số liệu chuẩn `v1.1`, qua toàn bộ 13/13 bài test (regression + mọi tính năng mới + giải đáp bổ sung + hiệu năng `21.600` tick ~`1.6 s` <= `30 s`), `vite build` thành công (`1.38 s`), Chrome `1280×720` chạy `0` lỗi app/WebGL/404.
- **Chưa hoàn tất / lưu ý trung thực:** Lần đo FPS `1280×720` đầu tiên trước khi tối ưu đạt `29.83 FPS` (do `devicePixelRatio` nhân buffer lên `2560×1440` và dùng `6` PointLight đom đóm). Đã tối ưu `setPixelRatio(1)`, shadow `512×512` và `2` PointLight nhưng chưa đo lại con số FPS mới trên trình duyệt do quyền `evaluate_script` bị từ chối ở lượt kiểm tra lại. Video demo để sang Phase 4 (CP5).

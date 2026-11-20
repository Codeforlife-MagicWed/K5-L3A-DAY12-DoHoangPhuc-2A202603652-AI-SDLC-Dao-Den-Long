# Evaluation Tổng Hợp & Retrospective — Đảo Đèn Lồng (4 Phases)

## 1. Tổng hợp Evaluation qua 4 Phase

| Phase | Mục tiêu & Contract | Kiểm chứng tự động & Kết quả | Trạng thái |
|---|---|---|---|
| **Phase 1 (`v1.0`)** | Đảo Bến Đêm 1, tách thuần `src/sim/` (60 tick/s) và giao diện 3D, CLI headless | `10/10` test đầu tiên pass; JSONL tất định từng byte; đom đóm 3 kích cỡ tách khỏi headless | **Đạt (`phase-1`)** |
| **Phase 2 (`v1.1`)** | Chuẩn hóa số liệu, 3 Đêm (Đảo Bến / Đảo Cau / Đảo Chuông), Dash, Gió Lạc, Bùa Gió, Pause, Âm thanh | `13/13` test pass; `21.600` tick Đêm 3 < `2 s`; phát hiện và tối ưu pixelRatio/lights | **Đạt (`phase-2`)** |
| **Phase 3 (`v1.2`)** | Nhiên liệu đèn (`100`, hao `1/s`, `5` thắp lại), Bóng Mực `drain` (`5/s`), thắng `dawn_survived` (`>= 60%`), sức chứa `10 -> 20`, mù màu | `18/18` test pass (cập nhật minh bạch test cũ ở ADR-003, không skip âm thầm); thêm Mây, sông suối, `slash` | **Đạt (`phase-3`)** |
| **Phase 4 (`v1.3 / v1.0.0`)** | `bench_cmd` (`1280×720`), `soak_cmd` (`10` Đêm), Leaderboard cục bộ trên đĩa, Accessibility đầy đủ, Live Menu, Bình Minh 3D, Hội thoại Đăng, Sinh thái & Bóng Mực Eye Tracking | **`23/23` test pass**; `soak.json`: `10` đêm, `0` crash, RAM `44.1 -> 48 MB` (`1.09x <= 1.2x`); `bench.json`: **`avg_fps: 59.1`**, **`p1_low_fps: 30`**, **`load_ms: 849 ms`** | **Đạt (`phase-4`, `v1.0.0`)** |

---

## 2. Điều hiệu quả khi làm việc với AI

1. **Kiến trúc tách thuần ngay từ Phase 1 (`src/sim/` vs `src/game/`):**
   Mọi thay đổi luật lớn từ Phase 2 (số liệu chuẩn) sang Phase 3 (mô hình nhiên liệu nguyên `1/60`, trạng thái `drain`) đến Phase 4 (`benchmarkMode`, tăng choáng `slash` lên `180` tick) đều khoanh vùng gọn trong `src/sim/` và `tests/contract.test.js`, gần như không làm vỡ giao diện 3D hoặc headless.
2. **Contract-first + Regression Suite làm lan can an toàn:**
   Mỗi khi sửa `simulation.js` hay `maps.js`, chỉ mất `< 5 giây` chạy `npm test` để xác nhận cả 4 phase không bị thoái lui.
3. **Đo lường thực tế dẫn dắt tối ưu (`bench.js`):**
   Nhờ chạy Puppeteer benchmark thật (`200` Bóng Mực + `100` đom đóm ở `1280×720`), nhóm phát hiện ngay nút thắt draw call (`28.5 FPS`) và chuyển sang `InstancedMesh` + gom geometry (`mergeGeometries`), giữ được cả Bóng Mực nhiều lớp có Eye Tracking, thảm cỏ 3D, ao hồ, hiệu ứng ánh sáng 3D lẫn dòng chảy sông suối liên tục mà vẫn đạt **`59.1 avg_fps`** và **`30 p1_low_fps`** (`frame_ms_p95: 16.8 ms`) ngay trên GPU tích hợp Intel Iris Xe.

---

## 3. Điều chưa hiệu quả & Các lỗi AI đã tạo + Cách phát hiện

| Vấn đề / Lỗi AI gây ra | Nguyên nhân gốc | Cách phát hiện & Khắc phục |
|---|---|---|
| `bench.json` lần đầu chỉ đạt **`28.5 FPS`** (`frame_ms_p95: 55.6`) | Khi nâng cấp đồ họa Bóng Mực (`12` mesh con/con) và đom đóm (`5` mesh con/con), `200` ma + `100` đom đóm tạo ra **`> 3.300` draw calls/frame** | Chạy `node src/bench/bench.js` thực tế thay vì đoán; viết lại `createShadeInstancedPool` và `createMoteInstancedPool` dùng `InstancedMesh` -> tăng vọt lên **`88.2 FPS`**. |
| `load_ms` trong `bench.json` bị cộng dồn gấp đôi (`3439 ms` -> `917 ms`) | Code tính `processStart + firstFrameTime` dù `firstFrameTime` từ `rAF` đã tính từ `timeOrigin` | Đọc lại `bench.json` và đối chiếu trực tiếp đoạn `benchLoop` trong `src/game/main.js`, sửa về `Math.round(firstFrameTime)`. |
| Hai unit test Phase 4 viết mới ban đầu bị fail | Viết assertion `"light_slash"` và `results[0].night` từ trí nhớ thay vì đối chiếu lại tên event `"creative_slash"` và mảng chuỗi của `soak.js` | Chạy `npm test` ngay lập tức, mở đúng dòng ở `simulation.js` và `soak.js` để sửa khớp sự thật code. |
| Lỗi đường dẫn Windows `%20` ở Phase 1 & quên reset `currentNight` ở Phase 2 | Không để ý khoảng trắng tên thư mục khi dùng `pathname`; quên đồng bộ biến trạng thái UI khi qua màn | Kiểm chứng bằng CLI test trên Windows và test chuyển Đêm 1 -> Đêm 2 trực tiếp trên trình duyệt; bổ sung nút dev chọn Đêm để test nhanh mọi màn. |

---

## 4. Công cụ / Harness AI hữu ích nhất

1. **`game.contract.json` + `tests/contract.test.js` (`22` test tự động):** Đóng vai trò "nguồn chân lý thực thi được" (executable spec) cho mọi phase. Mọi con số bị lệch giữa UI, sim và doc đều bật lỗi đỏ ngay lập tức.
2. **`AGENTS.md` + `.agents/skills/verify-contract/SKILL.md`:** Giúp giữ AI đi đúng làn ranh kiến trúc (cấm làm đổi đầu ra headless, bắt buộc cập nhật ADR/CHANGELOG khi phá vỡ tương thích) mà không cần nhắc lại dài dòng ở mỗi prompt.
3. **`bench.js` & `soak.js`:** Vòng phản hồi định lượng cho những thứ unit test không thấy được (tụt FPS trên WebGL, rò rỉ bộ nhớ sau nhiều màn chơi).

---

## 5. Tổng chi phí / Token ước tính & Cách tiết kiệm

- **Ước tính token qua 4 Phase:** Khoảng **`~165k – 200k` tokens** tổng cộng:
  - Phase 1: `~40k` tokens (dựng lõi `sim`, headless CLI, scene 3D ban đầu).
  - Phase 2: `~50k` tokens (chuẩn hóa số liệu, 3 Đêm, WebAudio, Chrome test).
  - Phase 3: `~35k` tokens (mô hình nhiên liệu nguyên, `drain`, ADR, mù màu, nâng cấp sáng tạo).
  - Phase 4: `~45k` tokens (`bench.js`, `soak.js`, server Leaderboard, Accessibility, tối ưu `InstancedMesh`, Retro).
- **Cách tiết kiệm token đã áp dụng hiệu quả:**
  - Giữ `AGENTS.md` cô đọng (~35 dòng lệnh & luật cứng), không nhồi toàn bộ PRD vào mỗi prompt.
  - Chia nhỏ module (`config.js`, `maps.js`, `simulation.js`, `scene.js`, `audio.js`, `settings.js`, `leaderboard.js`) để AI đọc/sửa cục bộ theo dải dòng thay vì đọc lại cả file lớn.
  - Tận dụng `node:test` và WebGL primitives có sẵn, không cài thư viện test hay asset nặng thừa.

---

## 6. Nếu làm lại từ đầu, sẽ làm khác điều gì?

1. **Dùng `InstancedMesh` ngay từ đầu** cho mọi thực thể lặp lại số lượng lớn (đom đóm, Bóng Mực, cây cối) để vừa tự do tạo hình chi tiết vừa không bao giờ chạm trần draw calls.
2. **Viết `bench.js` / kiểm tra FPS tự động sớm hơn (từ Phase 2)** thay vì đợi tới Phase 4 mới chạy stress test `200` Bóng Mực.
3. **Chuẩn hóa kịch bản kiểm thử Playwright/Puppeteer đầu-cuối cho UI** (từ Menu -> chuyển Đêm -> Lưu điểm Leaderboard) song song với test mô phỏng headless.

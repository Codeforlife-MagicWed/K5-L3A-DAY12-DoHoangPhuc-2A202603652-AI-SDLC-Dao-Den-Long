import { TUNING } from "../sim/config.js";
import { getNightMap } from "../sim/maps.js";

export function formatKeyLabel(code) {
  if (!code) return "?";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Space") return "Space";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "Escape") return "Esc";
  return code;
}

export const DANG_PORTRAIT_SVG = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="Chân dung Đăng">
  <defs>
    <radialGradient id="dangBg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#28356b"/>
      <stop offset="100%" stop-color="#0e1430"/>
    </radialGradient>
    <radialGradient id="lanternGlow" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#fff6c2"/>
      <stop offset="65%" stop-color="#ffb347"/>
      <stop offset="100%" stop-color="#ffb347" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#dangBg)" stroke="#f2c14e" stroke-width="2.5"/>
  <!-- Stylized traditional coat -->
  <path d="M24 114 C26 84, 40 76, 60 76 C80 76, 94 84, 96 114 Z" fill="#1e2a5a" stroke="#f2c14e" stroke-width="1.5"/>
  <path d="M48 77 L60 95 L72 77" fill="none" stroke="#c8102e" stroke-width="3.2" stroke-linecap="round"/>
  <!-- Neck & warm face -->
  <rect x="53" y="64" width="14" height="14" rx="5" fill="#f0c7a4"/>
  <circle cx="60" cy="48" r="21" fill="#f4cfb0"/>
  <!-- Hair -->
  <path d="M38 46 C38 26, 82 24, 82 46 C77 35, 65 34, 59 38 C52 34, 43 37, 38 46 Z" fill="#181b2e"/>
  <path d="M40 38 C46 23, 74 23, 80 38" fill="none" stroke="#2c3354" stroke-width="3"/>
  <!-- Warm expressive eyes & gentle smile -->
  <circle cx="52" cy="49" r="2.6" fill="#181b2e"/>
  <circle cx="68" cy="49" r="2.6" fill="#181b2e"/>
  <circle cx="52.8" cy="48.2" r="0.9" fill="#ffffff"/>
  <circle cx="68.8" cy="48.2" r="0.9" fill="#ffffff"/>
  <path d="M54 58 Q60 63 66 58" fill="none" stroke="#8a4b38" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Small glowing lantern & field guide notebook -->
  <circle cx="93" cy="83" r="14" fill="url(#lanternGlow)" opacity="0.65"/>
  <rect x="86" y="75" width="14" height="16" rx="4" fill="#ffb347" stroke="#6b4a2f" stroke-width="1.5"/>
  <line x1="93" y1="69" x2="93" y2="75" stroke="#6b4a2f" stroke-width="2"/>
  <rect x="24" y="84" width="18" height="22" rx="2.5" fill="#c9b48a" stroke="#6b4a2f" stroke-width="1.5" transform="rotate(-8 33 95)"/>
  <line x1="28" y1="90" x2="38" y2="89" stroke="#6b4a2f" stroke-width="1.4"/>
  <line x1="28" y1="95" x2="38" y2="94" stroke="#6b4a2f" stroke-width="1.4"/>
</svg>
`;

export function buildDangDialogueSteps(night, keybinds, effectiveDurationS) {
  const map = getNightMap(night);
  const totalLanterns = map.lanterns.length;
  const reqLit = Math.ceil(TUNING.win_ratio * totalLanterns);
  const durMin = Math.floor(effectiveDurationS / 60);
  const durRem = effectiveDurationS % 60;
  const durText = `${durMin} phút ${durRem > 0 ? `${durRem} giây` : ""}`.trim();

  const kUp = formatKeyLabel(keybinds.moveUp);
  const kLeft = formatKeyLabel(keybinds.moveLeft);
  const kDown = formatKeyLabel(keybinds.moveDown);
  const kRight = formatKeyLabel(keybinds.moveRight);
  const kJump = formatKeyLabel(keybinds.jump);
  const kDash = formatKeyLabel(keybinds.dash);
  const kInteract = formatKeyLabel(keybinds.interact);
  const kPulse = formatKeyLabel(keybinds.pulse);
  const kSlash = formatKeyLabel(keybinds.slash);

  let hazardStep =
    `Coi chừng Bóng Mực! Khi Đèn Lồng còn dưới ${TUNING.low_fuel_threshold}% dầu, vùng an toàn sẽ biến mất và Bóng Mực sẽ lao tới hút 5%/s. ` +
    `Hãy nhấn [${kPulse}] để Tỏa Sáng (tốn 3 đom đóm) hoặc [${kSlash}] / Click chuột trái để Chém Ánh Sáng làm choáng chúng 3 giây!`;

  if (night === 2) {
    hazardStep =
      `Ở Đảo Cau có hai bờ nối bằng cầu tre mỏng và bục nhảy phóng qua lại. Coi chừng Gió Lạc: khi Mây mang từ 5 đom đóm trở lên, chúng sẽ lao tới cướp! ` +
      `Nhớ nhặt Bùa Gió đỏ để chạy nhanh và Lướt không hồi chiêu, dùng [${kPulse}] / [${kSlash}] đẩy lùi Bóng Mực & Gió Lạc.`;
  } else if (night === 3) {
    hazardStep =
      `Đêm cuối trên Đảo Chuông 3 tầng có dốc nghiêng, bục nhảy lên tháp chuông và những cơn Gió mạnh định kỳ (báo trước 2 giây). ` +
      `Hãy giữ dầu cho các đèn trên cao lẫn tầng dưới, dùng [${kPulse}] và [${kSlash}] bảo vệ đèn yếu trước Bóng Mực & Gió Lạc!`;
  }

  return [
    `Chào Mây! Đây là ${map.name}. Nhiệm vụ đêm nay là thắp và giữ ít nhất ${reqLit}/${totalLanterns} Đèn Lồng Lớn còn sáng suốt ${durText} cho tới khi Bình Minh ló dạng.`,
    `Điều khiển hiện tại của bạn: di chuyển [${kUp}${kLeft}${kDown}${kRight}], nhảy [${kJump}], lướt [${kDash}], nhặt đom đóm quanh đảo rồi nhấn [${kInteract}] cạnh đèn để thắp sáng (10 đom đóm) hoặc châm thêm dầu.`,
    hazardStep
  ];
}

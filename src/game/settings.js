const STORAGE_KEY = "dao-den-long-settings-v2";

export const DEFAULT_KEYBINDS = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  jump: "Space",
  dash: "ShiftLeft",
  interact: "KeyE",
  pulse: "KeyF",
  pause: "Escape",
  slash: "KeyJ"
};

export const ACTION_LABELS = {
  moveUp: "Đi lên / Tiến",
  moveDown: "Đi xuống / Lùi",
  moveLeft: "Sang trái",
  moveRight: "Sang phải",
  jump: "Nhảy",
  dash: "Lướt (Dash)",
  interact: "Nạp / Châm dầu",
  pulse: "Tỏa Sáng",
  pause: "Tạm dừng",
  slash: "Chém sáng (3D)"
};

const DEFAULT_SETTINGS = {
  volume: 0.65,
  sensitivity: 0.35,
  colorblind: false,
  reducedMotion: false,
  largeText: false,
  keybinds: { ...DEFAULT_KEYBINDS }
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, keybinds: { ...DEFAULT_KEYBINDS } };
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : DEFAULT_SETTINGS.volume,
      sensitivity: typeof parsed.sensitivity === "number" ? Math.min(1.2, Math.max(0.1, parsed.sensitivity)) : DEFAULT_SETTINGS.sensitivity,
      colorblind: typeof parsed.colorblind === "boolean" ? parsed.colorblind : DEFAULT_SETTINGS.colorblind,
      reducedMotion: typeof parsed.reducedMotion === "boolean" ? parsed.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
      largeText: typeof parsed.largeText === "boolean" ? parsed.largeText : DEFAULT_SETTINGS.largeText,
      keybinds: { ...DEFAULT_KEYBINDS, ...(parsed.keybinds && typeof parsed.keybinds === "object" ? parsed.keybinds : {}) }
    };
  } catch {
    return { ...DEFAULT_SETTINGS, keybinds: { ...DEFAULT_KEYBINDS } };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

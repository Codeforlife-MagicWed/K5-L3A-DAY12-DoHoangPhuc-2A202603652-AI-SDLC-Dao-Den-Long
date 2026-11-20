const STORAGE_KEY = "dao-den-long-settings-v1";

const DEFAULT_SETTINGS = {
  volume: 0.65,
  sensitivity: 0.35,
  colorblind: false
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : DEFAULT_SETTINGS.volume,
      sensitivity: typeof parsed.sensitivity === "number" ? Math.min(1.2, Math.max(0.1, parsed.sensitivity)) : DEFAULT_SETTINGS.sensitivity,
      colorblind: typeof parsed.colorblind === "boolean" ? parsed.colorblind : DEFAULT_SETTINGS.colorblind
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

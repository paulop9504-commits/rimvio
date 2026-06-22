import type { TrendBridgeSettings } from "@/lib/globe/trend-bridge/trend-bridge-types";

const STORAGE_KEY = "rimvio-trend-bridge-v1";

const DEFAULT_SETTINGS: TrendBridgeSettings = {
  enabled: false,
  activeBridgeId: null,
  pulseIntent: "align",
};

function readStorage(): TrendBridgeSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<TrendBridgeSettings>;
    return {
      enabled: parsed.enabled === true,
      activeBridgeId:
        typeof parsed.activeBridgeId === "string" && parsed.activeBridgeId.trim()
          ? parsed.activeBridgeId.trim()
          : null,
      pulseIntent: parsed.pulseIntent === "avoid" ? "avoid" : "align",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeStorage(next: TrendBridgeSettings): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function loadTrendBridgeSettings(): TrendBridgeSettings {
  return readStorage();
}

export function saveTrendBridgeSettings(next: TrendBridgeSettings): void {
  writeStorage(next);
}

export const TREND_BRIDGE_SETTINGS_UPDATED = "rimvio-trend-bridge-settings-updated";

export function patchTrendBridgeSettings(
  patch: Partial<TrendBridgeSettings>,
): TrendBridgeSettings {
  const current = readStorage();
  const next: TrendBridgeSettings = {
    enabled: patch.enabled ?? current.enabled,
    activeBridgeId:
      patch.activeBridgeId !== undefined
        ? patch.activeBridgeId
        : current.activeBridgeId,
    pulseIntent: patch.pulseIntent ?? current.pulseIntent,
  };
  writeStorage(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TREND_BRIDGE_SETTINGS_UPDATED, { detail: next }));
  }
  return next;
}

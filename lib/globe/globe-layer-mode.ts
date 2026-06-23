/** Personal (내 지구) vs platform discovery (밖 지구) — same renderer, different pin layer. */

export type GlobeLayerMode = "personal" | "discovery";

const STORAGE_KEY = "rimvio.globe-layer-mode.v1";

export const GLOBE_LAYER_MODE_UPDATED = "rimvio-globe-layer-mode-updated";

let memory: GlobeLayerMode | null = null;

function isGlobeLayerMode(value: unknown): value is GlobeLayerMode {
  return value === "personal" || value === "discovery";
}

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GLOBE_LAYER_MODE_UPDATED));
  }
}

export function readGlobeLayerMode(): GlobeLayerMode {
  if (memory) {
    return memory;
  }
  if (typeof window === "undefined") {
    return "personal";
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (isGlobeLayerMode(raw)) {
      memory = raw;
      return raw;
    }
  } catch {
    /* sessionStorage unavailable */
  }
  return "personal";
}

export function writeGlobeLayerMode(mode: GlobeLayerMode): GlobeLayerMode {
  memory = mode;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    emitUpdated();
  }
  return mode;
}

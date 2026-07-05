import { touchPairDistance } from "@/lib/globe/globe-map-media-card-size";

export type GlobeInfoFrameId =
  | "brain-surface-video"
  | "brain-surface-info"
  | "brain-surface-preview"
  | "brain-surface-detail"
  | "brain-map-node"
  | "context-media-focus";

export type GlobeInfoFrameLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GlobeInfoFrameViewport = {
  width: number;
  height: number;
};

export type GlobeInfoFramePreset = {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  defaultBand: "top" | "bottom" | "center";
  tone: "dark" | "light";
  /** When set, height follows width (e.g. 16/9 video). */
  aspectRatio?: number | null;
};

const STORAGE_PREFIX = "rimvio-globe-info-frame";

export const GLOBE_INFO_FRAME_BOTTOM_INSET_PX = 104;

export const GLOBE_INFO_FRAME_PRESETS: Record<GlobeInfoFrameId, GlobeInfoFramePreset> = {
  "brain-surface-video": {
    minWidth: 148,
    maxWidth: 360,
    minHeight: 84,
    maxHeight: 220,
    defaultWidth: 216,
    defaultHeight: 122,
    defaultBand: "top",
    tone: "dark",
    aspectRatio: 16 / 9,
  },
  "brain-surface-info": {
    minWidth: 220,
    maxWidth: 420,
    minHeight: 112,
    maxHeight: 360,
    defaultWidth: 304,
    defaultHeight: 148,
    defaultBand: "bottom",
    tone: "light",
  },
  "brain-surface-preview": {
    minWidth: 220,
    maxWidth: 440,
    minHeight: 140,
    maxHeight: 420,
    defaultWidth: 352,
    defaultHeight: 220,
    defaultBand: "bottom",
    tone: "light",
  },
  "brain-surface-detail": {
    minWidth: 240,
    maxWidth: 440,
    minHeight: 160,
    maxHeight: 480,
    defaultWidth: 352,
    defaultHeight: 280,
    defaultBand: "bottom",
    tone: "light",
  },
  "brain-map-node": {
    minWidth: 240,
    maxWidth: 440,
    minHeight: 160,
    maxHeight: 480,
    defaultWidth: 352,
    defaultHeight: 280,
    defaultBand: "bottom",
    tone: "light",
  },
  "context-media-focus": {
    minWidth: 220,
    maxWidth: 480,
    minHeight: 180,
    maxHeight: 520,
    defaultWidth: 320,
    defaultHeight: 360,
    defaultBand: "center",
    tone: "dark",
  },
};

/** @deprecated use GlobeInfoFrameId */
export type BrainSurfaceFrameId = GlobeInfoFrameId;

/** @deprecated use GlobeInfoFrameLayout */
export type BrainSurfaceFrameLayout = GlobeInfoFrameLayout;

/** @deprecated */
export const BRAIN_SURFACE_FRAME_BOTTOM_INSET_PX = GLOBE_INFO_FRAME_BOTTOM_INSET_PX;

/** @deprecated */
export const BRAIN_SURFACE_VIDEO_WIDTH_DEFAULT =
  GLOBE_INFO_FRAME_PRESETS["brain-surface-video"].defaultWidth;
/** @deprecated */
export const BRAIN_SURFACE_VIDEO_WIDTH_MIN =
  GLOBE_INFO_FRAME_PRESETS["brain-surface-video"].minWidth;
/** @deprecated */
export const BRAIN_SURFACE_VIDEO_WIDTH_MAX =
  GLOBE_INFO_FRAME_PRESETS["brain-surface-video"].maxWidth;
/** @deprecated */
export const BRAIN_SURFACE_INFO_WIDTH_DEFAULT =
  GLOBE_INFO_FRAME_PRESETS["brain-surface-info"].defaultWidth;
/** @deprecated */
export const BRAIN_SURFACE_INFO_WIDTH_MIN =
  GLOBE_INFO_FRAME_PRESETS["brain-surface-info"].minWidth;
/** @deprecated */
export const BRAIN_SURFACE_INFO_WIDTH_MAX =
  GLOBE_INFO_FRAME_PRESETS["brain-surface-info"].maxWidth;

function readSafeAreaTopPx(): number {
  if (typeof window === "undefined") {
    return 8;
  }
  const probe = document.createElement("div");
  probe.style.paddingTop = "env(safe-area-inset-top)";
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).paddingTop) || 0;
  document.body.removeChild(probe);
  return value + 6;
}

export function getGlobeInfoFramePreset(frameId: GlobeInfoFrameId): GlobeInfoFramePreset {
  return GLOBE_INFO_FRAME_PRESETS[frameId];
}

export function clampGlobeInfoFrameWidth(
  widthPx: number,
  preset: GlobeInfoFramePreset,
  viewportWidth?: number,
): number {
  const viewport =
    viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 390);
  const cappedMax = Math.min(preset.maxWidth, viewport - 16);
  return Math.round(Math.max(preset.minWidth, Math.min(cappedMax, widthPx)));
}

export function clampGlobeInfoFrameHeight(
  heightPx: number,
  preset: GlobeInfoFramePreset,
  viewportHeight?: number,
): number {
  const viewport =
    viewportHeight ?? (typeof window !== "undefined" ? window.innerHeight : 844);
  const cappedMax = Math.min(
    preset.maxHeight,
    viewport - GLOBE_INFO_FRAME_BOTTOM_INSET_PX - readSafeAreaTopPx(),
  );
  return Math.round(Math.max(preset.minHeight, Math.min(cappedMax, heightPx)));
}

export function resolveHeightFromAspect(
  width: number,
  aspectRatio: number,
  preset: GlobeInfoFramePreset,
  viewportHeight?: number,
): number {
  const raw = Math.round(width / aspectRatio);
  return clampGlobeInfoFrameHeight(raw, preset, viewportHeight);
}

export function resolveDefaultGlobeInfoFrameLayout(
  frameId: GlobeInfoFrameId,
  viewport: GlobeInfoFrameViewport,
): GlobeInfoFrameLayout {
  const preset = getGlobeInfoFramePreset(frameId);
  const width = clampGlobeInfoFrameWidth(preset.defaultWidth, preset, viewport.width);
  const height = preset.aspectRatio
    ? resolveHeightFromAspect(width, preset.aspectRatio, preset, viewport.height)
    : clampGlobeInfoFrameHeight(preset.defaultHeight, preset, viewport.height);

  let top = readSafeAreaTopPx();
  if (preset.defaultBand === "bottom") {
    top = Math.round(viewport.height - GLOBE_INFO_FRAME_BOTTOM_INSET_PX - height);
  } else if (preset.defaultBand === "center") {
    top = Math.round((viewport.height - height) / 2);
  }

  return {
    left: Math.round((viewport.width - width) / 2),
    top,
    width,
    height,
  };
}

/** @deprecated */
export function resolveDefaultFrameLayout(
  frameId: GlobeInfoFrameId,
  viewport: GlobeInfoFrameViewport,
): GlobeInfoFrameLayout {
  return resolveDefaultGlobeInfoFrameLayout(frameId, viewport);
}

/** @deprecated */
export function resolveDefaultVideoFrameLayout(viewport: GlobeInfoFrameViewport) {
  return resolveDefaultGlobeInfoFrameLayout("brain-surface-video", viewport);
}

/** @deprecated */
export function resolveDefaultInfoFrameLayout(viewport: GlobeInfoFrameViewport) {
  return resolveDefaultGlobeInfoFrameLayout("brain-surface-info", viewport);
}

/** @deprecated */
export function clampBrainSurfaceFrameWidth(
  widthPx: number,
  min: number,
  max: number,
  viewportWidth?: number,
) {
  return clampGlobeInfoFrameWidth(
    widthPx,
    { minWidth: min, maxWidth: max } as GlobeInfoFramePreset,
    viewportWidth,
  );
}

function storageKey(frameId: GlobeInfoFrameId): string {
  return `${STORAGE_PREFIX}:${frameId}`;
}

export function readGlobeInfoFrameLayout(
  frameId: GlobeInfoFrameId,
): GlobeInfoFrameLayout | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKey(frameId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<GlobeInfoFrameLayout>;
    if (
      typeof parsed.left !== "number" ||
      typeof parsed.top !== "number" ||
      typeof parsed.width !== "number"
    ) {
      return null;
    }
    const height =
      typeof parsed.height === "number" && Number.isFinite(parsed.height)
        ? parsed.height
        : getGlobeInfoFramePreset(frameId).defaultHeight;
    return { left: parsed.left, top: parsed.top, width: parsed.width, height };
  } catch {
    return null;
  }
}

/** @deprecated */
export const readBrainSurfaceFrameLayout = readGlobeInfoFrameLayout;

export function writeGlobeInfoFrameLayout(
  frameId: GlobeInfoFrameId,
  layout: GlobeInfoFrameLayout,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(storageKey(frameId), JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

/** @deprecated */
export const writeBrainSurfaceFrameLayout = writeGlobeInfoFrameLayout;

export function clampGlobeInfoFramePosition(input: {
  left: number;
  top: number;
  width: number;
  height: number;
  viewport: GlobeInfoFrameViewport;
}): { left: number; top: number } {
  const topInset = readSafeAreaTopPx();
  const maxLeft = Math.max(8, input.viewport.width - input.width - 8);
  const maxTop = Math.max(
    topInset,
    input.viewport.height - input.height - GLOBE_INFO_FRAME_BOTTOM_INSET_PX,
  );
  return {
    left: Math.round(Math.max(8, Math.min(maxLeft, input.left))),
    top: Math.round(Math.max(topInset, Math.min(maxTop, input.top))),
  };
}

/** @deprecated */
export const clampBrainSurfaceFramePosition = clampGlobeInfoFramePosition;

export function normalizeGlobeInfoFrameLayout(
  frameId: GlobeInfoFrameId,
  layout: GlobeInfoFrameLayout,
  viewport: GlobeInfoFrameViewport,
): GlobeInfoFrameLayout {
  const preset = getGlobeInfoFramePreset(frameId);
  const width = clampGlobeInfoFrameWidth(layout.width, preset, viewport.width);
  const height = preset.aspectRatio
    ? resolveHeightFromAspect(width, preset.aspectRatio, preset, viewport.height)
    : clampGlobeInfoFrameHeight(layout.height, preset, viewport.height);
  const clamped = clampGlobeInfoFramePosition({
    left: layout.left,
    top: layout.top,
    width,
    height,
    viewport,
  });
  return { ...clamped, width, height };
}

export { touchPairDistance };

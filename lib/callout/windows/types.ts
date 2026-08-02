/**
 * CalloutWindow — UI state for Floating Reality Object Control Surfaces.
 * Reality Object remains immutable; this is Interaction Layer only.
 */

export const CALLOUT_WINDOW_MODES = [
  "compact",
  "floating",
  "workspace",
] as const;

export type CalloutWindowMode = (typeof CALLOUT_WINDOW_MODES)[number];

export type CalloutWindowPosition = {
  readonly x: number;
  readonly y: number;
};

export type CalloutWindowSize = {
  readonly width: number;
  readonly height: number;
};

/**
 * Floating Window entity (UI) — not a Reality Object.
 */
export type CalloutWindow = {
  readonly id: string;
  readonly entityId: string;
  readonly mode: CalloutWindowMode;
  readonly position: CalloutWindowPosition;
  readonly size: CalloutWindowSize;
  readonly scale: number;
  readonly zIndex: number;
  readonly locked: boolean;
  /**
   * When true, map host projects pin → screen each frame.
   * User drag sets anchored=false (free floating).
   */
  readonly anchored: boolean;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

export const CALLOUT_WINDOW_MAX = 3;

export const CALLOUT_WINDOW_DEFAULT_SIZE: CalloutWindowSize = {
  width: 320,
  height: 420,
};

export const CALLOUT_WINDOW_COMPACT_SIZE: CalloutWindowSize = {
  width: 200,
  height: 56,
};

export const CALLOUT_WINDOW_SCALE_MIN = 0.85;
export const CALLOUT_WINDOW_SCALE_MAX = 1.75;

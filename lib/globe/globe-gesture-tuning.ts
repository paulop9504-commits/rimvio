/** Shared touch feel — fast finger tracking + smooth release. */

export const GLOBE_DRAG_THRESHOLD_PX = 2;

export const GLOBE_INERTIA_FRICTION = 0.936;
export const GLOBE_INERTIA_MIN_SPEED = 0.75;

/**
 * Orbit feel (Three.js OrbitControls):
 * - rotateSpeed: finger→globe tracking (higher = snappier)
 * - dampingFactor: release coast (higher = settles sooner; too low = mushy lag)
 * - zoomSpeed: wheel / native dolly
 */
export const GLOBE_ORBIT_DESKTOP = {
  rotateSpeed: 0.58,
  dampingFactor: 0.1,
  zoomSpeed: 0.95,
} as const;

/** Mobile — 1:1-ish tracking with a short buttery coast. */
export const GLOBE_ORBIT_TOUCH = {
  rotateSpeed: 0.78,
  dampingFactor: 0.082,
  zoomSpeed: 0.92,
} as const;

/** Pinch zoom curve — lower = gentler altitude change per finger spread. */
export const GLOBE_PINCH_ZOOM_EXPONENT = 0.96;

/** Wait after controls "end" before HTML pin rebuild (orbit damping still coasts). */
export const GLOBE_POST_GESTURE_FLUSH_MS = 240;

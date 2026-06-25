/** Shared touch feel — fast finger tracking + smooth release. */

export const GLOBE_DRAG_THRESHOLD_PX = 2;

export const GLOBE_INERTIA_FRICTION = 0.936;
export const GLOBE_INERTIA_MIN_SPEED = 0.75;

export const GLOBE_ORBIT_DESKTOP = {
  rotateSpeed: 0.5,
  dampingFactor: 0.085,
  zoomSpeed: 0.88,
} as const;

export const GLOBE_ORBIT_TOUCH = {
  rotateSpeed: 0.58,
  dampingFactor: 0.058,
  zoomSpeed: 0.82,
} as const;

/** Pinch zoom curve — lower = gentler altitude change per finger spread. */
export const GLOBE_PINCH_ZOOM_EXPONENT = 0.94;

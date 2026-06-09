export type GlobeSurfaceMode = "globe3d" | "flat2d";

/** Enter flat map when 3D camera crosses city scale (hysteresis below). */
export const GLOBE_FLAT_ENTER_ALTITUDE = 0.055;

/** Exit flat map when zooming back out past neighborhood scale. */
export const GLOBE_FLAT_EXIT_ALTITUDE = 0.075;

export function resolveGlobeSurfaceMode(
  current: GlobeSurfaceMode,
  altitude: number,
): GlobeSurfaceMode {
  if (!Number.isFinite(altitude)) {
    return current;
  }
  if (current === "flat2d") {
    return altitude >= GLOBE_FLAT_EXIT_ALTITUDE ? "globe3d" : "flat2d";
  }
  return altitude < GLOBE_FLAT_ENTER_ALTITUDE ? "flat2d" : "globe3d";
}

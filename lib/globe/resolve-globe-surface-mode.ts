import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

export type GlobeSurfaceMode = "globe3d" | "flat2d";

/** Hand off to 2D at city scale — before globe.gl min-distance wall (~0.055). */
export const GLOBE_FLAT_ENTER_ALTITUDE = 0.08;

const FLAT_ENTER_LEVELS = new Set<GlobeDetailLevel>([
  "city",
  "neighborhood",
  "street",
  "pin",
]);

export function shouldEnterFlatMap(input: {
  altitude: number;
  detailLevel?: GlobeDetailLevel;
}): boolean {
  if (input.detailLevel && FLAT_ENTER_LEVELS.has(input.detailLevel)) {
    return true;
  }
  return Number.isFinite(input.altitude) && input.altitude < GLOBE_FLAT_ENTER_ALTITUDE;
}

/** Flat mode exits only via 2D pinch-out — never from damped 3D POV noise. */
export function resolveGlobeSurfaceMode(
  current: GlobeSurfaceMode,
  input: { altitude: number; detailLevel?: GlobeDetailLevel },
): GlobeSurfaceMode {
  if (current === "flat2d") {
    return "flat2d";
  }
  return shouldEnterFlatMap(input) ? "flat2d" : "globe3d";
}

/** Below this camera altitude, slippy tiles replace the equirect overview mosaic. */
export const GLOBE_OVERVIEW_TEXTURE_MAX_ALTITUDE = 0.42;

export function shouldApplyGlobeOverviewTexture(altitude: number): boolean {
  return (
    Number.isFinite(altitude) &&
    altitude >= GLOBE_OVERVIEW_TEXTURE_MAX_ALTITUDE
  );
}

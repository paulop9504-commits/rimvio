/** Discovery search radius (m) → globe.gl ring maxR (angular degrees). */
export function discoveryRadiusMetersToRingDegrees(
  lat: number,
  radiusM: number,
): number {
  const meters = Math.min(4000, Math.max(120, radiusM));
  const metersPerDeg = 111_320 * Math.max(0.35, Math.cos((lat * Math.PI) / 180));
  return Math.min(0.12, Math.max(0.00035, meters / metersPerDeg));
}

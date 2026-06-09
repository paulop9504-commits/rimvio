/** GPS accuracy (m) → globe.gl ring radius (angular degrees). */
export function accuracyMetersToRingDegrees(
  lat: number,
  accuracyM: number | null | undefined,
): number {
  const meters = Math.min(220, Math.max(12, accuracyM ?? 36));
  const metersPerDeg = 111_320 * Math.max(0.35, Math.cos((lat * Math.PI) / 180));
  return Math.min(0.06, Math.max(0.00018, meters / metersPerDeg));
}

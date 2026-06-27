/** Default nearby lodging search radius (m). */
export const LODGING_DISCOVERY_RADIUS_M = 500;

/** Re-fetch when user moves beyond this while session is open. */
export const LODGING_DISCOVERY_RELOCATE_M = 120;

export const LODGING_DISCOVERY_ACCENT_COLORS = [
  "green",
  "blue",
  "orange",
  "purple",
] as const;

export type LodgingDiscoveryAccent =
  (typeof LODGING_DISCOVERY_ACCENT_COLORS)[number];

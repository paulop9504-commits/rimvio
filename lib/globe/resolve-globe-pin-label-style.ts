import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

export type GlobePinLabelStyle = {
  show: boolean;
  size: number;
  dotRadius: number;
  resolution: number;
  altitude: number;
};

/** Toss-style — crisp place names when zoomed in; soft at region scale. */
export function resolveGlobePinLabelStyle(level: GlobeDetailLevel): GlobePinLabelStyle {
  switch (level) {
    case "space":
      return { show: false, size: 0.45, dotRadius: 0.1, resolution: 2, altitude: 0.008 };
    case "region":
      return { show: true, size: 0.52, dotRadius: 0.12, resolution: 2, altitude: 0.006 };
    case "city":
      return { show: true, size: 0.68, dotRadius: 0.14, resolution: 3, altitude: 0.004 };
    case "neighborhood":
      return { show: true, size: 0.88, dotRadius: 0.16, resolution: 3, altitude: 0.003 };
    case "street":
      return { show: true, size: 1.05, dotRadius: 0.18, resolution: 4, altitude: 0.002 };
    case "pin":
      return { show: true, size: 1.2, dotRadius: 0.2, resolution: 4, altitude: 0.0015 };
    default:
      return { show: false, size: 0.5, dotRadius: 0.12, resolution: 2, altitude: 0.006 };
  }
}

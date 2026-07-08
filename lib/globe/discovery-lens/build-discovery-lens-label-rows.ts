import type { DiscoveryLensSession } from "@/lib/globe/discovery-lens/types";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

export type DiscoveryLensLabelRow = {
  id: string;
  lat: number;
  lng: number;
  text: string;
  active: boolean;
};

const LENS_LABEL_ZOOM_LEVELS = new Set<GlobeDetailLevel>([
  "neighborhood",
  "street",
  "pin",
]);

export function shouldShowDiscoveryLensLabels(
  detailLevel: GlobeDetailLevel,
): boolean {
  return LENS_LABEL_ZOOM_LEVELS.has(detailLevel);
}

export function buildDiscoveryLensLabelRows(
  session: DiscoveryLensSession | null | undefined,
  detailLevel: GlobeDetailLevel = "neighborhood",
): DiscoveryLensLabelRow[] {
  if (!session?.lenses.length || !shouldShowDiscoveryLensLabels(detailLevel)) {
    return [];
  }
  return session.lenses.map((lens) => ({
    id: `lens:${lens.id}`,
    lat: lens.center.lat,
    lng: lens.center.lng,
    text: `${lens.id}. ${lens.labelKo}`,
    active: lens.id === session.activeLensId,
  }));
}

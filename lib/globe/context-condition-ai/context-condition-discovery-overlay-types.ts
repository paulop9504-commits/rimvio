import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";

export type ContextConditionDiscoveryRing = {
  lat: number;
  lng: number;
  radiusM: number;
};

export type ContextConditionDiscoveryOverlay = {
  contextEventId: string;
  batchId: string;
  ring: ContextConditionDiscoveryRing;
  routeArcs: readonly GlobeTripArc[];
  /** Active simulation leg — thicker arc on globe. */
  playbackLegIndex?: number | null;
  scenarioBranchId?: string | null;
};

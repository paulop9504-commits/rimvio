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
};

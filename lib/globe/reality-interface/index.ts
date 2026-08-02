/**
 * Globe Reality Interface — read-only projection helpers.
 */

export type {
  GlobeRealityInterfaceModel,
  RealityDesktopLevel,
  RealityDesktopPath,
  RealityNodeKind,
  RealityProjectionNode,
} from "@/lib/globe/reality-interface/types";

export {
  REALITY_DESKTOP_LEVELS,
  REALITY_NODE_KINDS,
  buildKoreaRealityDesktopSeed,
  buildRealityDesktopPath,
  createContextProjectionNode,
  createEntityProjectionNode,
  createRegionNode,
} from "@/lib/globe/reality-interface/types";

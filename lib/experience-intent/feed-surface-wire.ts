/** L1 feed facade — surface wire types without importing surface-engine from feed/. */
export type {
  RankedSurface,
  SurfaceAction,
  SurfaceLifecycle,
  SurfaceType,
} from "@/lib/surface-contract/surface-contract";

export { isFallbackSurface } from "@/lib/surface-engine/surface-ux-state";

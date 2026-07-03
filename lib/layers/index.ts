/**
 * Rimvio Layer Stack — Jobs-style product architecture.
 * Upper layers depend on lower; UI never skips normalization.
 *
 * Surface IA SSOT: `lib/surface-registry/rimvio-surface-ia.ts`
 */

import {
  LEGACY_SURFACE_REDIRECTS,
  SURFACE_ROUTES,
  isPrimaryNavGlobePath,
  type RimvioSurfaceId,
} from "@/lib/surface-registry";

export const RIMVIO_LAYERS = {
  /** L5 — 개인 Intent (future AI): Stack top 1 선정, 버튼 순서·리마인드 시각 */
  intelligence: 5,
  /** L4 — Data: links, facts[], actions[], preferences */
  data: 4,
  /** L3 — Enrichment: Generic → Domain → Intent */
  enrichment: 3,
  /** L2 — Interaction: Share bridge, Now sheet, swipe Done */
  interaction: 2,
  /** L1 — Surface: Globe (home), Field sheet, People, Capture hub */
  surface: 1,
  /** L0 — Philosophy: one thing at a time, 1–2 tap, zero inbox guilt */
  experience: 0,
} as const;

/** @deprecated Use RIMVIO_LAYERS */
export const BLINK_LAYERS = RIMVIO_LAYERS;

/** Primary product surfaces — dev-only routes omitted from bottom nav. */
export type BlinkSurface = RimvioSurfaceId;

export { SURFACE_ROUTES, LEGACY_SURFACE_REDIRECTS, isPrimaryNavGlobePath };

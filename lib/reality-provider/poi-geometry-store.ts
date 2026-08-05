/**
 * POI geometry glow overlay — Projection store (not Commit).
 * One Focus: single active footprint on Context Workspace map.
 */

import type { RealityPoiGeometryObject } from "@/lib/reality-provider/normalize-poi-geometry";

export type PoiGeometryOverlay = RealityPoiGeometryObject & {
  readonly contextEventId: string;
  readonly atIso: string;
};

const listeners = new Set<() => void>();
let overlay: PoiGeometryOverlay | null = null;

function emit(): void {
  for (const l of listeners) l();
}

export function subscribePoiGeometryOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPoiGeometryOverlay(): PoiGeometryOverlay | null {
  return overlay;
}

export function getPoiGeometryOverlayForContext(
  contextEventId: string | null | undefined,
): PoiGeometryOverlay | null {
  const ctx = contextEventId?.trim();
  if (!ctx || !overlay) return null;
  return overlay.contextEventId === ctx ? overlay : null;
}

export function setPoiGeometryOverlay(
  next: PoiGeometryOverlay | null,
): void {
  overlay = next;
  emit();
}

export function projectPoiGeometryOverlay(input: {
  readonly contextEventId: string;
  readonly object: RealityPoiGeometryObject;
}): PoiGeometryOverlay {
  const next: PoiGeometryOverlay = {
    ...input.object,
    contextEventId: input.contextEventId.trim(),
    atIso: new Date().toISOString(),
  };
  overlay = next;
  emit();
  return next;
}

export function clearPoiGeometryOverlay(): void {
  if (!overlay) return;
  overlay = null;
  emit();
}

export function clearPoiGeometryOverlayForTests(): void {
  overlay = null;
  emit();
}

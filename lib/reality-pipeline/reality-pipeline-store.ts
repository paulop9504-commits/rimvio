/**
 * Session snapshot — Ingress → Projection → Explorer handoff per context event.
 * Read-only on Globe; Field consumes for 결재함 + tree.
 */

import type { RealityExplorerSnapshot } from "@/lib/reality-explorer/types";
import type { RealityProjection } from "@/lib/projection-engine/types";

export const REALITY_PIPELINE_VERSION = 1 as const;

export type RealityPipelineSnapshotV1 = {
  readonly version: typeof REALITY_PIPELINE_VERSION;
  readonly contextEventId: string;
  readonly utterance: string;
  readonly destinationLabelKo: string | null;
  readonly projection: RealityProjection;
  readonly explorer: RealityExplorerSnapshot;
  readonly seededAtIso: string;
};

const EVENT_NAME = "rimvio-reality-pipeline";

const byContextEventId = new Map<string, RealityPipelineSnapshotV1>();

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function writeRealityPipelineSnapshot(
  snapshot: RealityPipelineSnapshotV1,
): void {
  const id = snapshot.contextEventId.trim();
  if (!id) {
    return;
  }
  byContextEventId.set(id, snapshot);
  emit();
}

export function readRealityPipelineSnapshot(
  contextEventId: string | null | undefined,
): RealityPipelineSnapshotV1 | null {
  const id = contextEventId?.trim();
  if (!id) {
    return null;
  }
  return byContextEventId.get(id) ?? null;
}

export function clearRealityPipelineSnapshots(): void {
  byContextEventId.clear();
  emit();
}

export function subscribeRealityPipelineStore(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

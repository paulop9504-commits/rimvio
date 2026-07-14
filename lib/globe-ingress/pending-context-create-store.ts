/**
 * Pending Travel Context create — structure only, no Reality Commit until 「생성」.
 * @see docs/RIMVIO_CONTEXT_ANCHOR.md
 */

import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import type { TravelFilledSlots } from "@/lib/experience-run/travel-context-slots";
import type { ExperienceRunProfile } from "@/lib/experience-run/experience-run-types";

export type PendingContextCreateDraft = {
  readonly graphId: string;
  readonly utterance: string;
  readonly compiled: GlobeIngressCompileResult;
  readonly travelSlots: TravelFilledSlots;
  readonly profile: ExperienceRunProfile;
  readonly titleKo: string;
  readonly durationLabelKo: string | null;
  readonly dateLabelKo: string | null;
  readonly anchorLabelKo: string;
  readonly anchorLat: number | null;
  readonly anchorLng: number | null;
  readonly reality: "draft";
  readonly createdAtIso: string;
};

const BY_GRAPH = new Map<string, PendingContextCreateDraft>();

export function writePendingContextCreate(
  draft: PendingContextCreateDraft,
): void {
  const id = draft.graphId.trim();
  if (!id) {
    return;
  }
  BY_GRAPH.set(id, draft);
}

export function readPendingContextCreate(
  graphId: string | null | undefined,
): PendingContextCreateDraft | null {
  const id = graphId?.trim();
  if (!id) {
    return null;
  }
  return BY_GRAPH.get(id) ?? null;
}

export function clearPendingContextCreate(
  graphId: string | null | undefined,
): void {
  const id = graphId?.trim();
  if (!id) {
    return;
  }
  BY_GRAPH.delete(id);
}

export function resetPendingContextCreateForTests(): void {
  BY_GRAPH.clear();
}

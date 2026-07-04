"use client";

import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { reassignCaptureToEvent } from "@/lib/feed/ingest-search-capture";
import { assertCommitPermitted } from "@/lib/context-run/commit-gate";
import {
  clearGlobeKnowledgePlacementPending,
  type GlobeKnowledgePlacementPending,
} from "@/lib/globe/globe-knowledge-placement-pending";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import {
  commitKnowledgeToProjection,
  composeBrainProjectionManifest,
} from "@/lib/situation-projection/compose-brain-projection";
import { readProjectionManifestForAnchor } from "@/lib/situation-projection/projection-store";

export type ConfirmKnowledgePlacementResult =
  | { ok: true; anchorEventId: string; knowledgeBoxLabel: string }
  | { ok: false; reason: "anchor_missing" | "projection_failed" };

/** User confirmed card — reattach capture if needed, then promote knowledge projection link. */
export function confirmKnowledgePlacementCapture(
  pending: GlobeKnowledgePlacementPending,
): ConfirmKnowledgePlacementResult {
  const anchor = findLifeEventCandidate(pending.suggestion.anchorEventId);
  if (!anchor) {
    return { ok: false, reason: "anchor_missing" };
  }

  let manifest = readProjectionManifestForAnchor(anchor.id);
  if (!manifest) {
    manifest = composeBrainProjectionManifest({
      event: anchor,
      trigger: { source: "manual", atIso: new Date().toISOString() },
    });
  }

  const pill =
    manifest.pills.find(
      (row) =>
        row.id === pending.pillId ||
        row.linkedNodeId === pending.suggestion.ghostNodeId ||
        row.ghostAxisId === "insurance",
    ) ?? null;

  const captureEventId = pending.captureEventId.trim();
  const anchorEventId = pending.suggestion.anchorEventId.trim();
  const fragmentId = pending.captureFragmentId.trim();

  if (captureEventId && fragmentId && captureEventId !== anchorEventId) {
    const source = findLifeEventCandidate(captureEventId);
    const fragment = source
      ? readFeedCaptureFragments(source).find(
          (row) =>
            row.id === fragmentId || row.mediaContextId?.trim() === fragmentId,
        )
      : null;
    if (fragment) {
      assertCommitPermitted({
        risk: "none",
        autoEnvelope: "photo_attach",
      });
      reassignCaptureToEvent({
        fragment,
        event: anchor,
        match: {
          eventId: anchor.id,
          eventTitle: anchor.title,
          confidence: "high",
          score: 0.95,
          placeLabel: anchor.place ?? null,
          dayLabel: null,
          reason: pending.suggestion.knowledgeBoxLabel,
        },
        fromEventId: captureEventId,
        userConfirmedTarget: true,
      });
      syncPersonalGlobePinFromEvent(anchor.id);
      syncPersonalGlobePinFromEvent(captureEventId);
    }
  }

  const promoted = commitKnowledgeToProjection({
    anchorEventId: anchor.id,
    ghostNodeId: pending.suggestion.ghostNodeId,
    pillId: pill?.id ?? pending.pillId ?? null,
  });
  if (!promoted) {
    return { ok: false, reason: "projection_failed" };
  }

  clearGlobeKnowledgePlacementPending();
  return {
    ok: true,
    anchorEventId: anchor.id,
    knowledgeBoxLabel: pending.suggestion.knowledgeBoxLabel,
  };
}

export function dismissKnowledgePlacementCapture(): void {
  clearGlobeKnowledgePlacementPending();
}

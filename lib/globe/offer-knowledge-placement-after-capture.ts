"use client";

import {
  findLifeEventCandidate,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import type { GlobeBulkMediaIngestSummary } from "@/lib/feed/ingest-globe-context-media";
import {
  type GlobeKnowledgePlacementPending,
  stashGlobeKnowledgePlacementPending,
} from "@/lib/globe/globe-knowledge-placement-pending";
import { suggestKnowledgePlacement } from "@/lib/situation-projection/promote-projection-link";
import { readProjectionManifestForAnchor } from "@/lib/situation-projection/projection-store";

function resolveLastCaptureOutcome(summary: GlobeBulkMediaIngestSummary) {
  const outcomes = summary.outcomes ?? [];
  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    const row = outcomes[index];
    if (!row || row.stagedToPool) {
      continue;
    }
    return row;
  }
  return null;
}

/** After capture ingest — deterministic suggestion; no truth write until user confirms card. */
export function maybeOfferKnowledgePlacementAfterCapture(input: {
  files: readonly File[];
  summary: GlobeBulkMediaIngestSummary;
}): GlobeKnowledgePlacementPending | null {
  if (input.summary.succeeded === 0 || input.summary.poolStaged === input.summary.succeeded) {
    return null;
  }

  const outcome = resolveLastCaptureOutcome(input.summary);
  const captureEventId = outcome?.result.event.id?.trim() || input.summary.lastEventId?.trim();
  const captureFragmentId =
    outcome?.result.fragment.id?.trim() ||
    outcome?.result.fragment.mediaContextId?.trim();
  if (!captureEventId || !captureFragmentId) {
    return null;
  }

  const captureFileName = input.files
    .map((file) => file.name.trim())
    .filter(Boolean)
    .join(" ");

  const suggestion = suggestKnowledgePlacement({
    captureFileName,
    candidateEvents: listLifeEventCandidates(),
  });
  if (!suggestion) {
    return null;
  }

  if (!findLifeEventCandidate(suggestion.anchorEventId)) {
    return null;
  }

  const manifest = readProjectionManifestForAnchor(suggestion.anchorEventId);
  const pill =
    manifest?.pills.find(
      (row) =>
        row.linkedNodeId === suggestion.ghostNodeId || row.ghostAxisId === "insurance",
    ) ?? null;

  const pending: GlobeKnowledgePlacementPending = {
    suggestion,
    captureEventId,
    captureFragmentId,
    captureFileName: captureFileName || null,
    pillId: pill?.id ?? null,
  };

  stashGlobeKnowledgePlacementPending(pending);
  return pending;
}

"use client";

import { buildCanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";
import { GLOBE_CONTEXT_NOTE_KEY } from "@/lib/globe/pin-context-note";
import { syncGlobeContextCardCoords } from "@/lib/globe/globe-context-card-coords";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import type { BrainSurfaceMemoCommitDraft } from "@/lib/situation-projection/brain-surface-types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export async function commitBrainSurfaceMemoPin(input: {
  anchorEventId: string;
  draft: BrainSurfaceMemoCommitDraft;
}) {
  const anchor = findLifeEventCandidate(input.anchorEventId);
  const nowIso = new Date().toISOString();
  const saved = commitEventUpsert({
    title: input.draft.title,
    category: anchor?.category ?? "travel",
    source: anchor?.source ?? "message",
    lifecycle: "active",
    datetime: anchor?.datetime,
    place: input.draft.placeLabel,
    containerId: anchor?.containerId,
    confidence: 0.86,
    metadata: {
      [GLOBE_CONTEXT_NOTE_KEY]: input.draft.note,
      sourceMessage: `${input.draft.placeLabel} ${input.draft.note}`,
      brainSurfaceMemo: true,
      anchorEventId: input.anchorEventId,
      brainSurfaceCommittedAt: nowIso,
    },
    lifecycleUpdatedAt: nowIso,
  });
  const located = syncGlobeContextCardCoords(saved, input.draft.placeLabel, {
    lat: input.draft.lat,
    lng: input.draft.lng,
    label: input.draft.placeLabel,
    placeProfile: buildCanonicalPlaceProfile({
      lat: input.draft.lat,
      lng: input.draft.lng,
      label: input.draft.placeLabel,
      anchorSource: "event_pin",
      confidence: 0.94,
    }),
  });
  syncPersonalGlobePinFromEvent(located.id);
  return located;
}

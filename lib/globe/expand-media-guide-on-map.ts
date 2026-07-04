import type { EventCandidate } from "@/lib/events/event-candidate";
import { dispatchGlobeBrainProjectionRequest } from "@/lib/globe/brain/globe-brain-projection-bridge";
import { recordContextHubTelemetry } from "@/lib/globe/context-hub/record-context-hub-telemetry";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import { patchMediaGuideCandidatesToProjection } from "@/lib/situation-projection/compose-brain-projection";

export function mediaGuideHasMapCandidates(guide: MediaGuideNode): boolean {
  return guide.inferredPlaceCandidates.length > 0;
}

export function pickPrimaryExpandableMediaGuide(
  guides: readonly MediaGuideNode[],
): MediaGuideNode | null {
  const ranked = [...guides].sort(
    (left, right) => right.relevanceScore - left.relevanceScore,
  );
  return ranked.find(mediaGuideHasMapCandidates) ?? null;
}

export function countExpandableMediaGuideCandidates(
  guides: readonly MediaGuideNode[],
): number {
  return guides.reduce(
    (sum, guide) =>
      sum + (mediaGuideHasMapCandidates(guide) ? guide.inferredPlaceCandidates.length : 0),
    0,
  );
}

export function expandMediaGuideOnMap(input: {
  event: EventCandidate;
  guide: MediaGuideNode;
  telemetryLabel?: string;
}): boolean {
  if (!mediaGuideHasMapCandidates(input.guide)) {
    return false;
  }
  recordContextHubTelemetry({
    event: input.event,
    kind: "clicked",
    label: input.telemetryLabel ?? `guide:${input.guide.sourceKind}:expand_map`,
  });
  const manifest = patchMediaGuideCandidatesToProjection({
    event: input.event,
    guide: input.guide,
  });
  if (!manifest) {
    return false;
  }
  dispatchGlobeBrainProjectionRequest({ anchorEventId: manifest.anchorEventId });
  return true;
}

export function expandMediaGuidesOnMap(input: {
  event: EventCandidate;
  guides: readonly MediaGuideNode[];
}): boolean {
  const guide = pickPrimaryExpandableMediaGuide(input.guides);
  if (!guide) {
    return false;
  }
  return expandMediaGuideOnMap({ event: input.event, guide });
}

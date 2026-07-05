import type { EventCandidate } from "@/lib/events/event-candidate";
import type { LodgingAgentMapPinWire } from "@/lib/globe/lodging-agent/types";
import { computeMindMapLayout } from "@/lib/situation-projection/compute-mind-map-layout";
import { composeBrainProjectionManifest } from "@/lib/situation-projection/compose-brain-projection";
import {
  readProjectionManifestForAnchor,
  writeProjectionManifest,
} from "@/lib/situation-projection/projection-store";
import type {
  GhostProjectionNode,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";

function axisIdFromPinType(
  type: LodgingAgentMapPinWire["type"],
): GhostProjectionNode["axisId"] {
  switch (type) {
    case "lodging":
      return "lodging";
    case "eatery":
    case "cafe":
      return "eatery";
    case "info":
      return "info";
    default:
      return "place";
  }
}

function buildAgentGhostNode(input: {
  pin: LodgingAgentMapPinWire;
  hostPlaceId: string;
  batchId: string;
  index: number;
}): GhostProjectionNode {
  const placeId =
    input.pin.placeId?.trim() ||
    `lodging-agent:${input.hostPlaceId}:${input.batchId}:${input.index}`;
  return {
    kind: "ghost",
    id: `ghost:lodging-agent:${input.batchId}:${placeId}`,
    axisId: axisIdFromPinType(input.pin.type),
    label: input.pin.text,
    virtual: true,
    inferred: true,
    featureId: input.pin.type === "lodging" ? "lodging" : "eatery_search",
    actionKind: "context_run",
    hubServiceId: input.pin.type === "lodging" ? "lodging" : "eatery",
    searchQuery: input.pin.text,
    placeId,
    lat: input.pin.lat,
    lng: input.pin.lng,
    surfacePlacement: "map_anchor",
    emphasis: input.index === 0 ? "main" : "aux",
    candidateOrigin: "lodging_agent",
    candidateBadgeKo: "숙소 가이드",
    candidateConfidence: 0.82,
    previewImageUrl: input.pin.previewImageUrl ?? null,
    cuisineHint:
      input.pin.type === "cafe"
        ? "카페"
        : input.pin.type === "eatery"
          ? "맛집"
          : null,
    playbookReasonKo: `${input.pin.text} — 숙소 가이드 추천`,
    relationLabelKo: "근처",
    relationReasonKo: "숙소 가이드가 찾은 후보",
  };
}

function ensureManifest(event: EventCandidate): SituationProjectionManifest {
  return (
    readProjectionManifestForAnchor(event.id) ??
    composeBrainProjectionManifest({
      event,
      trigger: { source: "manual", atIso: new Date().toISOString() },
      persist: false,
      requestLlmLayout: false,
    })
  );
}

/** Agent tool results → Ghost Pin on projection manifest (not Solid until user commits). */
export function patchLodgingAgentGhostsToProjection(input: {
  event: EventCandidate;
  hostPlaceId: string;
  mapPins: readonly LodgingAgentMapPinWire[];
  batchId?: string;
}): SituationProjectionManifest | null {
  if (input.mapPins.length === 0) {
    return readProjectionManifestForAnchor(input.event.id);
  }

  const current = ensureManifest(input.event);
  const batchId = input.batchId?.trim() || `lodging-agent-${Date.now()}`;
  const agentGhosts = input.mapPins.map((pin, index) =>
    buildAgentGhostNode({
      pin,
      hostPlaceId: input.hostPlaceId,
      batchId,
      index,
    }),
  );

  const preservedGhosts = current.nodes.filter(
    (node): node is GhostProjectionNode =>
      node.kind === "ghost" && node.candidateOrigin !== "lodging_agent",
  );
  const solids = current.nodes.filter((node) => node.kind === "solid");
  const nextNodes = [...solids, ...preservedGhosts, ...agentGhosts];

  let next: SituationProjectionManifest = {
    ...current,
    manifestId: `sp-${input.event.id}-${Date.now()}`,
    nodes: nextNodes,
    composedAt: new Date().toISOString(),
    layoutSource: "deterministic",
    readOnly: true,
  };
  next = {
    ...next,
    mindMapLayout: computeMindMapLayout(next),
  };
  writeProjectionManifest(next);
  return next;
}

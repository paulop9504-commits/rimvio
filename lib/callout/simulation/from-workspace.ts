/**
 * Project Workspace → Simulation Current Reality / Proposal / Anchors.
 */

import { buildNodePreview } from "@/lib/context-workspace/build-node-preview";
import type {
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import { findRealityDraftDayForNode } from "@/lib/context-workspace/reality-draft/build-reality-draft";
import { domainLabelKo } from "@/lib/context-workspace/types";
import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";
import type {
  CurrentRealitySnapshot,
  SimulationItineraryAnchor,
  SimulationProposal,
} from "@/lib/callout/simulation/types";

export function buildCurrentRealityFromWorkspace(input: {
  state: ContextWorkspaceState;
  node: ContextWorkspaceNode;
}): CurrentRealitySnapshot {
  const preview = buildNodePreview(input.node, input.state);
  const day = input.state.realityDraft
    ? findRealityDraftDayForNode(input.state.realityDraft, input.node.id)
    : null;
  const priceLabelKo =
    preview.price &&
    preview.price !== "가격 미정" &&
    preview.price !== "—"
      ? preview.price
      : null;
  return {
    objectId: input.node.id,
    title: input.node.title,
    typeLabelKo: domainLabelKo(input.node.kind),
    priceWon: parseWonAmount(priceLabelKo ?? input.node.amountLabel),
    priceLabelKo,
    lat: input.node.lat,
    lng: input.node.lng,
    dayLabelKo: day?.labelKo ?? null,
  };
}

export function buildSimulationProposalFromNode(input: {
  state: ContextWorkspaceState;
  node: ContextWorkspaceNode;
}): SimulationProposal {
  const preview = buildNodePreview(input.node, input.state);
  const priceLabelKo =
    preview.price &&
    preview.price !== "가격 미정" &&
    preview.price !== "—"
      ? preview.price
      : null;
  return {
    objectId: input.node.id,
    title: input.node.title,
    priceWon: parseWonAmount(priceLabelKo ?? input.node.amountLabel),
    priceLabelKo,
    lat: input.node.lat,
    lng: input.node.lng,
  };
}

export function buildSimulationAnchorsFromWorkspace(
  state: ContextWorkspaceState,
): readonly SimulationItineraryAnchor[] {
  const draft = state.realityDraft;
  if (draft?.days?.length) {
    const out: SimulationItineraryAnchor[] = [];
    for (const day of draft.days) {
      for (const n of day.nodes) {
        if (!Number.isFinite(n.lat) || !Number.isFinite(n.lng)) continue;
        if (n.entityKind === "hotel") continue;
        out.push({
          day: day.day,
          labelKo: day.labelKo,
          lat: n.lat,
          lng: n.lng,
          nodeId: n.nodeId,
        });
      }
    }
    if (out.length > 0) return out;
  }

  return state.nodes
    .filter((n) => n.visible && n.kind !== "lodging")
    .slice(0, 8)
    .map((n) => ({
      day: 1,
      labelKo: "Day 1",
      lat: n.lat,
      lng: n.lng,
      nodeId: n.id,
    }));
}

/**
 * Build Callout session projections from Context Workspace state.
 */

import { buildNodePreview } from "@/lib/context-workspace/build-node-preview";
import type {
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import type {
  CalloutGraphAlternative,
  CalloutGraphNeighbor,
} from "@/lib/callout/build-callout-model";
import { rimvioObjectFromWorkspaceNode } from "@/lib/callout/resolve-rimvio-object";
import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";
import type { RimvioObject } from "@/lib/callout/types";
import { findRealityDraftDayForNode } from "@/lib/context-workspace/reality-draft/build-reality-draft";

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function draftDayLabel(
  state: ContextWorkspaceState,
  nodeId: string,
): string | null {
  if (!state.realityDraft) return null;
  return findRealityDraftDayForNode(state.realityDraft, nodeId)?.labelKo ?? null;
}

export function buildRimvioObjectFromWorkspace(input: {
  contextId: string;
  state: ContextWorkspaceState;
  node: ContextWorkspaceNode;
}): RimvioObject {
  const preview = buildNodePreview(input.node, input.state);
  const neighbors = buildCalloutNeighborsFromWorkspace(
    input.state,
    input.node.id,
  ).map((n) => {
    const other = input.state.nodes.find((x) => x.id === n.objectId);
    return {
      ...n,
      lat: other?.lat ?? null,
      lng: other?.lng ?? null,
    };
  });
  return rimvioObjectFromWorkspaceNode({
    node: input.node,
    preview,
    contextId: input.contextId,
    draftDayLabelKo: draftDayLabel(input.state, input.node.id),
    neighbors,
    edges: input.state.relationshipEdges ?? [],
  });
}

export function buildCalloutNeighborsFromWorkspace(
  state: ContextWorkspaceState,
  objectId: string,
): readonly CalloutGraphNeighbor[] {
  const fromEdges: CalloutGraphNeighbor[] = [];
  for (const e of state.relationshipEdges ?? []) {
    if (e.fromId !== objectId && e.toId !== objectId) continue;
    const otherId = e.fromId === objectId ? e.toId : e.fromId;
    const node = state.nodes.find((n) => n.id === otherId);
    if (!node) continue;
    fromEdges.push({
      objectId: node.id,
      title: node.title,
      kindKey: String(node.kind),
      labelKo: e.labelKo || node.title,
      meters: e.meters,
    });
  }

  if (fromEdges.length > 0) return fromEdges;

  const current = state.nodes.find((n) => n.id === objectId);
  if (!current) return [];

  return state.nodes
    .filter((n) => n.id !== objectId && n.visible)
    .map((n) => ({
      objectId: n.id,
      title: n.title,
      kindKey: String(n.kind),
      labelKo: n.title,
      meters: Math.round(
        haversineMeters(
          { lat: current.lat, lng: current.lng },
          { lat: n.lat, lng: n.lng },
        ),
      ),
    }))
    .sort((a, b) => (a.meters ?? 0) - (b.meters ?? 0))
    .slice(0, 8);
}

export function buildCalloutAlternativesFromWorkspace(
  state: ContextWorkspaceState,
  objectId: string,
): readonly CalloutGraphAlternative[] {
  const current = state.nodes.find((n) => n.id === objectId);
  if (!current) return [];

  const compareSet = new Set(state.compareIds);
  const pool = state.nodes.filter(
    (n) => n.id !== objectId && n.visible && n.kind === current.kind,
  );

  const ranked = pool
    .map((n) => {
      const preview = buildNodePreview(n, state);
      const priceLabelKo =
        preview.price &&
        preview.price !== "가격 미정" &&
        preview.price !== "—"
          ? preview.price
          : null;
      return {
        objectId: n.id,
        title: n.title,
        priceLabelKo,
        priceWon: parseWonAmount(priceLabelKo ?? n.amountLabel),
        metersFromCurrent: Math.round(
          haversineMeters(
            { lat: current.lat, lng: current.lng },
            { lat: n.lat, lng: n.lng },
          ),
        ),
        rating: n.rating,
        lat: n.lat,
        lng: n.lng,
        prefer: compareSet.has(n.id) ? 2 : n.selected || n.bookmarked ? 1 : 0,
      };
    })
    .sort((a, b) => b.prefer - a.prefer || (a.metersFromCurrent ?? 0) - (b.metersFromCurrent ?? 0))
    .slice(0, 3);

  return ranked.map(({ prefer: _p, ...rest }) => rest);
}

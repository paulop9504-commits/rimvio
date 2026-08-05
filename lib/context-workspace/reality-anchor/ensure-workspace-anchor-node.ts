/**
 * Ensure Anchor Object exists as a Workspace node (Reality Anchor Projection).
 */

import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { SpatialAnchorResolved } from "@/lib/spatial-retrieval/types";

function anchorWorkspaceKind(
  kind: string,
): ContextWorkspaceNode["kind"] {
  if (kind === "hotel" || kind === "lodging") return "lodging";
  if (kind === "station" || kind === "amenity") return "amenity";
  if (kind === "restaurant" || kind === "cafe") return "eatery";
  return "poi";
}

function withLocateTag(node: ContextWorkspaceNode): ContextWorkspaceNode {
  if (
    node.tags.includes("place_locate") ||
    node.tags.includes("address_locate")
  ) {
    return node;
  }
  return { ...node, tags: [...node.tags, "place_locate"] };
}

/**
 * Upsert Anchor into Workspace if missing — returns node id.
 * When `mapOnlyLocate` is true, tag as place_locate so UI never opens Object Place panel.
 */
export function ensureWorkspaceAnchorNode(input: {
  readonly contextEventId: string;
  readonly anchor: SpatialAnchorResolved;
  readonly geoId?: string | null;
  readonly summaryKo?: string | null;
  /** 「어디야」 / address pick — map + glow only, no place sheet */
  readonly mapOnlyLocate?: boolean;
}): string | null {
  const contextEventId = input.contextEventId.trim();
  const state = readContextWorkspace(contextEventId);
  if (!state) return null;

  const lat = input.anchor.lat;
  const lng = input.anchor.lng;
  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  const placeId =
    input.geoId?.trim() ||
    input.anchor.entityId ||
    `anchor:${input.anchor.titleKo}`;

  const existing =
    state.nodes.find(
      (n) =>
        n.id === input.anchor.entityId ||
        n.placeId === placeId ||
        n.placeId === input.anchor.entityId ||
        (n.kind === "poi" &&
          /usj|유니버설|유니버셜|universal/iu.test(n.title) &&
          /usj|유니버설|유니버셜|universal/iu.test(input.anchor.titleKo)),
    ) ?? null;

  if (existing) {
    if (input.mapOnlyLocate) {
      const tagged = withLocateTag(existing);
      if (tagged !== existing) {
        writeContextWorkspace({
          ...state,
          nodes: state.nodes.map((n) => (n.id === existing.id ? tagged : n)),
          updatedAtIso: new Date().toISOString(),
        });
      }
    }
    applyWorkspaceTransition({
      contextEventId,
      op: "select",
      nodeIds: [existing.id],
      changeKo: `Anchor · ${existing.title}`,
    });
    return existing.id;
  }

  const nodeKind = anchorWorkspaceKind(input.anchor.kind);
  const domain =
    nodeKind === "lodging"
      ? "lodging"
      : nodeKind === "eatery"
        ? "eatery"
        : "poi";

  const next = input.mapOnlyLocate
    ? applyWorkspaceTransition({
        contextEventId,
        op: "add_nodes",
        domain,
        addHits: [
          {
            id: placeId,
            labelKo: input.anchor.titleKo || input.anchor.labelKo,
            domain,
            lat,
            lng,
            rating: null,
            walkMinutes: null,
            reservable: false,
            localFavorite: false,
            priceBand: null,
            source: "maps",
            reasonKo: input.summaryKo ?? `${input.anchor.labelKo} 위치`,
            activitySubtype: "place_locate",
          },
        ],
        changeKo: `위치 · ${input.anchor.labelKo}`,
      })
    : applyWorkspaceTransition({
        contextEventId,
        op: "add_nodes",
        domain,
        addCandidates: [
          {
            id: placeId,
            labelKo: input.anchor.titleKo || input.anchor.labelKo,
            lat,
            lng,
            rating: null,
            walkMinutes: null,
            amountLabel: null,
            priceBand: null,
            source: "reality_anchor",
          },
        ],
        changeKo: `Anchor + ${input.anchor.labelKo}`,
      });

  const added =
    next?.nodes.find(
      (n) =>
        n.placeId === placeId ||
        n.title === input.anchor.titleKo ||
        n.id.includes(placeId),
    ) ?? null;

  if (added) {
    applyWorkspaceTransition({
      contextEventId,
      op: "select",
      nodeIds: [added.id],
      changeKo: `위치 · ${added.title}`,
    });
    return added.id;
  }

  return null;
}

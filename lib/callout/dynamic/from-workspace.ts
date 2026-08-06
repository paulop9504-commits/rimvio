/**
 * Build Dynamic Callout input from live Context Workspace + Entity.
 * Matches live DynamicCalloutInput (no parallel workspace slice / imageUrl fields).
 */

import type {
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import { resolveVenueVisualsFromNode } from "@/lib/callout/dynamic/venue-visuals";
import type {
  DynamicCalloutInput,
  DynamicCalloutIntent,
  DynamicCalloutObject,
} from "@/lib/callout/dynamic/types";

export function dynamicObjectFromWorkspaceNode(
  node: ContextWorkspaceNode,
): DynamicCalloutObject {
  const visuals = resolveVenueVisualsFromNode(node);
  return {
    id: node.id,
    title: node.title,
    type: node.kind,
    priceLabelKo: node.amountLabel,
    priceWon: null,
    whyLinesKo: node.summaryKo?.trim() ? [node.summaryKo.trim()] : [],
    evidence: [
      {
        id: "price",
        title: "가격",
        value: node.amountLabel ?? "—",
        present: Boolean(node.amountLabel),
      },
      {
        id: "rating",
        title: "평점",
        value: node.rating != null ? String(node.rating) : "—",
        present: node.rating != null,
      },
      {
        id: "photo",
        title: "사진",
        value:
          visuals.galleryUrls.length > 0
            ? `${visuals.galleryUrls.length}장`
            : "—",
        present: visuals.galleryUrls.length > 0,
      },
    ],
    canPrepare: node.kind === "lodging" || node.kind === "eatery",
  };
}

/**
 * Workspace entity → DynamicCalloutInput for schema generation.
 */
export function buildDynamicCalloutInputFromWorkspace(input: {
  readonly state: ContextWorkspaceState;
  readonly entityId?: string | null;
  readonly intent?: DynamicCalloutIntent | null;
}): DynamicCalloutInput | null {
  const state = input.state;
  const entityId = input.entityId?.trim();
  const node =
    (entityId
      ? state.nodes.find((n) => n.id === entityId || n.placeId === entityId)
      : null) ??
    state.nodes.find((n) => n.selected) ??
    state.nodes.find((n) => n.visible) ??
    null;
  if (!node) return null;

  const lastPatch = state.patches?.[state.patches.length - 1] ?? null;
  const intent: DynamicCalloutIntent | null =
    input.intent ??
    (lastPatch
      ? {
          action: lastPatch.kind,
          target: node.kind,
          rawText: lastPatch.utterance,
        }
      : null);

  return {
    object: dynamicObjectFromWorkspaceNode(node),
    context: {
      contextId: state.contextEventId,
      titleKo: state.summaryKo || state.query || "Workspace",
      purposeKo: state.domain,
      situationKo: lastPatch?.statusKo ?? state.lastChangeKo,
    },
    intent,
    agent: null,
  };
}

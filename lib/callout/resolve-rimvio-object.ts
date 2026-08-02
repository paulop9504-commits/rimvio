/**
 * Project Workspace / Context nodes → RimvioObject (Callout SSOT entity).
 */

import { buildObserveEvidence } from "@/lib/callout/build-observe-evidence";
import type { ObserveEvidenceNeighbor } from "@/lib/callout/build-observe-evidence";
import type { ContextWorkspaceNode, ContextWorkspaceRelationshipEdge } from "@/lib/context-workspace/types";
import type { NodePreviewModel } from "@/lib/context-workspace/build-node-preview";
import type {
  CalloutAction,
  RimvioObject,
  RimvioObjectState,
  RimvioObjectType,
} from "@/lib/callout/types";

export function workspaceKindToRimvioObjectType(
  kind: ContextWorkspaceNode["kind"],
): RimvioObjectType {
  switch (kind) {
    case "lodging":
      return "hotel";
    case "eatery":
      return "restaurant";
    case "poi":
    case "amenity":
      return "place";
  }
}

export function resolveRimvioObjectState(
  node: ContextWorkspaceNode,
): RimvioObjectState {
  const ready = node.actionReadyState ?? "discover";
  if (ready === "committed") return "committed";
  if (ready === "approved" || ready === "ready") return "prepared";
  if (node.selected || ready === "prepare") return "shortlisted";
  if (node.bookmarked) return "candidate";
  return "discovered";
}

function buildActions(objectId: string, preview: NodePreviewModel): CalloutAction[] {
  return [
    {
      id: "select",
      kind: "select",
      labelKo: "선택",
      enabled: true,
      targetId: objectId,
    },
    {
      id: "compare",
      kind: "compare",
      labelKo: "비교",
      enabled: true,
      targetId: objectId,
    },
    {
      id: "bookmark",
      kind: "bookmark",
      labelKo: "고정",
      enabled: true,
      targetId: objectId,
    },
    {
      id: "prepare",
      kind: "create_prepare_draft",
      labelKo: "예약 검토 생성",
      enabled: preview.canPrepare,
      targetId: objectId,
    },
    {
      id: "commit",
      kind: "handoff_field",
      labelKo: "Field에서 검토",
      enabled: preview.canPrepare || preview.selected,
      targetId: objectId,
    },
  ];
}

export function rimvioObjectFromWorkspaceNode(input: {
  node: ContextWorkspaceNode;
  preview: NodePreviewModel;
  contextId: string;
  draftDayLabelKo?: string | null;
  neighbors?: readonly ObserveEvidenceNeighbor[];
  edges?: readonly ContextWorkspaceRelationshipEdge[];
}): RimvioObject {
  const { node, preview, contextId, draftDayLabelKo, neighbors, edges } =
    input;
  const whyLines = preview.whyChosen
    .split(/[·•|/]|(?:\s*[-–—]\s*)/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 4);

  return {
    id: node.id,
    type: workspaceKindToRimvioObjectType(node.kind),
    title: node.title,
    location: { lat: node.lat, lng: node.lng },
    contextId,
    state: resolveRimvioObjectState(node),
    evidence: buildObserveEvidence({
      node,
      preview,
      draftDayLabelKo,
      neighbors,
      edges,
    }),
    actions: buildActions(node.id, preview),
    facts: {
      priceLabelKo:
        preview.price &&
        preview.price !== "가격 미정" &&
        preview.price !== "—"
          ? preview.price
          : null,
      rating: preview.rating,
      reviewSummaryKo:
        preview.reviewSummary !== "후기 없음" ? preview.reviewSummary : null,
      whyLinesKo:
        whyLines.length > 0 ? whyLines : preview.amenities.slice(0, 3),
      canPrepare: preview.canPrepare,
      selected: preview.selected,
      bookmarked: preview.bookmarked,
      inCompare: preview.inCompare,
    },
  };
}

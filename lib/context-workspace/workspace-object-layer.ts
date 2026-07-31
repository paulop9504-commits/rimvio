/**
 * Workspace object layers — One Focus carousel scope.
 * Pin tap → layer auto-switch; swipe stays inside the active layer.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

export const WORKSPACE_OBJECT_LAYERS = [
  "hotel",
  "food",
  "play",
  "flight",
  "ticket",
  "other",
] as const;

export type WorkspaceObjectLayerId = (typeof WORKSPACE_OBJECT_LAYERS)[number];

export const WORKSPACE_OBJECT_LAYER_LABEL_KO: Record<
  WorkspaceObjectLayerId,
  string
> = {
  hotel: "호텔",
  food: "맛집",
  play: "놀거리",
  flight: "항공",
  ticket: "티켓",
  other: "기타",
};

function tagBlob(node: ContextWorkspaceNode): string {
  return `${node.title} ${node.summaryKo} ${node.tags.join(" ")}`.toLowerCase();
}

function looksTicketProduct(node: ContextWorkspaceNode): boolean {
  return (
    node.tags.includes("ticket") ||
    /티켓|입장권|\bticket\b/i.test(`${node.title} ${node.summaryKo}`)
  );
}

function looksPlay(node: ContextWorkspaceNode): boolean {
  const blob = tagBlob(node);
  return (
    node.kind === "poi" ||
    node.tags.includes("experience") ||
    node.tags.includes("theme_park") ||
    node.tags.includes("photo_spot") ||
    /관광|놀거리|명소|공원|야경|도톤보리|dotonbori/i.test(blob)
  );
}

export function resolveWorkspaceObjectLayer(
  node: ContextWorkspaceNode,
): WorkspaceObjectLayerId {
  const blob = tagBlob(node);

  if (
    node.kind === "lodging" ||
    node.tags.includes("stay") ||
    /hotel|숙소|호텔|旅館/i.test(blob)
  ) {
    return "hotel";
  }

  if (
    node.kind === "eatery" ||
    node.tags.includes("food") ||
    /맛집|식당|카페|restaurant|cafe/i.test(blob)
  ) {
    return "food";
  }

  if (
    node.tags.includes("flight") ||
    node.tags.includes("airport") ||
    node.tags.includes("arrival") ||
    /공항|항공|airport|flight|kix|nrt|hnd/i.test(blob)
  ) {
    return "flight";
  }

  // Ticket product (입장권) before generic play, even if tagged USJ.
  if (looksTicketProduct(node)) {
    return "ticket";
  }

  if (looksPlay(node)) {
    return "play";
  }

  if (node.kind === "amenity") {
    return "other";
  }

  return "other";
}

export function filterNodesByObjectLayer(
  nodes: readonly ContextWorkspaceNode[],
  layer: WorkspaceObjectLayerId,
): ContextWorkspaceNode[] {
  return nodes.filter(
    (n) => n.visible && resolveWorkspaceObjectLayer(n) === layer,
  );
}

export function listPresentObjectLayers(
  nodes: readonly ContextWorkspaceNode[],
): WorkspaceObjectLayerId[] {
  const present = new Set<WorkspaceObjectLayerId>();
  for (const node of nodes) {
    if (!node.visible) continue;
    present.add(resolveWorkspaceObjectLayer(node));
  }
  return WORKSPACE_OBJECT_LAYERS.filter((id) => present.has(id));
}

export function layerLabelKo(layer: WorkspaceObjectLayerId): string {
  return WORKSPACE_OBJECT_LAYER_LABEL_KO[layer];
}

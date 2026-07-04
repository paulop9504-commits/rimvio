import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ProjectionNode } from "@/lib/situation-projection/types";
import type { HubPillTapResult } from "@/lib/situation-projection/resolve-hub-pill-tap";

/** Resolve direct overlay-node action before falling back to featured pills. */
export function resolveProjectionNodeTap(input: {
  node: ProjectionNode;
  event: EventCandidate;
}): HubPillTapResult | null {
  const { node, event } = input;
  if (node.kind !== "ghost") {
    return null;
  }

  if (node.actionKind === "context_run") {
    return {
      kind: "context_run",
      anchorEventId: event.id,
      ghostAxisId: node.axisId,
      searchQuery: node.searchQuery?.trim() || null,
    };
  }

  if (node.actionKind === "hub_service" && node.href?.trim()) {
    return {
      kind: "navigate",
      href: node.href,
      internalRoute: node.internalRoute ?? false,
      labelKo: node.label,
    };
  }

  return null;
}

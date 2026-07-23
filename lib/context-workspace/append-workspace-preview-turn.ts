/**
 * Append Workspace Preview compose turn after lodging Workspace opens.
 */

import { appendContextAgentComposeTurn } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";

export function appendWorkspacePreviewComposeTurn(
  contextEventId: string,
): void {
  const eventId = contextEventId.trim();
  if (!eventId) {
    return;
  }
  const state = readContextWorkspace(eventId);
  if (!state || state.status === "closed") {
    return;
  }
  const nodes = state.nodes.filter((n) => n.visible).slice(0, 12);
  appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "workspace_preview",
    text: state.summaryKo || `${nodes.length}곳 작업장 미리보기`,
    payload: {
      workspaceId: state.workspaceId,
      summaryKo: state.summaryKo,
      query: state.query,
      domain: state.domain,
      nodes: nodes.map((n) => ({
        id: n.id,
        placeId: n.placeId,
        title: n.title,
        lat: n.lat,
        lng: n.lng,
        rating: n.rating,
        amountLabel: n.amountLabel,
        priceBand: n.priceBand,
        summaryKo: n.summaryKo,
        kind: n.kind,
      })),
    },
  });
}

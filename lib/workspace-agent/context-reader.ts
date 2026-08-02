/**
 * Read Active Workspace Context — Agent Observe scope.
 * Never reads/writes Globe Reality as mutable.
 */

import { assertActiveWorkspace } from "@/lib/workspace-command/workspace-store";
import type { WorkspaceAgentContext } from "@/lib/workspace-agent/types";
import {
  createWorkspace,
  readWorkspace,
  readWorkspaceByContext,
} from "@/lib/workspace/workspace-store";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { getRealityEntity } from "@/lib/reality-graph/graph-store";

function ensureWorkspaceModel(workspaceId: string) {
  return (
    readWorkspace(workspaceId) ??
    readWorkspaceByContext(workspaceId) ??
    createWorkspace({ id: workspaceId, contextId: workspaceId })
  );
}

/**
 * Observe + Read Workspace Context (Active Workspace only).
 */
export function readWorkspaceAgentContext(
  workspaceId: string,
):
  | { readonly ok: true; readonly context: WorkspaceAgentContext }
  | { readonly ok: false; readonly reasonKo: string } {
  const gate = assertActiveWorkspace(workspaceId);
  if (!gate.ok) {
    return { ok: false, reasonKo: gate.reasonKo };
  }

  const ctxState = gate.state;
  const ws = ensureWorkspaceModel(workspaceId);

  const selectedNode =
    ctxState.nodes.find((n) => n.selected && n.kind === "lodging") ??
    ctxState.nodes.find((n) => n.kind === "lodging" && n.visible) ??
    null;

  const selectedWsObj =
    ws.objects.find((o) => o.selected && o.kind === "hotel") ??
    ws.objects.find((o) => o.kind === "hotel" && o.visible) ??
    null;

  const title =
    selectedWsObj?.title ??
    selectedNode?.title ??
    null;
  const priceLabelKo =
    selectedWsObj?.priceLabelKo ??
    selectedNode?.amountLabel ??
    null;
  const objectId = selectedWsObj?.id ?? selectedNode?.id ?? "";
  const entityId =
    selectedWsObj?.entityId ??
    selectedNode?.placeId ??
    selectedNode?.id ??
    "";

  const notesKo: string[] = [];
  if (ctxState.query.trim()) {
    notesKo.push(`Query · ${ctxState.query.trim()}`);
  }
  if (ctxState.lastChangeKo) {
    notesKo.push(ctxState.lastChangeKo);
  }
  // Price rise signal from last change / compare
  if (/가격|비싸|상승|올랐/u.test(ctxState.lastChangeKo ?? "")) {
    notesKo.push("상태 · 가격 상승 신호");
  }
  if (selectedWsObj) {
    const entity = getRealityEntity(selectedWsObj.entityId);
    if (entity?.properties.priceRising === true) {
      notesKo.push("상태 · 가격 상승");
    }
  }

  const visibleHotelCount =
    ws.objects.filter((o) => o.kind === "hotel" && o.visible).length ||
    ctxState.nodes.filter((n) => n.kind === "lodging" && n.visible).length;

  const context: WorkspaceAgentContext = {
    workspaceId: ws.id,
    contextId: ctxState.contextEventId,
    contextTitleKo:
      ctxState.summaryKo.trim() ||
      ctxState.query.trim() ||
      "Active Workspace",
    domain: ctxState.domain,
    currentHotel:
      title && objectId
        ? {
            objectId,
            entityId,
            title,
            priceLabelKo,
            selected: Boolean(selectedWsObj?.selected || selectedNode?.selected),
          }
        : null,
    visibleHotelCount,
    notesKo,
    draftOnly: true,
  };

  return { ok: true, context };
}

export function assertAgentWorkspaceScope(workspaceId: string): void {
  const gate = assertActiveWorkspace(workspaceId);
  if (!gate.ok) {
    throw new Error(`Workspace Reality Agent: ${gate.reasonKo}`);
  }
}

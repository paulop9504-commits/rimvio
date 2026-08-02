/**
 * Workspace State — Reality IDE surface state (Cursor role).
 *
 * Panels: 호텔 · 일정 · 예산 · AI Agent
 * Manages focus across Objects / Constraints / Drafts / Simulation / Prepare.
 *
 * Reality Object = 원본 (never edited here)
 * Workspace Object = 편집 Instance
 */

import type {
  Workspace,
  WorkspaceConstraint,
  WorkspaceDraft,
  WorkspaceObject,
  WorkspaceSimulation,
} from "@/lib/workspace/workspace-types";

export const WORKSPACE_IDE_PANELS = [
  "hotel",
  "schedule",
  "budget",
  "agent",
] as const;

export type WorkspaceIdePanel = (typeof WORKSPACE_IDE_PANELS)[number];

export const WORKSPACE_IDE_MODES = [
  "browse",
  "edit_instance",
  "simulate",
  "prepare",
] as const;

export type WorkspaceIdeMode = (typeof WORKSPACE_IDE_MODES)[number];

/**
 * Live IDE state derived from Workspace + UI focus.
 * Not a second SSOT — projection of Workspace for the Reality IDE chrome.
 */
export type WorkspaceIdeState = {
  readonly workspaceId: string;
  readonly contextId: string;
  readonly titleKo: string;
  readonly activePanel: WorkspaceIdePanel;
  readonly mode: WorkspaceIdeMode;
  readonly objectCount: number;
  readonly constraintCount: number;
  readonly draftCount: number;
  readonly simulationCount: number;
  readonly prepareDraftCount: number;
  /** Constitution flags */
  readonly realityObjectReadonly: true;
  readonly editsStayOnInstance: true;
  readonly updatedAtIso: string;
};

export type WorkspaceIdeInventory = {
  readonly objects: readonly WorkspaceObject[];
  readonly constraints: readonly WorkspaceConstraint[];
  readonly drafts: readonly WorkspaceDraft[];
  readonly simulations: readonly WorkspaceSimulation[];
  readonly prepareDrafts: readonly WorkspaceDraft[];
};

export function buildWorkspaceIdeState(input: {
  readonly workspace: Workspace;
  readonly titleKo?: string | null;
  readonly activePanel?: WorkspaceIdePanel;
  readonly mode?: WorkspaceIdeMode;
}): WorkspaceIdeState {
  const ws = input.workspace;
  const prepareDrafts = ws.drafts.filter((d) => d.kind === "prepare");
  return {
    workspaceId: ws.id,
    contextId: ws.contextId,
    titleKo: input.titleKo?.trim() || `${ws.contextId} Workspace`,
    activePanel: input.activePanel ?? "hotel",
    mode: input.mode ?? "browse",
    objectCount: ws.objects.length,
    constraintCount: ws.constraints.length,
    draftCount: ws.drafts.length,
    simulationCount: ws.simulationResults.length,
    prepareDraftCount: prepareDrafts.length,
    realityObjectReadonly: true,
    editsStayOnInstance: true,
    updatedAtIso: ws.updatedAtIso,
  };
}

export function readWorkspaceIdeInventory(
  workspace: Workspace,
): WorkspaceIdeInventory {
  return {
    objects: workspace.objects,
    constraints: workspace.constraints,
    drafts: workspace.drafts,
    simulations: workspace.simulationResults,
    prepareDrafts: workspace.drafts.filter((d) => d.kind === "prepare"),
  };
}

export function withWorkspaceIdePanel(
  state: WorkspaceIdeState,
  panel: WorkspaceIdePanel,
): WorkspaceIdeState {
  return { ...state, activePanel: panel };
}

export function withWorkspaceIdeMode(
  state: WorkspaceIdeState,
  mode: WorkspaceIdeMode,
): WorkspaceIdeState {
  return { ...state, mode };
}

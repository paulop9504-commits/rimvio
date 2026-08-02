/**
 * Workspace Engine — Reality IDE (Cursor role).
 *
 * Context → Workspace
 *
 * Manages: Objects · Constraints · Drafts · Simulation · Prepare
 *
 * Reality Object  = 원본 (forbidden to mutate)
 * Workspace Object = 편집 Instance
 *
 * Existing workspace-store / workspace-history remain the wire SSOT.
 * This module is the STEP 4 Reality IDE facade.
 */

import type { RealityContext } from "@/lib/context/context";
import {
  addWorkspaceConstraint,
  addWorkspaceDraft,
  addWorkspaceObject,
  addWorkspaceSimulation,
  assertDoesNotMutateRealityObject,
  createWorkspace,
  readWorkspace,
  readWorkspaceByContext,
} from "@/lib/workspace/workspace-store";
import type {
  RealityObjectSeed,
  Workspace,
  WorkspaceConstraint,
  WorkspaceDraft,
  WorkspaceObject,
  WorkspaceSimulation,
} from "@/lib/workspace/workspace-types";
import {
  buildWorkspaceIdeState,
  readWorkspaceIdeInventory,
  type WorkspaceIdePanel,
  type WorkspaceIdeState,
} from "@/lib/workspace/workspace-state";
import { listWorkspaceHistory } from "@/lib/workspace/workspace-history";

export type OpenWorkspaceResult = {
  readonly workspace: Workspace;
  readonly ide: WorkspaceIdeState;
  readonly created: boolean;
};

/**
 * Open Reality IDE from Context click.
 * Example: Osaka Trip → Osaka Trip Workspace
 */
export function openWorkspaceFromContext(input: {
  readonly context: Pick<
    RealityContext,
    "id" | "titleKo" | "entities" | "constraints" | "purpose"
  >;
  readonly workspaceId?: string | null;
  readonly activePanel?: WorkspaceIdePanel;
  readonly reseeds?: boolean;
}): OpenWorkspaceResult {
  assertDoesNotMutateRealityObject("open_workspace");

  const contextId = input.context.id.trim();
  const existing =
    (input.workspaceId
      ? readWorkspace(input.workspaceId)
      : null) ?? readWorkspaceByContext(contextId);

  if (existing && !input.reseeds) {
    return {
      workspace: existing,
      ide: buildWorkspaceIdeState({
        workspace: existing,
        titleKo: `${input.context.titleKo} Workspace`,
        activePanel: input.activePanel ?? "hotel",
      }),
      created: false,
    };
  }

  const seeds: RealityObjectSeed[] = input.context.entities.map((e) => ({
    realityObjectId: e.entityId,
    entityId: e.entityId,
    kind: mapEntityKindToWorkspace(e.kind),
    title: e.titleKo,
    attrs: { entityStatus: e.status ?? "discovered" },
  }));

  const workspace = createWorkspace({
    id: input.workspaceId?.trim() || contextId,
    contextId,
    seeds,
  });

  // Seed context constraints into Workspace (instance layer only)
  for (const c of input.context.constraints) {
    addWorkspaceConstraint({
      workspaceId: workspace.id,
      key: c.key,
      labelKo: c.labelKo ?? c.key,
      value: c.value,
      source: "system",
    });
  }

  // Purpose as soft constraint for IDE
  addWorkspaceConstraint({
    workspaceId: workspace.id,
    key: "purpose",
    labelKo: "목적",
    value: input.context.purpose,
    source: "system",
  });

  const fresh = readWorkspace(workspace.id) ?? workspace;

  return {
    workspace: fresh,
    ide: buildWorkspaceIdeState({
      workspace: fresh,
      titleKo: `${input.context.titleKo} Workspace`,
      activePanel: input.activePanel ?? "hotel",
    }),
    created: true,
  };
}

function mapEntityKindToWorkspace(
  kind: string,
): RealityObjectSeed["kind"] {
  const k = kind.toLowerCase();
  if (k === "hotel" || k === "lodging") return "hotel";
  if (k === "restaurant" || k === "eatery") return "restaurant";
  if (k === "event") return "event";
  if (k === "flight" || k === "route" || k === "place") return "place";
  return "other";
}

/** Convenience Osaka Trip Workspace open */
export function openOsakaTripWorkspace(input: {
  readonly context: RealityContext;
}): OpenWorkspaceResult {
  return openWorkspaceFromContext({
    context: input.context,
    activePanel: "hotel",
  });
}

export function getWorkspaceIde(
  workspaceId: string,
  titleKo?: string | null,
): WorkspaceIdeState | null {
  const ws = readWorkspace(workspaceId);
  if (!ws) return null;
  return buildWorkspaceIdeState({ workspace: ws, titleKo });
}

export function listWorkspaceManaged(input: {
  readonly workspaceId: string;
}): {
  readonly objects: readonly WorkspaceObject[];
  readonly constraints: readonly WorkspaceConstraint[];
  readonly drafts: readonly WorkspaceDraft[];
  readonly simulations: readonly WorkspaceSimulation[];
  readonly prepare: readonly WorkspaceDraft[];
} | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  const inv = readWorkspaceIdeInventory(ws);
  return {
    objects: inv.objects,
    constraints: inv.constraints,
    drafts: inv.drafts,
    simulations: inv.simulations,
    prepare: inv.prepareDrafts,
  };
}

/**
 * Attach Workspace Object instance (never mutates Reality Object source).
 */
export function addWorkspaceInstanceObject(input: {
  readonly workspaceId: string;
  readonly entityId: string;
  readonly title: string;
  readonly kind?: RealityObjectSeed["kind"];
}): Workspace | null {
  assertDoesNotMutateRealityObject("add_instance");
  return addWorkspaceObject({
    workspaceId: input.workspaceId,
    seed: {
      realityObjectId: input.entityId,
      entityId: input.entityId,
      kind: input.kind ?? "hotel",
      title: input.title,
    },
    labelKo: `${input.title} Instance`,
  });
}

export function addWorkspacePrepareDraft(input: {
  readonly workspaceId: string;
  readonly objectId?: string | null;
  readonly labelKo: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}): Workspace | null {
  assertDoesNotMutateRealityObject("prepare_draft");
  return addWorkspaceDraft({
    workspaceId: input.workspaceId,
    kind: "prepare",
    objectId: input.objectId,
    labelKo: input.labelKo,
    payload: input.payload ?? {},
  });
}

export function addWorkspaceSimulationResult(input: {
  readonly workspaceId: string;
  readonly objectId?: string | null;
  readonly scenarioKo: string;
  readonly result: Readonly<Record<string, unknown>>;
}): Workspace | null {
  assertDoesNotMutateRealityObject("simulation");
  return addWorkspaceSimulation({
    workspaceId: input.workspaceId,
    objectId: input.objectId,
    scenarioKo: input.scenarioKo,
    result: input.result,
  });
}

export function assertWorkspaceDoesNotTouchReality(op: string): void {
  assertDoesNotMutateRealityObject(op);
}

export function workspaceHistoryCount(workspaceId: string): number {
  return listWorkspaceHistory(workspaceId).length;
}

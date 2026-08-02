/**
 * Projection Handler — build events from Workspace Draft delta, refresh UI.
 * Never mutates Reality Object store.
 */

import {
  dispatchProjectionEvent,
  dispatchProjectionRefresh,
} from "@/lib/projection-engine/projection-events";
import {
  appendProjectionEvent,
  writeProjectionSnapshot,
} from "@/lib/projection-engine/projection-store";
import type {
  ProjectionBuildInput,
  ProjectionEvent,
  ProjectionEventType,
} from "@/lib/projection-engine/projection-types";
import { getRealityObject } from "@/lib/reality-object/reality-object-store";
import type { DraftMutation } from "@/lib/workspace-command/types";
import type { Workspace, WorkspaceObject } from "@/lib/workspace/workspace-types";
import { readWorkspace } from "@/lib/workspace/workspace-store";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function makeEvent(
  type: ProjectionEventType,
  workspaceId: string,
  payload: Readonly<Record<string, unknown>>,
): ProjectionEvent {
  return {
    id: newId("proj"),
    type,
    workspaceId,
    payload,
    atIso: new Date().toISOString(),
    draftOnly: true,
  };
}

/**
 * Diff before/after Workspace Object visibility → ProjectionEvents.
 */
export function buildProjectionEventsFromVisibility(input: {
  readonly workspaceId: string;
  readonly beforeObjects: readonly WorkspaceObject[];
  readonly afterObjects: readonly WorkspaceObject[];
  readonly hotelType?: string | null;
  readonly summaryKo?: string;
}): ProjectionEvent[] {
  const beforeMap = new Map(input.beforeObjects.map((o) => [o.id, o]));
  const afterMap = new Map(input.afterObjects.map((o) => [o.id, o]));
  const events: ProjectionEvent[] = [];

  const visibleChanged: {
    objectId: string;
    realityObjectId: string;
    visible: boolean;
    title: string;
  }[] = [];

  for (const after of input.afterObjects) {
    const before = beforeMap.get(after.id);
    if (!before) {
      events.push(
        makeEvent("OBJECT_ADDED", input.workspaceId, {
          objectId: after.id,
          realityObjectId: after.realityObjectId,
          title: after.title,
        }),
      );
      continue;
    }
    if (before.visible !== after.visible) {
      visibleChanged.push({
        objectId: after.id,
        realityObjectId: after.realityObjectId,
        visible: after.visible,
        title: after.title,
      });
    }
    if (
      before.selected !== after.selected ||
      before.bookmarked !== after.bookmarked ||
      before.title !== after.title
    ) {
      events.push(
        makeEvent("OBJECT_STATE_CHANGED", input.workspaceId, {
          objectId: after.id,
          realityObjectId: after.realityObjectId,
          before: {
            selected: before.selected,
            bookmarked: before.bookmarked,
            title: before.title,
          },
          after: {
            selected: after.selected,
            bookmarked: after.bookmarked,
            title: after.title,
          },
        }),
      );
    }
  }

  for (const before of input.beforeObjects) {
    if (!afterMap.has(before.id)) {
      events.push(
        makeEvent("OBJECT_REMOVED", input.workspaceId, {
          objectId: before.id,
          realityObjectId: before.realityObjectId,
          title: before.title,
        }),
      );
    }
  }

  if (visibleChanged.length > 0) {
    events.push(
      makeEvent("OBJECT_VISIBLE_CHANGED", input.workspaceId, {
        changes: visibleChanged,
        hotelType: input.hotelType ?? null,
        hiddenCount: visibleChanged.filter((c) => !c.visible).length,
        shownCount: visibleChanged.filter((c) => c.visible).length,
        summaryKo:
          input.summaryKo ??
          `표시 ${visibleChanged.filter((c) => c.visible).length} · 숨김 ${
            visibleChanged.filter((c) => !c.visible).length
          }`,
      }),
    );
  }

  return events;
}

export function buildProjectionEvents(input: ProjectionBuildInput): ProjectionEvent[] {
  const events: ProjectionEvent[] = [];
  const beforeSet = new Set(input.beforeVisibleIds);
  const afterSet = new Set(input.afterVisibleIds);

  const changes: {
    objectId: string;
    visible: boolean;
  }[] = [];
  for (const id of afterSet) {
    if (!beforeSet.has(id)) changes.push({ objectId: id, visible: true });
  }
  for (const id of beforeSet) {
    if (!afterSet.has(id)) changes.push({ objectId: id, visible: false });
  }
  if (changes.length > 0) {
    events.push(
      makeEvent("OBJECT_VISIBLE_CHANGED", input.workspaceId, {
        changes,
        hotelType: input.hotelType ?? null,
        summaryKo: input.summaryKo ?? null,
      }),
    );
  }
  for (const id of input.addedObjectIds ?? []) {
    events.push(
      makeEvent("OBJECT_ADDED", input.workspaceId, { objectId: id }),
    );
  }
  for (const id of input.removedObjectIds ?? []) {
    events.push(
      makeEvent("OBJECT_REMOVED", input.workspaceId, { objectId: id }),
    );
  }
  for (const ch of input.stateChanges ?? []) {
    events.push(
      makeEvent("OBJECT_STATE_CHANGED", input.workspaceId, {
        objectId: ch.objectId,
        before: ch.before,
        after: ch.after,
      }),
    );
  }
  if (input.relationUpdated) {
    events.push(
      makeEvent("RELATION_UPDATED", input.workspaceId, {}),
    );
  }
  if (input.simulationCreated) {
    events.push(
      makeEvent("SIMULATION_CREATED", input.workspaceId, {
        ...input.simulationCreated,
      }),
    );
  }
  return events;
}

/**
 * Assert Reality Objects were not written during projection.
 */
export function assertProjectionDoesNotMutateReality(
  realityStamps: readonly { id: string; updatedAt: string | null }[],
): void {
  for (const stamp of realityStamps) {
    const obj = getRealityObject(stamp.id);
    if (obj && stamp.updatedAt != null && obj.updatedAt !== stamp.updatedAt) {
      throw new Error(
        "Reality Projection Engine: Reality Object mutated — forbidden",
      );
    }
  }
}

/**
 * Project Workspace Object visibility onto Context Workspace map nodes (UI).
 * Context Workspace is Draft surface — not Global Reality.
 */
export function projectVisibilityToContextWorkspace(input: {
  readonly workspaceId: string;
  readonly workspace: Workspace;
}): ContextWorkspaceState | null {
  const ctx = readContextWorkspace(input.workspaceId);
  if (!ctx) return null;

  const byReality = new Map(
    input.workspace.objects.map((o) => [o.realityObjectId, o]),
  );
  const byTitle = new Map(
    input.workspace.objects.map((o) => [o.title.trim().toLowerCase(), o]),
  );

  const nodes = ctx.nodes.map((node) => {
    const match =
      byReality.get(node.placeId) ||
      byReality.get(node.id) ||
      byTitle.get(node.title.trim().toLowerCase());
    if (!match) return node;
    if (node.visible === match.visible) return node;
    return { ...node, visible: match.visible };
  });

  const next: ContextWorkspaceState = {
    ...ctx,
    nodes,
    updatedAtIso: new Date().toISOString(),
    lastChangeKo: "Projection · 표시 갱신",
  };
  writeContextWorkspace(next);
  return next;
}

/**
 * Emit + store Projection Events and refresh UI surfaces.
 */
export function runProjectionHandler(input: {
  readonly workspaceId: string;
  readonly beforeObjects: readonly WorkspaceObject[];
  readonly afterWorkspace: Workspace;
  readonly hotelType?: string | null;
  readonly summaryKo?: string;
  readonly simulationCreated?: {
    readonly simulationId: string;
    readonly scenarioKo: string;
  } | null;
  readonly syncContextWorkspace?: boolean;
}): {
  readonly events: readonly ProjectionEvent[];
  readonly snapshot: import("@/lib/projection-engine/projection-types").ProjectionSnapshot;
} {
  const realityStamps = input.beforeObjects.map((o) => ({
    id: o.realityObjectId,
    updatedAt: getRealityObject(o.realityObjectId)?.updatedAt ?? null,
  }));

  const events = buildProjectionEventsFromVisibility({
    workspaceId: input.workspaceId,
    beforeObjects: input.beforeObjects,
    afterObjects: input.afterWorkspace.objects,
    hotelType: input.hotelType,
    summaryKo: input.summaryKo,
  });

  if (input.simulationCreated) {
    events.push(
      makeEvent("SIMULATION_CREATED", input.workspaceId, {
        ...input.simulationCreated,
      }),
    );
  }

  for (const event of events) {
    appendProjectionEvent(event);
    dispatchProjectionEvent(event);
  }

  const visibleObjectIds = input.afterWorkspace.objects
    .filter((o) => o.visible)
    .map((o) => o.id);
  const hiddenObjectIds = input.afterWorkspace.objects
    .filter((o) => !o.visible)
    .map((o) => o.id);

  const snapshot = {
    workspaceId: input.workspaceId,
    visibleObjectIds,
    hiddenObjectIds,
    hotelType: input.hotelType ?? null,
    revision: input.afterWorkspace.revision,
    updatedAtIso: new Date().toISOString(),
  };
  writeProjectionSnapshot(snapshot);

  if (input.syncContextWorkspace !== false) {
    projectVisibilityToContextWorkspace({
      workspaceId: input.workspaceId,
      workspace: input.afterWorkspace,
    });
  }

  assertProjectionDoesNotMutateReality(realityStamps);

  dispatchProjectionRefresh({
    workspaceId: input.workspaceId,
    eventIds: events.map((e) => e.id),
    atIso: snapshot.updatedAtIso,
    draftOnly: true,
  });

  return { events, snapshot };
}

/**
 * After DraftMutation applied — project Workspace State to UI.
 */
export function projectDraftMutationApplied(input: {
  readonly draft: DraftMutation;
  readonly beforeObjects: readonly WorkspaceObject[];
  readonly summaryKo?: string;
}): ReturnType<typeof runProjectionHandler> | null {
  const after = readWorkspace(input.draft.workspaceId);
  if (!after) return null;

  const hotelType =
    typeof input.draft.afterState.hotelType === "string"
      ? input.draft.afterState.hotelType
      : typeof input.draft.intent.parameters.hotelType === "string"
        ? input.draft.intent.parameters.hotelType
        : null;

  const lastSim = after.simulationResults[after.simulationResults.length - 1];

  return runProjectionHandler({
    workspaceId: input.draft.workspaceId,
    beforeObjects: input.beforeObjects,
    afterWorkspace: after,
    hotelType,
    summaryKo: input.summaryKo ?? input.draft.impact.summaryKo,
    simulationCreated:
      input.draft.intent.action === "simulate" && lastSim
        ? { simulationId: lastSim.id, scenarioKo: lastSim.scenarioKo }
        : null,
    syncContextWorkspace: true,
  });
}

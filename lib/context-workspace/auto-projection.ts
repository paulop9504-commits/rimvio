/**
 * STEP 6 — Auto Projection Engine
 *
 * Workspace Patch → Projection Event → Map Marker → Relationship → Callout → UI Refresh
 * User never presses Refresh. Projection is always automatic.
 */

import { withWorkspaceRelationships } from "@/lib/context-workspace/sync-workspace-relationships";
import {
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { syncCalloutsFromWorkspace } from "@/lib/callout/dynamic/sync-from-workspace";
import {
  appendProjectionEvent,
  writeProjectionSnapshot,
} from "@/lib/projection-engine/projection-store";
import {
  dispatchProjectionEvent,
  dispatchProjectionRefresh,
} from "@/lib/projection-engine/projection-events";
import type { ProjectionEvent } from "@/lib/projection-engine/projection-types";
import type { WorkspacePatchRecord } from "@/lib/context-workspace/workspace-patch/types";
import { writeAgentRuntimeProjectionFromWorkspace } from "@/lib/context-run/agent-runtime-projection";
import {
  advanceAgentProductStage,
  readLastAgentProductTurn,
} from "@/lib/context-run/agent-product-pipeline";

export const AUTO_PROJECTION_STAGES = [
  "patch",
  "projection_event",
  "map_marker_update",
  "relationship_update",
  "callout_update",
  "ui_refresh",
] as const;

export type AutoProjectionStage = (typeof AUTO_PROJECTION_STAGES)[number];

export type AutoProjectionLogLine = {
  readonly stage: AutoProjectionStage;
  readonly message: string;
};

export type AutoProjectionResult = {
  readonly ok: boolean;
  readonly contextEventId: string;
  readonly stages: readonly AutoProjectionStage[];
  readonly logs: readonly AutoProjectionLogLine[];
  readonly eventIds: readonly string[];
  readonly calloutCount: number;
  readonly manualRefreshRequired: false;
};

function makeProjEvent(
  type: ProjectionEvent["type"],
  workspaceId: string,
  payload: Readonly<Record<string, unknown>>,
): ProjectionEvent {
  return {
    id: `autoproj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    workspaceId,
    payload,
    atIso: new Date().toISOString(),
    draftOnly: true,
  };
}

/**
 * Run automatic projection after a Workspace Patch.
 * Never mutates Reality Objects — Draft / Projection layer only.
 */
export function runAutoProjectionAfterPatch(input: {
  readonly contextEventId: string;
  readonly patchRecord?: WorkspacePatchRecord | null;
  readonly entityIds?: readonly string[] | null;
}): AutoProjectionResult {
  const contextEventId = input.contextEventId.trim();
  const logs: AutoProjectionLogLine[] = [];
  const stages: AutoProjectionStage[] = [];
  const eventIds: string[] = [];

  const empty = (): AutoProjectionResult => ({
    ok: false,
    contextEventId,
    stages,
    logs,
    eventIds,
    calloutCount: 0,
    manualRefreshRequired: false,
  });

  if (!contextEventId) return empty();

  let state = readContextWorkspace(contextEventId);
  if (!state) return empty();

  // 1. Patch acknowledged
  stages.push("patch");
  logs.push({
    stage: "patch",
    message: input.patchRecord
      ? `Patch · ${input.patchRecord.kind} · ${input.patchRecord.statusKo}`
      : "Patch · applied",
  });

  // 2. Projection Event
  stages.push("projection_event");
  const visibleIds = state.nodes.filter((n) => n.visible).map((n) => n.id);
  const hiddenIds = state.nodes.filter((n) => !n.visible).map((n) => n.id);
  const patchKind = input.patchRecord?.kind ?? "unknown";

  const events: ProjectionEvent[] = [
    makeProjEvent("OBJECT_STATE_CHANGED", contextEventId, {
      patchKind,
      visibleCount: visibleIds.length,
      auto: true,
    }),
  ];

  if (
    patchKind === "create_entity" ||
    patchKind === "replace_entity" ||
    patchKind === "filter_entity"
  ) {
    for (const id of visibleIds.slice(0, 8)) {
      events.push(
        makeProjEvent("OBJECT_VISIBLE_CHANGED", contextEventId, {
          objectId: id,
          visible: true,
          auto: true,
        }),
      );
    }
  }

  if (
    patchKind === "connect_entity" ||
    patchKind === "spatial_constraint" ||
    patchKind === "move_schedule" ||
    (state.relationshipEdges?.length ?? 0) > 0
  ) {
    events.push(
      makeProjEvent("RELATION_UPDATED", contextEventId, {
        edgeCount: state.relationshipEdges?.length ?? 0,
        auto: true,
      }),
    );
  }

  for (const ev of events) {
    appendProjectionEvent(ev);
    dispatchProjectionEvent(ev);
    eventIds.push(ev.id);
  }
  logs.push({
    stage: "projection_event",
    message: `Projection Event · ${events.length} emitted`,
  });

  // 3. Map Marker Update (expand workspace + snapshot for map host)
  stages.push("map_marker_update");
  writeContextWorkspaceExpanded(contextEventId, true);
  if (typeof window !== "undefined") {
    dispatchContextWorkspaceExpand({
      contextEventId,
      source: "scout_patch",
    });
  }
  writeProjectionSnapshot({
    workspaceId: contextEventId,
    visibleObjectIds: visibleIds,
    hiddenObjectIds: hiddenIds,
    hotelType: state.realityPlan?.stayType ?? null,
    revision: (state.patches?.length ?? 0) + 1,
    updatedAtIso: new Date().toISOString(),
  });
  logs.push({
    stage: "map_marker_update",
    message: `Map Marker Update · visible=${visibleIds.length}`,
  });

  // 4. Relationship Update
  stages.push("relationship_update");
  state = readContextWorkspace(contextEventId) ?? state;
  const withRel = withWorkspaceRelationships(
    state,
    input.patchRecord?.utterance ?? state.query,
  );
  // Preserve explicit spatial/connect edges already on state
  const mergedEdges = [
    ...(withRel.relationshipEdges ?? []),
  ];
  const byId = new Map(mergedEdges.map((e) => [e.id, e]));
  for (const e of state.relationshipEdges ?? []) {
    byId.set(e.id, e);
  }
  writeContextWorkspace({
    ...withRel,
    relationshipEdges: [...byId.values()].slice(0, 64),
    lastChangeKo: state.lastChangeKo,
    updatedAtIso: new Date().toISOString(),
  });
  logs.push({
    stage: "relationship_update",
    message: `Relationship Update · edges=${byId.size}`,
  });

  // 5. Callout Update
  stages.push("callout_update");
  const focus =
    input.entityIds?.filter(Boolean) ??
    state.selectedIds ??
    visibleIds.slice(0, 3);
  const synced = syncCalloutsFromWorkspace({
    contextEventId,
    entityIds: focus.length ? focus : null,
  });
  logs.push({
    stage: "callout_update",
    message: `Callout Update · schemas=${synced.schemas.length}`,
  });

  // 6. UI Refresh (automatic — no user Refresh)
  stages.push("ui_refresh");
  dispatchProjectionRefresh({
    workspaceId: contextEventId,
    eventIds,
    atIso: new Date().toISOString(),
    draftOnly: true,
  });
  logs.push({
    stage: "ui_refresh",
    message: "UI Refresh · auto (no manual refresh)",
  });

  // STEP 6–7 — single Agent Runtime Projection blob for all surfaces.
  {
    const turn = readLastAgentProductTurn();
    if (turn?.contextEventId === contextEventId) {
      const afterProj = advanceAgentProductStage(turn, "projection");
      advanceAgentProductStage(afterProj, "agent_status");
    }
  }
  writeAgentRuntimeProjectionFromWorkspace({ contextEventId });

  return {
    ok: true,
    contextEventId,
    stages,
    logs,
    eventIds,
    calloutCount: synced.schemas.length,
    manualRefreshRequired: false,
  };
}

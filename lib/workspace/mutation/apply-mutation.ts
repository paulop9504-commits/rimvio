/**
 * Apply Workspace Engine Mutation → Workspace State.
 * Absolute: never mutate Global Reality Store.
 */

import { getRealityObject } from "@/lib/reality-object/reality-object-store";
import { applyFilterVisibility } from "@/lib/workspace/mutation/object-match";
import type {
  WorkspaceEngineApplyResult,
  WorkspaceEngineMutation,
} from "@/lib/workspace/mutation/types";
import {
  assertDoesNotMutateRealityObject,
  commitWorkspaceEngineChange,
  readWorkspace,
} from "@/lib/workspace/workspace-store";
import type {
  WorkspaceConstraint,
  WorkspaceDraft,
  WorkspaceFilter,
  WorkspaceSimulation,
} from "@/lib/workspace/workspace-types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function visibleCount(ws: {
  readonly objects: readonly { readonly visible: boolean }[];
}): number {
  return ws.objects.filter((o) => o.visible).length;
}

/**
 * Apply mutation to Workspace State only.
 */
export function applyWorkspaceEngineMutation(input: {
  readonly workspaceId: string;
  readonly mutation: WorkspaceEngineMutation;
}): WorkspaceEngineApplyResult {
  const mutation = input.mutation;
  assertDoesNotMutateRealityObject(mutation.type);

  // Explicit Reality guard — engine must never write Reality store
  if (
    mutation.type === ("MUTATE_REALITY" as WorkspaceEngineMutation["type"]) ||
    mutation.changes.mutateReality === true
  ) {
    return {
      ok: false,
      reasonKo: "Global Reality Store 수정은 금지입니다",
      forbiddenRealityMutation: true,
    };
  }

  const ws = readWorkspace(input.workspaceId);
  if (!ws) {
    return {
      ok: false,
      reasonKo: "Workspace State가 없어요",
      forbiddenRealityMutation: false,
    };
  }

  const beforeVisible = visibleCount(ws);
  const realityStamps = ws.objects.map((o) => ({
    id: o.realityObjectId,
    at: getRealityObject(o.realityObjectId)?.updatedAt ?? null,
  }));

  let objects = ws.objects;
  let filters = [...ws.filters];
  let constraints = [...ws.constraints];
  let drafts = [...ws.drafts];
  let simulationResults = [...ws.simulationResults];
  let labelKo: string = mutation.type;
  let storeMutationType:
    | "filter_object"
    | "add_constraint"
    | "remove_constraint"
    | "patch_object"
    | "add_draft"
    | "add_simulation"
    | "engine" = "engine";

  switch (mutation.type) {
    case "FILTER_OBJECT": {
      storeMutationType = "filter_object";
      const category =
        typeof mutation.changes.category === "string"
          ? mutation.changes.category
          : null;
      const filterKey = category ? "category" : "filter";
      const filterValue = category ?? mutation.changes;
      filters = [
        ...filters.filter((f) => f.key !== filterKey && f.key !== "category"),
        {
          id: newId("wf"),
          key: filterKey,
          labelKo: category === "capsule" ? "캡슐호텔" : "필터",
          value: filterValue,
          active: true,
        } satisfies WorkspaceFilter,
      ];
      objects = applyFilterVisibility(
        ws.objects,
        mutation.target,
        mutation.changes,
      );
      labelKo =
        category === "capsule"
          ? "캡슐호텔 후보만 표시"
          : `필터 · ${mutation.target}`;
      break;
    }
    case "ADD_CONSTRAINT": {
      storeMutationType = "add_constraint";
      const near =
        typeof mutation.changes.near === "string"
          ? mutation.changes.near
          : null;
      const constraint: WorkspaceConstraint = {
        id: newId("wc"),
        key: near ? "near" : "constraint",
        labelKo: near ? `${near} 근처` : "조건",
        value: near ?? mutation.changes,
        source: "nl",
      };
      constraints = [...constraints, constraint];
      if (near) {
        objects = applyFilterVisibility(ws.objects, mutation.target, {
          near,
        });
        filters = [
          ...filters.filter((f) => f.key !== "near"),
          {
            id: newId("wf"),
            key: "near",
            labelKo: constraint.labelKo,
            value: near,
            active: true,
          },
        ];
      }
      if (typeof mutation.changes.pin === "boolean" && mutation.objectId) {
        objects = objects.map((o) =>
          o.id === mutation.objectId
            ? {
                ...o,
                bookmarked: mutation.changes.pin as boolean,
                updatedAtIso: new Date().toISOString(),
              }
            : o,
        );
      }
      labelKo = constraint.labelKo;
      break;
    }
    case "REMOVE_CONSTRAINT": {
      storeMutationType = "remove_constraint";
      constraints = constraints.slice(0, -1);
      filters = [];
      objects = ws.objects.map((o) =>
        o.visible
          ? o
          : { ...o, visible: true, updatedAtIso: new Date().toISOString() },
      );
      labelKo = "조건 해제 · 전체 표시";
      break;
    }
    case "REPLACE_OBJECT": {
      storeMutationType = "patch_object";
      if (mutation.changes.remove && mutation.objectId) {
        objects = ws.objects.filter((o) => o.id !== mutation.objectId);
        labelKo = "후보 제거";
      } else if (mutation.objectId) {
        objects = ws.objects.map((o) =>
          o.id === mutation.objectId
            ? {
                ...o,
                attrs: { ...o.attrs, replaceRequested: true },
                updatedAtIso: new Date().toISOString(),
              }
            : o,
        );
        labelKo = "다른 후보로 교체 요청";
      } else {
        labelKo = "교체";
      }
      break;
    }
    case "MOVE_OBJECT": {
      storeMutationType = "engine";
      const dayHint =
        typeof mutation.changes.dayHint === "string"
          ? mutation.changes.dayHint
          : null;
      constraints = [
        ...constraints,
        {
          id: newId("wc"),
          key: "schedule_slot",
          labelKo: dayHint ?? "일정 이동",
          value: dayHint ?? mutation.changes,
          source: "nl",
        },
      ];
      if (mutation.objectId) {
        objects = ws.objects.map((o) =>
          o.id === mutation.objectId
            ? {
                ...o,
                attrs: {
                  ...o.attrs,
                  scheduleHint: dayHint,
                  moved: true,
                },
                updatedAtIso: new Date().toISOString(),
              }
            : o,
        );
      }
      labelKo = dayHint ?? "일정 이동";
      break;
    }
    case "COMPARE_OBJECT": {
      storeMutationType = "patch_object";
      if (mutation.objectId) {
        objects = ws.objects.map((o) =>
          o.id === mutation.objectId
            ? {
                ...o,
                selected: true,
                attrs: { ...o.attrs, inCompare: true },
                updatedAtIso: new Date().toISOString(),
              }
            : o,
        );
      } else {
        const hotels = ws.objects.filter((o) => o.kind === "hotel").slice(0, 2);
        const ids = new Set(hotels.map((h) => h.id));
        objects = ws.objects.map((o) =>
          ids.has(o.id)
            ? {
                ...o,
                selected: true,
                attrs: { ...o.attrs, inCompare: true },
                updatedAtIso: new Date().toISOString(),
              }
            : o,
        );
      }
      labelKo = "비교";
      break;
    }
    case "SIMULATE": {
      storeMutationType = "add_simulation";
      const sim: WorkspaceSimulation = {
        id: newId("wsim"),
        objectId: mutation.objectId ?? null,
        scenarioKo: String(mutation.changes.scenarioKo ?? "what-if"),
        result: { draftOnly: true, impactPending: true },
        createdAtIso: new Date().toISOString(),
      };
      simulationResults = [...simulationResults, sim];
      labelKo = "영향 시뮬레이션 · Draft";
      break;
    }
    case "PREPARE": {
      storeMutationType = "add_draft";
      const draft: WorkspaceDraft = {
        id: newId("wd"),
        kind: "prepare",
        objectId: mutation.objectId ?? null,
        labelKo: String(mutation.changes.labelKo ?? "예약 준비"),
        payload: { status: "draft" },
        status: "draft",
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };
      drafts = [...drafts, draft];
      labelKo = draft.labelKo;
      break;
    }
    default:
      return {
        ok: false,
        reasonKo: "지원하지 않는 Mutation",
        forbiddenRealityMutation: false,
      };
  }

  const next = commitWorkspaceEngineChange({
    workspaceId: ws.id,
    objects,
    filters,
    constraints,
    drafts,
    simulationResults,
    mutationType: storeMutationType,
    targetObjectId: mutation.objectId,
    changes: {
      engineType: mutation.type,
      target: mutation.target,
      ...mutation.changes,
    },
    labelKo,
  });

  if (!next) {
    return {
      ok: false,
      reasonKo: "Workspace State 반영 실패",
      forbiddenRealityMutation: false,
    };
  }

  for (const stamp of realityStamps) {
    const still = getRealityObject(stamp.id);
    if (still && stamp.at != null && still.updatedAt !== stamp.at) {
      return {
        ok: false,
        reasonKo: "Global Reality Store가 변경됨 — 금지",
        forbiddenRealityMutation: true,
      };
    }
  }

  return {
    ok: true,
    mutation,
    workspaceId: next.id,
    beforeVisibleCount: beforeVisible,
    afterVisibleCount: visibleCount(next),
    summaryKo: labelKo,
  };
}

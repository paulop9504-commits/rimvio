/**
 * Apply Workspace Patch — Patch-unit mutation only (no Answer storage).
 */

import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import { applyWorkspaceRealityPatch } from "@/lib/context-workspace/apply-workspace-reality-patch";
import {
  ensureWorkspaceAnchorNode,
  resolveRealityAnchorFromUtterance,
} from "@/lib/context-workspace/reality-anchor";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import type { WorkspacePatch } from "@/lib/context-workspace/workspace-patch/types";
import type { WorkspacePatchRecord } from "@/lib/context-workspace/workspace-patch/types";
import { runAutoProjectionAfterPatch } from "@/lib/context-workspace/auto-projection";
import { applyNetworkAbsorbVisibilityPatch } from "@/lib/reality-provider/network-absorb-projection-store";

export type ApplyWorkspacePatchResult = {
  readonly ok: boolean;
  readonly statusKo: string;
  readonly record: WorkspacePatchRecord | null;
  readonly needsRescout: boolean;
  readonly scoutQuery: string | null;
};

function appendPatchRecord(
  contextEventId: string,
  record: WorkspacePatchRecord,
): void {
  const state = readContextWorkspace(contextEventId);
  if (!state) return;
  const prev = Array.isArray(state.patches) ? state.patches : [];
  writeContextWorkspace({
    ...state,
    patches: [...prev, record].slice(-40),
    lastChangeKo: record.statusKo,
    updatedAtIso: record.atIso,
  });
}

function makeRecord(input: {
  readonly patch: WorkspacePatch;
  readonly utterance: string | null;
  readonly statusKo: string;
}): WorkspacePatchRecord {
  return {
    id: `patch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind: input.patch.kind,
    patch: input.patch,
    utterance: input.utterance,
    statusKo: input.statusKo,
    atIso: new Date().toISOString(),
    answerForbidden: true,
  };
}

/**
 * Apply one Patch to the provisional Workspace.
 * Never writes assistant essay answers into Workspace SSOT.
 */
export function applyWorkspacePatch(input: {
  readonly contextEventId: string;
  readonly patch: WorkspacePatch;
  readonly utterance?: string | null;
  /** When true, caller runs Auto Projection (Agent Loop). Default: auto. */
  readonly skipAutoProjection?: boolean;
}): ApplyWorkspacePatchResult {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance?.trim() || null;
  if (!contextEventId) {
    return {
      ok: false,
      statusKo: "Workspace 없음",
      record: null,
      needsRescout: false,
      scoutQuery: null,
    };
  }

  const state = readContextWorkspace(contextEventId);
  if (!state || (state.status !== "editing" && state.status !== "committing")) {
    return {
      ok: false,
      statusKo: "편집 중인 Workspace 없음",
      record: null,
      needsRescout: false,
      scoutQuery: null,
    };
  }

  const patch = input.patch;
  let statusKo = "Patch 적용";
  let needsRescout = false;
  let scoutQuery: string | null = null;

  switch (patch.kind) {
    case "replace_entity": {
      const reality = applyWorkspaceRealityPatch({
        contextEventId,
        utterance: utterance ?? patch.query ?? "더 싼 호텔",
        patch: {
          ...(patch.cheaper ? { maxPriceBand: 2 } : {}),
          ...(patch.stayType
            ? {
                stayType: patch.stayType as never,
              }
            : {}),
        },
      });
      statusKo = reality.replyKo ?? "후보를 교체 패치했어요";
      needsRescout = reality.needsRescout;
      scoutQuery = reality.scoutQuery;
      break;
    }
    case "spatial_constraint": {
      const reality = applyWorkspaceRealityPatch({
        contextEventId,
        utterance: utterance ?? `${patch.nearLabelKo} 근처`,
        patch: {
          stationNear: patch.stationNear === true,
        },
      });
      const anchorHit = resolveRealityAnchorFromUtterance(
        utterance ?? patch.nearLabelKo,
      );
      if (anchorHit) {
        ensureWorkspaceAnchorNode({
          contextEventId,
          anchor: {
            entityId: anchorHit.geoId,
            titleKo: anchorHit.labelKo,
            labelKo: anchorHit.labelKo,
            kind: anchorHit.kind === "station" ? "station" : "attraction",
            lat: anchorHit.lat,
            lng: anchorHit.lng,
          },
          geoId: anchorHit.geoId,
          summaryKo: `${anchorHit.labelKo} · 숙소 기준점`,
        });
      }
      // Persist near label on lastChange; filter queryIncludes for projection.
      applyWorkspaceTransition({
        contextEventId,
        op: "filter",
        filter: {
          queryIncludes: patch.nearLabelKo,
        },
        changeKo: `${patch.nearLabelKo} 근처 제약`,
      });
      statusKo =
        reality.replyKo ?? `공간 제약 · ${patch.nearLabelKo} 근처`;
      needsRescout = true;
      const lodgingCue =
        /숙소|호텔|lodging|hotel|캡슐|료칸/iu.test(utterance ?? "") ||
        state.domain === "lodging";
      scoutQuery = `${patch.nearLabelKo} 근처 ${lodgingCue ? "숙소" : "장소"}`;
      break;
    }
    case "filter_entity": {
      applyWorkspaceTransition({
        contextEventId,
        op: "filter",
        filter: patch.filter,
        changeKo: "필터 패치",
      });
      const tags = patch.filter.tagIncludes ?? [];
      if (tags.some((t) => t.startsWith("stay:"))) {
        const stay = tags
          .find((t) => t.startsWith("stay:"))
          ?.replace(/^stay:/, "");
        const reality = applyWorkspaceRealityPatch({
          contextEventId,
          utterance: utterance ?? "필터",
          patch: stay ? { stayType: stay as never } : {},
        });
        needsRescout = reality.needsRescout;
        scoutQuery = reality.scoutQuery;
        statusKo = reality.replyKo ?? "필터 패치 적용";
      } else {
        statusKo = "필터 패치 적용";
      }
      break;
    }
    case "delete_entity": {
      const ids =
        patch.entityIds.length > 0
          ? patch.entityIds
          : state.selectedIds.length > 0
            ? state.selectedIds
            : [];
      if (ids.length === 0) {
        statusKo = "삭제할 Entity 없음";
        break;
      }
      applyWorkspaceTransition({
        contextEventId,
        op: "remove",
        nodeIds: ids,
        changeKo: "Entity 삭제 패치",
      });
      statusKo = `${ids.length}곳 삭제 패치`;
      break;
    }
    case "create_entity": {
      statusKo = "Create Entity · Tool 스카우트 대기";
      needsRescout = true;
      scoutQuery = patch.query ?? utterance;
      break;
    }
    case "connect_entity": {
      const fromId =
        patch.fromId ||
        state.selectedIds[0] ||
        state.nodes.find((n) => n.selected)?.id ||
        "";
      const toId =
        patch.toId ||
        state.selectedIds[1] ||
        state.compareIds[0] ||
        "";
      if (fromId && toId) {
        applyWorkspaceTransition({
          contextEventId,
          op: "compare",
          nodeIds: [fromId, toId],
          changeKo: "Connect Entity 패치",
        });
        const live = readContextWorkspace(contextEventId);
        if (live) {
          const edgeId = `patch_connect_${fromId}_${toId}`;
          writeContextWorkspace({
            ...live,
            relationshipEdges: [
              ...(live.relationshipEdges ?? []).filter((e) => e.id !== edgeId),
              {
                id: edgeId,
                kind: patch.relation ?? "nearby",
                fromId,
                toId,
                labelKo: patch.labelKo ?? "연결",
                meters: patch.meters ?? null,
              },
            ],
          });
        }
        statusKo = "Connect Entity 패치";
      } else {
        statusKo = "연결할 Entity 선택 필요";
      }
      break;
    }
    case "disconnect_entity": {
      const live = readContextWorkspace(contextEventId);
      if (live) {
        writeContextWorkspace({
          ...live,
          relationshipEdges: (live.relationshipEdges ?? []).filter(
            (e) =>
              !(
                (e.fromId === patch.fromId && e.toId === patch.toId) ||
                (e.fromId === patch.toId && e.toId === patch.fromId)
              ),
          ),
          lastChangeKo: "Disconnect Entity 패치",
          updatedAtIso: new Date().toISOString(),
        });
      }
      statusKo = "Disconnect Entity 패치";
      break;
    }
    case "move_schedule": {
      const live = readContextWorkspace(contextEventId);
      const day = patch.dayIndex + 1;
      const entityId =
        patch.entityId ||
        live?.selectedIds[0] ||
        live?.nodes.find((n) => n.selected)?.id ||
        live?.nodes.find((n) => n.visible)?.id ||
        null;
      if (live) {
        const dayNodeId = `schedule:day${day}`;
        const prevEdges = live.relationshipEdges ?? [];
        const scheduleEdge =
          entityId != null
            ? {
                id: `schedule_${entityId}_day${day}`,
                kind: "route" as const,
                fromId: entityId,
                toId: dayNodeId,
                labelKo: `Day${day} Draft`,
                meters: null as number | null,
              }
            : null;
        const edges = scheduleEdge
          ? [
              ...prevEdges.filter(
                (e) =>
                  !(
                    e.id.startsWith("schedule_") &&
                    (e.fromId === entityId || e.toId?.startsWith("schedule:day"))
                  ),
              ),
              scheduleEdge,
            ].slice(0, 64)
          : prevEdges;
        writeContextWorkspace({
          ...live,
          relationshipEdges: edges,
          lastChangeKo: entityId
            ? `Day${day} Draft · 일정 이동`
            : `Day${day} Draft`,
          // Soft schedule cue — full Reality Draft day move stays prepare-layer.
          realityPlan: {
            ...(live.realityPlan ?? {
              stayType: null,
              maxPriceBand: null,
              minRating: null,
              stationNear: false,
              onsenRequired: false,
              editCount: 0,
              lastEditKo: "",
              updatedAtIso: new Date().toISOString(),
            }),
            lastEditKo: `move_schedule:day${day}${entityId ? `:${entityId}` : ""}`,
            editCount: (live.realityPlan?.editCount ?? 0) + 1,
            updatedAtIso: new Date().toISOString(),
          },
          updatedAtIso: new Date().toISOString(),
        });
      }
      statusKo = `Day${day} Draft 생성`;
      break;
    }
    case "move_entity": {
      const live = readContextWorkspace(contextEventId);
      if (live && patch.lat != null && patch.lng != null) {
        writeContextWorkspace({
          ...live,
          nodes: live.nodes.map((n) =>
            n.id === patch.entityId || n.placeId === patch.entityId
              ? { ...n, lat: patch.lat!, lng: patch.lng! }
              : n,
          ),
          lastChangeKo: "Move Entity 패치",
          updatedAtIso: new Date().toISOString(),
        });
        statusKo = "Move Entity 패치";
      } else {
        statusKo = "Move Entity · 좌표 없음";
      }
      break;
    }
    case "update_entity": {
      statusKo = "Update Entity 패치";
      break;
    }
    case "create_draft": {
      statusKo = patch.labelKo?.slice(0, 40) ?? "Draft 생성 패치";
      break;
    }
    case "simulation": {
      applyWorkspaceTransition({
        contextEventId,
        op: "simulate",
        changeKo: patch.scenarioKo?.slice(0, 40) ?? "Simulation 패치",
      });
      statusKo = "Simulation 패치";
      break;
    }
    case "absorb_network": {
      statusKo =
        patch.labelKo?.trim() ||
        `네트워크 ${patch.lineCount}노선 · ${patch.providerId}`;
      if (patch.family && patch.visibilityOp) {
        const next = applyNetworkAbsorbVisibilityPatch({
          family: patch.family,
          op: patch.visibilityOp,
          lineIds: patch.lineIds ?? [],
          labelKo: patch.labelKo ?? statusKo,
          providerId: patch.providerId,
          needId: patch.needId,
        });
        const state = readContextWorkspace(contextEventId);
        if (state) {
          writeContextWorkspace({
            ...state,
            networkAbsorb: next,
            updatedAtIso: new Date().toISOString(),
          });
        }
      }
      break;
    }
    case "absorb_geometry": {
      statusKo = `${patch.labelKo} 영역 · ${patch.geometryType} · ${patch.providerId}`;
      break;
    }
    default: {
      statusKo = "알 수 없는 Patch";
      break;
    }
  }

  const record = makeRecord({ patch, utterance, statusKo });
  appendPatchRecord(contextEventId, record);

  // STEP 6 — Auto Projection (always; no user Refresh)
  if (!input.skipAutoProjection) {
    const focusIds =
      patch.kind === "delete_entity"
        ? []
        : readContextWorkspace(contextEventId)?.selectedIds ?? [];
    runAutoProjectionAfterPatch({
      contextEventId,
      patchRecord: record,
      entityIds: focusIds.length ? focusIds : null,
    });
  }

  return {
    ok: true,
    statusKo,
    record,
    needsRescout,
    scoutQuery,
  };
}

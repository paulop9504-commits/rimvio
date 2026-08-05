/**
 * Project acquired network bundle → Materialized Visibility SSOT → Map.
 * Domain overlay stores are legacy sync adapters only.
 */

import type { RealityRailNetworkBundle } from "@/lib/reality-provider/normalize-types";
import type { RealityNeed, RealityProviderId } from "@/lib/reality-provider/types";
import {
  type NetworkAbsorbFamily,
  type NetworkAbsorbVisibilityOp,
} from "@/lib/reality-provider/network-absorb-projection";
import { applyNetworkAbsorbVisibilityPatch } from "@/lib/reality-provider/network-absorb-projection-store";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import type { WorkspacePatchRecord } from "@/lib/context-workspace/workspace-patch/types";
import {
  OSAKA_JR_LINE_IDS,
} from "@/lib/geo/osaka-jr";
import { OSAKA_METRO_LINE_IDS } from "@/lib/geo/osaka-metro/line-catalog";
import { JAPAN_METRO_LINE_IDS } from "@/lib/geo/japan-metro/line-catalog";
import { JAPAN_SHINKANSEN_LINE_IDS } from "@/lib/geo/japan-shinkansen/line-catalog";
import { KOREA_RAIL_LINE_IDS } from "@/lib/geo/korea-rail/line-catalog";

export type ProjectNetworkAbsorbResult = {
  readonly statusKo: string;
  readonly lineCount: number;
  readonly stationCount: number;
  readonly providerId: RealityProviderId;
  readonly workspacePatched: boolean;
};

function catalogSize(family: NetworkAbsorbFamily): number {
  switch (family) {
    case "osaka_jr":
      return OSAKA_JR_LINE_IDS.length;
    case "osaka_metro":
      return OSAKA_METRO_LINE_IDS.length;
    case "japan_metro":
      return JAPAN_METRO_LINE_IDS.length;
    case "shinkansen":
      return JAPAN_SHINKANSEN_LINE_IDS.length;
    case "korea_rail":
      return KOREA_RAIL_LINE_IDS.length;
  }
}

function resolveVisibilityOp(input: {
  readonly hide: boolean;
  readonly family: NetworkAbsorbFamily;
  readonly lineIds: readonly string[];
}): NetworkAbsorbVisibilityOp {
  const { hide, family, lineIds } = input;
  const full = catalogSize(family);
  if (hide) {
    if (lineIds.length === 0 || lineIds.length >= full) return "clear";
    return "remove";
  }
  if (lineIds.length === 0 || lineIds.length >= full) return "replace";
  if (lineIds.length === 1) return "add";
  return "replace";
}

function makeAbsorbRecord(input: {
  readonly need: RealityNeed;
  readonly providerId: RealityProviderId;
  readonly family: NetworkAbsorbFamily;
  readonly visibility: "show" | "hide";
  readonly visibilityOp: NetworkAbsorbVisibilityOp;
  readonly lineIds: readonly string[];
  readonly labelKo: string;
  readonly lineCount: number;
  readonly stationCount: number;
  readonly statusKo: string;
}): WorkspacePatchRecord {
  return {
    id: `patch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind: "absorb_network",
    patch: {
      kind: "absorb_network",
      needId: input.need.needId,
      providerId: input.providerId,
      lineCount: input.lineCount,
      stationCount: input.stationCount,
      family: input.family,
      visibility: input.visibility,
      visibilityOp: input.visibilityOp,
      lineIds: input.lineIds,
      labelKo: input.labelKo,
    },
    utterance: input.need.utterance,
    statusKo: input.statusKo,
    atIso: new Date().toISOString(),
    answerForbidden: true,
  };
}

/**
 * Projection step — SSOT first, then optional Workspace Patch log.
 * Map reads absorb Projection via hooks — no domain overlay store writes.
 */
export function projectNetworkAbsorb(input: {
  readonly need: RealityNeed;
  readonly bundle: RealityRailNetworkBundle;
  readonly contextEventId?: string | null;
}): ProjectNetworkAbsorbResult {
  const { need, bundle, contextEventId } = input;
  const hide = need.visibility === "hide";
  const family = bundle.family;
  const lineIds = bundle.lines.map((l) => l.id);
  const visibilityOp = resolveVisibilityOp({ hide, family, lineIds });
  const visibility = hide ? "hide" : "show";

  const statusKo = hide
    ? `${bundle.labelKo} 숨김`
    : `${bundle.labelKo} ${bundle.lines.length}개 노선` +
      (bundle.stations.length > 0
        ? ` · 역 ${bundle.stations.length}`
        : "");

  const atIso = new Date().toISOString();

  // 1) Materialize session Projection SSOT (Map hooks subscribe here)
  const materialized = applyNetworkAbsorbVisibilityPatch({
    family,
    op: visibilityOp,
    lineIds,
    labelKo: bundle.labelKo,
    providerId: bundle.providerId,
    needId: need.needId,
    atIso,
  });

  let workspacePatched = false;
  const ctx = contextEventId?.trim() ?? "";
  if (ctx) {
    const state = readContextWorkspace(ctx);
    if (state && (state.status === "editing" || state.status === "committing")) {
      const record = makeAbsorbRecord({
        need,
        providerId: bundle.providerId,
        family,
        visibility,
        visibilityOp,
        lineIds,
        labelKo: bundle.labelKo,
        lineCount:
          visibilityOp === "clear"
            ? 0
            : (materialized.families[family]?.lineIds.length ?? 0),
        stationCount: hide ? 0 : bundle.stations.length,
        statusKo,
      });
      const prev = Array.isArray(state.patches) ? state.patches : [];
      writeContextWorkspace({
        ...state,
        lastChangeKo: statusKo,
        networkAbsorb: materialized,
        patches: [...prev, record].slice(-40),
        updatedAtIso: record.atIso,
      });
      workspacePatched = true;
    }
  }

  const visibleCount =
    materialized.families[family]?.lineIds.length ?? 0;

  return {
    statusKo,
    lineCount: visibleCount,
    stationCount: hide ? 0 : bundle.stations.length,
    providerId: bundle.providerId,
    workspacePatched,
  };
}

/** @deprecated */
export const projectRailNetworkAbsorb = projectNetworkAbsorb;
export type ProjectRailAbsorbResult = ProjectNetworkAbsorbResult;

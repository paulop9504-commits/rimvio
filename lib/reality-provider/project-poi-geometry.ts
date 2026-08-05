/**
 * Project acquired POI footprint → map glow store + Workspace Patch log.
 */

import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import type { WorkspacePatchRecord } from "@/lib/context-workspace/workspace-patch/types";
import type { RealityPoiGeometryObject } from "@/lib/reality-provider/normalize-poi-geometry";
import { projectPoiGeometryOverlay } from "@/lib/reality-provider/poi-geometry-store";
import type { RealityNeed, RealityProviderId } from "@/lib/reality-provider/types";

export type ProjectPoiGeometryResult = {
  readonly statusKo: string;
  readonly providerId: RealityProviderId;
  readonly workspacePatched: boolean;
  readonly geometryType: "Polygon" | "MultiPolygon";
};

function makeAbsorbRecord(input: {
  readonly need: RealityNeed;
  readonly providerId: RealityProviderId;
  readonly object: RealityPoiGeometryObject;
  readonly statusKo: string;
}): WorkspacePatchRecord {
  return {
    id: `patch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind: "absorb_geometry",
    patch: {
      kind: "absorb_geometry",
      needId: input.need.needId,
      providerId: input.providerId,
      geoId: input.object.geoId,
      geometryType: input.object.geometry.type,
      labelKo: input.object.labelKo,
    },
    utterance: input.need.utterance,
    statusKo: input.statusKo,
    atIso: new Date().toISOString(),
    answerForbidden: true,
  };
}

/**
 * Projection: glow on map + optional Patch log (Article 0 — no Reality Commit).
 */
export function projectPoiGeometryAbsorb(input: {
  readonly need: RealityNeed;
  readonly object: RealityPoiGeometryObject;
  readonly contextEventId: string;
}): ProjectPoiGeometryResult {
  const { need, object, contextEventId } = input;
  projectPoiGeometryOverlay({ contextEventId, object });

  const statusKo = `${object.labelKo} 영역 · ${object.providerId}`;
  let workspacePatched = false;
  const state = readContextWorkspace(contextEventId);
  if (state && (state.status === "editing" || state.status === "committing")) {
    const record = makeAbsorbRecord({
      need,
      providerId: object.providerId,
      object,
      statusKo,
    });
    const prev = Array.isArray(state.patches) ? state.patches : [];
    writeContextWorkspace({
      ...state,
      lastChangeKo: statusKo,
      patches: [...prev, record].slice(-40),
      updatedAtIso: record.atIso,
    });
    workspacePatched = true;
  }

  return {
    statusKo,
    providerId: object.providerId,
    workspacePatched,
    geometryType: object.geometry.type,
  };
}

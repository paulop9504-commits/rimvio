/**
 * Workspace Reality Patch — NL edits the work plan (not a user-facing "filter").
 * ADR-022 Workspace Patch · Constraint-style stay / budget / distance patches.
 */

import {
  getLodgingStayTypeEntry,
  parseLodgingStayTypeFromText,
  type LodgingStayType,
} from "@/lib/globe/lodging/lodging-stay-types";

export type WorkspaceRealityPlan = {
  readonly stayType: LodgingStayType | null;
  readonly maxPriceBand: number | null;
  readonly minRating: number | null;
  readonly stationNear: boolean;
  readonly onsenRequired: boolean;
  readonly editCount: number;
  readonly lastEditKo: string;
  readonly updatedAtIso: string;
};

export type WorkspaceRealityPatch = {
  readonly stayType?: LodgingStayType | null;
  readonly maxPriceBand?: number | null;
  readonly minRating?: number | null;
  readonly stationNear?: boolean;
  readonly onsenRequired?: boolean;
};

export function emptyWorkspaceRealityPlan(): WorkspaceRealityPlan {
  return {
    stayType: null,
    maxPriceBand: null,
    minRating: null,
    stationNear: false,
    onsenRequired: false,
    editCount: 0,
    lastEditKo: "",
    updatedAtIso: new Date(0).toISOString(),
  };
}

export function stayTypeTag(stayType: LodgingStayType): string {
  return `stay:${stayType}`;
}

/** Soft edit cues — preference / constraint language (not "검색해줘" alone). */
export function isWorkspaceEditUtterance(text: string): boolean {
  return /위주|바꿔|바꾸|으로\s*해|로\s*해|만\s*보|선호|중심|필수로|우선|좀\s*더|더\s*싸|저렴|가성비|역\s*근처|역앞|역세권|온천|료칸|캡슐|호스텔|게스트|한옥|민박|리조트|patch|prefer|instead|only/iu.test(
    text,
  );
}

export function parseWorkspaceRealityPatch(
  utterance: string,
): WorkspaceRealityPatch | null {
  const text = utterance.trim();
  if (!text) return null;

  const stayType = parseLodgingStayTypeFromText(text);
  const budget = /더\s*싸|저렴|싼|가성비|budget|cheap|가격\s*낮은/iu.test(text);
  const stationNear =
    /역\s*근처|역앞|역세권|역에서\s*가깝|station\s*near|near\s*(the\s*)?station|가까운\s*역/iu.test(
      text,
    );
  const onsenRequired = /온천|onsen|노천탕|温泉/iu.test(text);
  let minRating: number | null = null;
  if (/평점|별점|rating|리뷰\s*좋은|평\s*높은/iu.test(text)) {
    const m = text.match(/(\d+(?:\.\d+)?)/);
    minRating = m?.[1] ? Number(m[1]) : 4.5;
  }

  const patch: WorkspaceRealityPatch = {
    ...(stayType ? { stayType } : {}),
    ...(budget ? { maxPriceBand: 2 } : {}),
    ...(stationNear ? { stationNear: true } : {}),
    ...(onsenRequired ? { onsenRequired: true } : {}),
    ...(minRating != null ? { minRating } : {}),
  };

  const hasField =
    patch.stayType != null ||
    patch.maxPriceBand != null ||
    patch.minRating != null ||
    patch.stationNear === true ||
    patch.onsenRequired === true;

  if (!hasField) return null;

  // Bare stay noun without edit cue still counts (「캡슐호텔」alone).
  if (
    stayType &&
    !isWorkspaceEditUtterance(text) &&
    !budget &&
    !stationNear &&
    !onsenRequired &&
    minRating == null
  ) {
    // Allow — stay type is itself an accommodation preference edit.
  }

  return patch;
}

export function mergeWorkspaceRealityPlan(
  prev: WorkspaceRealityPlan | null | undefined,
  patch: WorkspaceRealityPatch,
  lastEditKo: string,
): WorkspaceRealityPlan {
  const base = prev ?? emptyWorkspaceRealityPlan();
  return {
    stayType:
      patch.stayType !== undefined ? patch.stayType : base.stayType,
    maxPriceBand:
      patch.maxPriceBand !== undefined
        ? patch.maxPriceBand
        : base.maxPriceBand,
    minRating:
      patch.minRating !== undefined ? patch.minRating : base.minRating,
    stationNear:
      patch.stationNear !== undefined
        ? patch.stationNear
        : base.stationNear,
    onsenRequired:
      patch.onsenRequired !== undefined
        ? patch.onsenRequired
        : base.onsenRequired,
    editCount: base.editCount + 1,
    lastEditKo,
    updatedAtIso: new Date().toISOString(),
  };
}

export function describeWorkspaceRealityPatch(
  patch: WorkspaceRealityPatch,
): string {
  const bits: string[] = [];
  if (patch.stayType) {
    const label =
      getLodgingStayTypeEntry(patch.stayType)?.labelKo ?? patch.stayType;
    bits.push(`숙소 선호 → ${label}`);
  }
  if (patch.maxPriceBand != null) {
    bits.push("예산 비중 ↑");
  }
  if (patch.stationNear) {
    bits.push("역 근처 우선");
  }
  if (patch.onsenRequired) {
    bits.push("온천 필수");
  }
  if (patch.minRating != null) {
    bits.push(`평점 ${patch.minRating}+`);
  }
  return bits.join(" · ") || "작업 조건을 바꿨어요";
}

export function nodeMatchesStayTypeBlob(
  title: string,
  summary: string,
  stayType: LodgingStayType,
): boolean {
  const entry = getLodgingStayTypeEntry(stayType);
  if (!entry) return false;
  return entry.filterSignal.test(`${title} ${summary}`);
}

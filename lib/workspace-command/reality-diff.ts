/**
 * Reality Diff — before/after Workspace context (not Global Reality rewrite).
 * Git-style candidate universe diffs for Draft Preview.
 */

import type { RealityDiff, WorkspaceImpact } from "@/lib/workspace-command/types";
import type { WorkspaceIntent } from "@/lib/workspace-command/types";
import type { Workspace, WorkspaceObject } from "@/lib/workspace/workspace-types";
import { applyFilterVisibility } from "@/lib/workspace/mutation/object-match";
import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";

function hotelTypeFromWorkspace(ws: Workspace | null): string {
  if (!ws) return "all";
  const cat = ws.filters.find((f) => f.key === "category" || f.key === "hotelType");
  if (typeof cat?.value === "string") return cat.value;
  return "all";
}

function hotelObjects(ws: Workspace | null): readonly WorkspaceObject[] {
  if (!ws) return [];
  return ws.objects.filter((o) => o.kind === "hotel");
}

function visibleHotels(ws: Workspace | null): number {
  return hotelObjects(ws).filter((o) => o.visible).length;
}

function avgPriceWon(objects: readonly WorkspaceObject[]): number | null {
  const prices: number[] = [];
  for (const o of objects) {
    const fromAttr =
      typeof o.attrs.priceWon === "number" ? o.attrs.priceWon : null;
    const parsed = fromAttr ?? parseWonAmount(o.priceLabelKo);
    if (parsed != null) prices.push(parsed);
  }
  if (prices.length === 0) return null;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

function centroid(
  objects: readonly WorkspaceObject[],
): { lat: number; lng: number } | null {
  const pts = objects.filter(
    (o) => o.visible && o.lat != null && o.lng != null,
  );
  if (pts.length === 0) return null;
  const lat = pts.reduce((s, o) => s + (o.lat as number), 0) / pts.length;
  const lng = pts.reduce((s, o) => s + (o.lng as number), 0) / pts.length;
  return { lat, lng };
}

export function buildRealityDiffFromIntent(input: {
  readonly workspace: Workspace | null;
  readonly intent: WorkspaceIntent;
}): RealityDiff {
  const ws = input.workspace;
  const universe = hotelObjects(ws);
  const beforeVisibleObjs = universe.filter((o) => o.visible);
  const beforeVisible = beforeVisibleObjs.length;
  const beforeHotelType = hotelTypeFromWorkspace(ws);
  const beforeAvgPrice = avgPriceWon(beforeVisibleObjs);
  const beforeCentroid = centroid(beforeVisibleObjs);

  const hotelType =
    typeof input.intent.parameters.hotelType === "string"
      ? input.intent.parameters.hotelType
      : typeof input.intent.parameters.category === "string"
        ? input.intent.parameters.category
        : null;

  const maxPriceBand =
    typeof input.intent.parameters.maxPriceBand === "number"
      ? input.intent.parameters.maxPriceBand
      : null;

  const near =
    typeof input.intent.parameters.near === "string"
      ? input.intent.parameters.near
      : null;

  let afterObjs = [...beforeVisibleObjs];
  let afterHotelType = beforeHotelType;
  const afterState: Record<string, unknown> = { hotelType: beforeHotelType };

  if (
    input.intent.action === "filter" ||
    input.intent.action === "modify_context"
  ) {
    if (hotelType && ws) {
      const nextObjects = applyFilterVisibility(ws.objects, "hotel", {
        category: hotelType,
      });
      afterObjs = nextObjects.filter((o) => o.kind === "hotel" && o.visible);
      afterHotelType = hotelType;
      afterState.hotelType = hotelType;
    } else if (maxPriceBand != null && ws) {
      const nextObjects = applyFilterVisibility(ws.objects, "hotel", {
        maxPriceBand,
      });
      afterObjs = nextObjects.filter((o) => o.kind === "hotel" && o.visible);
      afterState.maxPriceBand = maxPriceBand;
    }
  }

  if (input.intent.action === "add_constraint" && near && ws) {
    const nextObjects = applyFilterVisibility(ws.objects, "hotel", { near });
    afterObjs = nextObjects.filter((o) => o.kind === "hotel" && o.visible);
    afterState.near = near;
  }

  if (input.intent.action === "remove_constraint") {
    afterObjs = [...universe];
    afterHotelType = "all";
    afterState.hotelType = "all";
  }

  const afterVisible = afterObjs.length;
  const afterAvgPrice = avgPriceWon(afterObjs);
  const afterCentroid = centroid(afterObjs);
  const avgPriceDeltaWon =
    beforeAvgPrice != null && afterAvgPrice != null
      ? afterAvgPrice - beforeAvgPrice
      : null;
  const locationChanged =
    beforeCentroid != null &&
    afterCentroid != null &&
    (Math.abs(beforeCentroid.lat - afterCentroid.lat) > 0.001 ||
      Math.abs(beforeCentroid.lng - afterCentroid.lng) > 0.001);

  const impact = analyzeVisibleImpact(beforeVisible, afterVisible, {
    universeTotal: universe.length,
    avgPriceDeltaWon,
    locationChanged,
    beforeAvgPriceWon: beforeAvgPrice,
    afterAvgPriceWon: afterAvgPrice,
  });

  return {
    before: {
      hotelType: beforeHotelType,
      labelKo: beforeHotelType === "all" ? "Hotel Universe" : beforeHotelType,
      visibleHotels: beforeVisible,
      universeTotal: universe.length,
      avgPriceWon: beforeAvgPrice,
    },
    after: {
      ...afterState,
      hotelType: afterHotelType,
      labelKo:
        afterHotelType === "capsule"
          ? "Capsule Hotel"
          : afterHotelType === "all"
            ? "Hotel Universe"
            : afterHotelType,
      visibleHotels: afterVisible,
      universeTotal: universe.length,
      avgPriceWon: afterAvgPrice,
    },
    impact,
  };
}

export function analyzeVisibleImpact(
  beforeVisible: number,
  afterVisible: number,
  extras?: {
    readonly universeTotal?: number;
    readonly avgPriceDeltaWon?: number | null;
    readonly locationChanged?: boolean;
    readonly beforeAvgPriceWon?: number | null;
    readonly afterAvgPriceWon?: number | null;
  },
): WorkspaceImpact {
  let pct: number | null = null;
  if (beforeVisible > 0) {
    pct = Math.round(((afterVisible - beforeVisible) / beforeVisible) * 100);
  } else if (afterVisible === 0) {
    pct = 0;
  }
  const delta = afterVisible - beforeVisible;
  const summaryKo =
    pct != null && pct < 0
      ? `후보 ${Math.abs(pct)}% 감소 · ${beforeVisible}→${afterVisible}`
      : pct != null && pct > 0
        ? `후보 ${pct}% 증가 · ${beforeVisible}→${afterVisible}`
        : `표시 ${beforeVisible}→${afterVisible}`;

  const avgPriceDeltaWon = extras?.avgPriceDeltaWon ?? null;

  return {
    visibleHotelsDeltaPct: pct,
    beforeVisibleCount: beforeVisible,
    afterVisibleCount: afterVisible,
    summaryKo,
    details: {
      delta,
      candidatesRemoved: delta < 0 ? Math.abs(delta) : 0,
      universeTotal: extras?.universeTotal ?? null,
      avgPriceDeltaWon,
      locationChanged: extras?.locationChanged ?? false,
      beforeAvgPriceWon: extras?.beforeAvgPriceWon ?? null,
      afterAvgPriceWon: extras?.afterAvgPriceWon ?? null,
      priceAvgDecreased: avgPriceDeltaWon != null && avgPriceDeltaWon < 0,
    },
  };
}

export function formatRealityDiffPreviewKo(diff: RealityDiff): string {
  const beforeType = String(diff.before.hotelType ?? "all");
  const afterType = String(diff.after.hotelType ?? beforeType);
  const afterCount = Number(diff.after.visibleHotels ?? diff.impact.afterVisibleCount);
  return `현재: ${beforeType === "all" ? "호텔 전체" : beforeType} · 변경 예정: ${
    afterType === "capsule" ? "캡슐호텔" : afterType
  } ${afterCount}개 · ${diff.impact.summaryKo}`;
}

/**
 * Git-style Reality Diff preview for Draft UI.
 *
 * Before: Hotel Universe 150
 * After:  Capsule Hotel 12
 * Impact: -138 · avg price ↓ · location Δ
 */
export function formatRealityDiffGitStyleKo(diff: RealityDiff): string {
  const beforeLabel = String(
    diff.before.labelKo ??
      (diff.before.hotelType === "all" ? "Hotel Universe" : diff.before.hotelType),
  );
  const afterLabel = String(
    diff.after.labelKo ??
      (diff.after.hotelType === "capsule"
        ? "Capsule Hotel"
        : diff.after.hotelType),
  );
  const beforeN = Number(diff.before.visibleHotels ?? diff.impact.beforeVisibleCount);
  const afterN = Number(diff.after.visibleHotels ?? diff.impact.afterVisibleCount);
  const removed = Number(diff.impact.details.candidatesRemoved ?? beforeN - afterN);
  const avgDelta = diff.impact.details.avgPriceDeltaWon as number | null | undefined;
  const loc = Boolean(diff.impact.details.locationChanged);

  const impactBits = [
    removed > 0 ? `-${removed} candidates` : `${afterN - beforeN} candidates`,
    avgDelta != null && avgDelta < 0 ? "+ 가격 평균 감소" : null,
    avgDelta != null && avgDelta > 0 ? "+ 가격 평균 증가" : null,
    loc ? "+ 위치 변화" : null,
  ].filter(Boolean);

  return [
    `Before: ${beforeLabel} · ${beforeN}개`,
    `After:  ${afterLabel} · ${afterN}개`,
    `Impact: ${impactBits.join(" · ") || diff.impact.summaryKo}`,
  ].join("\n");
}

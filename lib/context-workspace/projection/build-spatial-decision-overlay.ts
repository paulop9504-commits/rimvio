/**
 * Spatial Decision Overlay — Intent · Zone · Entity · Reasoning.
 * Projection for 2D Workspace map (not chat essay SSOT).
 *
 * Inspired by clean floating Decision UI patterns; Rimvio vocabulary only.
 */

import type { IntentDecisionFacetProjection } from "@/lib/context-workspace/projection/build-intent-decision-facets";
import type { WorkspaceAnchorZone } from "@/lib/context-workspace/map/sync-workspace-anchor-zone";
import type {
  MobileWorkspaceEntity,
  MobileWorkspaceRelation,
} from "@/lib/mobile-workspace/types";

export type SpatialDecisionBadge = {
  readonly id: string;
  readonly labelKo: string;
};

export type SpatialDecisionOverlay = {
  /** 1-line status (toast / agent card) */
  readonly statusKo: string;
  readonly camera: {
    readonly lat: number;
    readonly lng: number;
    readonly zoom: number;
  };
  /** Layer 1 — soft walk / station zone */
  readonly anchorZone: WorkspaceAnchorZone | null;
  /** Layer 3 — primary entity summary for float card */
  readonly target: {
    readonly id: string;
    readonly titleKo: string;
    readonly lat: number;
    readonly lng: number;
    readonly matchPercent: number | null;
    readonly priceLabelKo: string | null;
    readonly reasonsKo: readonly string[];
    readonly badgesKo: readonly SpatialDecisionBadge[];
  };
};

function walkRadiusMeters(walkMinutes: number | null): number {
  if (walkMinutes == null || !Number.isFinite(walkMinutes)) return 400;
  return Math.max(120, Math.min(900, Math.round(walkMinutes * 80)));
}

function pickNearbyRelation(
  entityId: string,
  relations: readonly MobileWorkspaceRelation[],
): MobileWorkspaceRelation | null {
  const nearby = relations.filter(
    (r) =>
      (r.fromId === entityId || r.toId === entityId) &&
      (r.kind === "nearby" || r.kind === "route"),
  );
  if (nearby.length === 0) return null;
  return (
    [...nearby].sort(
      (a, b) => (a.walkMinutes ?? 99) - (b.walkMinutes ?? 99),
    )[0] ?? null
  );
}

function buildBadges(input: {
  readonly projection: IntentDecisionFacetProjection;
  readonly near: MobileWorkspaceRelation | null;
  readonly entity: MobileWorkspaceEntity;
}): readonly SpatialDecisionBadge[] {
  const badges: SpatialDecisionBadge[] = [];
  if (input.near?.walkMinutes != null) {
    badges.push({
      id: "walk",
      labelKo: `${input.near.labelKo} 도보 ${input.near.walkMinutes}분`,
    });
  }
  if (input.projection.stayType === "capsule") {
    badges.push({ id: "capsule", labelKo: "캡슐" });
  }
  const priceFacet = input.projection.facets.find((f) => f.id === "price");
  if (priceFacet?.labelKo === "가성비") {
    badges.push({ id: "value", labelKo: "가성비" });
  }
  if (input.projection.matchHintPercent != null) {
    badges.push({
      id: "match",
      labelKo: `Match ${input.projection.matchHintPercent}%`,
    });
  }
  if (input.entity.priceLabelKo?.trim()) {
    badges.push({
      id: "price",
      labelKo: input.entity.priceLabelKo.trim().slice(0, 16),
    });
  }
  // Dedupe by label
  const seen = new Set<string>();
  return badges.filter((b) => {
    if (seen.has(b.labelKo)) return false;
    seen.add(b.labelKo);
    return true;
  }).slice(0, 4);
}

/**
 * Build spatial overlay from live Intent projection + entity.
 */
export function buildSpatialDecisionOverlay(input: {
  readonly entity: MobileWorkspaceEntity;
  readonly projection: IntentDecisionFacetProjection;
  readonly relations?: readonly MobileWorkspaceRelation[] | null;
  /** Station / place used as walk zone center (fallback: entity) */
  readonly zoneCenter?: { readonly lat: number; readonly lng: number } | null;
  readonly zoneNameKo?: string | null;
}): SpatialDecisionOverlay {
  const relations = input.relations ?? [];
  const near = pickNearbyRelation(input.entity.id, relations);
  const why =
    input.projection.facets.find((f) => f.id === "why")?.linesKo ??
    [input.projection.primaryWhyKo].filter(Boolean);

  const zoneCenter = input.zoneCenter ?? {
    lat: input.entity.lat,
    lng: input.entity.lng,
  };
  const stationNear =
    /역|station/iu.test(near?.labelKo ?? "") ||
    /역\s*근처|station/iu.test(input.projection.intentLabelKo);

  const anchorZone: WorkspaceAnchorZone | null =
    stationNear || near
      ? {
          nameKo:
            input.zoneNameKo?.trim() ||
            (near
              ? `${near.labelKo} 도보권`
              : "탐색 반경"),
          lat: zoneCenter.lat,
          lng: zoneCenter.lng,
          radiusMeters: walkRadiusMeters(near?.walkMinutes ?? 5),
        }
      : {
          nameKo: "탐색 반경",
          lat: input.entity.lat,
          lng: input.entity.lng,
          radiusMeters: 320,
        };

  const badges = buildBadges({
    projection: input.projection,
    near,
    entity: input.entity,
  });

  return {
    statusKo: input.projection.primaryWhyKo || input.projection.intentLabelKo,
    camera: {
      lat: input.entity.lat,
      lng: input.entity.lng,
      zoom: 15.8,
    },
    anchorZone,
    target: {
      id: input.entity.id,
      titleKo: input.entity.title,
      lat: input.entity.lat,
      lng: input.entity.lng,
      matchPercent: input.projection.matchHintPercent,
      priceLabelKo: input.entity.priceLabelKo,
      reasonsKo: why.slice(0, 3),
      badgesKo: badges,
    },
  };
}

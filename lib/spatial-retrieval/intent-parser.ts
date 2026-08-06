/**
 * Intent Parser — NL → SPATIAL_DISCOVERY
 */

import {
  SPATIAL_DISCOVERY_TYPE,
  type SpatialAnchorEntity,
  type SpatialDiscoveryConstraints,
  type SpatialDiscoveryIntent,
  type SpatialRelation,
  type SpatialTargetEntity,
} from "@/lib/spatial-retrieval/types";

function emptyConstraints(
  patch?: Partial<SpatialDiscoveryConstraints>,
): SpatialDiscoveryConstraints {
  return {
    distance: patch?.distance ?? null,
    walkingTime: patch?.walkingTime ?? null,
    category: patch?.category ?? null,
    budgetBand: patch?.budgetBand ?? null,
    scheduleWindow: patch?.scheduleWindow ?? null,
  };
}

function looksLikeSpatialDiscovery(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  // Stay-type lodging alone (캡슐호텔 찾아줘) — Workspace Patch, not spatial.
  if (
    /캡슐\s*호텔|캡슐호텔|호스텔|게스트\s*하우스|료칸|capsule|hostel|ryokan/iu.test(
      t,
    ) &&
    !/근처|주변|near|around|기준|맛집|식당|카페|cafe/iu.test(t)
  ) {
    return false;
  }
  const hasDiscover =
    /찾아|보여|근처|주변|near|around|기준|기반으로/iu.test(t);
  const hasTarget =
    /맛집|식당|카페|cafe|restaurant|food|숙소|호텔|hotel|놀거리|관광|attraction/iu.test(
      t,
    );
  const hasAnchorCue =
    /호텔|숙소|hotel|위치|근처|주변|기준|USJ|역|station|내\s*위치/iu.test(t);
  return hasDiscover && hasTarget && hasAnchorCue;
}

function resolveTarget(text: string): SpatialTargetEntity {
  if (/카페|cafe|커피/iu.test(text)) return "cafe";
  if (/숙소|호텔|hotel|lodging/iu.test(text) && /근처|주변|near|기준/iu.test(text)) {
    // "USJ 근처 숙소" → target hotel (유니버설 · 유니버셜)
    if (
      /USJ|유니버설|유니버셜|도톤보리|역|attraction|관광|놀거리/iu.test(text)
    ) {
      return "hotel";
    }
  }
  if (/놀거리|관광|attraction|테마파|아쿠아/iu.test(text)) return "attraction";
  if (/편의|약국|amenity/iu.test(text)) return "amenity";
  if (/맛집|식당|먹을|restaurant|food|맛\s*집/iu.test(text)) return "restaurant";
  // Bare lodging find (no 근처) still hotel when stay words dominate.
  if (/숙소|호텔|hotel|lodging/iu.test(text)) return "hotel";
  return "restaurant";
}

function resolveAnchorType(text: string): SpatialAnchorEntity {
  if (/내\s*위치|현재\s*위치|my\s*location|gps/iu.test(text)) {
    return "user_location";
  }
  if (/USJ|유니버설|유니버셜/iu.test(text) && /근처|주변|near/iu.test(text)) {
    return "attraction";
  }
  // 「모리노미아역 근처」— station wins over hotel-word in the same utterance.
  if (/역|駅|station/iu.test(text) && /근처|주변|near|around/iu.test(text)) {
    return "station";
  }
  if (/호텔|숙소|hotel|namba|난바/iu.test(text)) return "hotel";
  return "hotel";
}

function resolveRelation(text: string): SpatialRelation {
  if (/같은\s*동네|같은\s*구역|same\s*area|일대/iu.test(text)) {
    return "same_area";
  }
  if (/안|내부|inside|within/iu.test(text)) return "inside";
  if (/경로|루트|따라|route\s*along|가는\s*길/iu.test(text)) {
    return "route_along";
  }
  if (/도보|걸어서|walking\s*distance|걸어서\s*갈/iu.test(text)) {
    return "walking_distance";
  }
  return "nearby";
}

function resolveConstraints(text: string): SpatialDiscoveryConstraints {
  const walk = text.match(/(\d+)\s*분/);
  const meters = text.match(/(\d+)\s*m(?:eters?)?/i);
  const km = text.match(/(\d+(?:\.\d+)?)\s*km/i);
  let distance: number | null = null;
  if (meters) distance = Number(meters[1]);
  else if (km) distance = Math.round(Number(km[1]) * 1000);

  let budgetBand: string | null = null;
  if (/저렴|싼|가성비|budget|low/iu.test(text)) budgetBand = "low";
  else if (/고급|비싸|luxury|high/iu.test(text)) budgetBand = "high";
  else if (/적당|중간|mid/iu.test(text)) budgetBand = "mid";

  let scheduleWindow: string | null = null;
  if (/점심|lunch/iu.test(text)) scheduleWindow = "lunch";
  else if (/저녁|dinner/iu.test(text)) scheduleWindow = "dinner";

  return emptyConstraints({
    walkingTime: walk ? Number(walk[1]) : null,
    distance,
    category: /라멘|스시|야키토리/iu.test(text)
      ? (text.match(/(라멘|스시|야키토리)/iu)?.[1] ?? null)
      : null,
    budgetBand,
    scheduleWindow,
  });
}

/**
 * Parse NL into SPATIAL_DISCOVERY Intent (or null).
 *
 * Examples:
 * - "호텔 근처 맛집 찾아줘"
 * - "난바 호텔 기준 맛집 찾아줘"
 * - "내 위치 주변 카페 보여줘"
 * - "USJ 근처 숙소 찾아줘"
 */
export function parseSpatialDiscoveryIntent(
  text: string,
): SpatialDiscoveryIntent | null {
  const raw = text.trim();
  if (!raw) return null;
  if (!looksLikeSpatialDiscovery(raw)) return null;

  return {
    type: SPATIAL_DISCOVERY_TYPE,
    targetEntity: resolveTarget(raw),
    anchorEntity: resolveAnchorType(raw),
    relation: resolveRelation(raw),
    constraints: resolveConstraints(raw),
    rawText: raw,
  };
}

export function isSpatialDiscoveryIntent(
  value: unknown,
): value is SpatialDiscoveryIntent {
  return (
    typeof value === "object" &&
    value != null &&
    (value as SpatialDiscoveryIntent).type === SPATIAL_DISCOVERY_TYPE
  );
}

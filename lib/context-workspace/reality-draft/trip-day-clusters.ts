/**
 * Day → spatial cluster plan for trip Reality Draft (deterministic).
 * Clusters drive parallel inventory anchors — not a chat itinerary essay.
 */

export type TripDayCluster = {
  readonly id: string;
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly lodgingQuery: string;
  readonly eateryQuery: string;
  readonly poiQuery: string;
};

const OSAKA_CLUSTERS: readonly TripDayCluster[] = [
  {
    id: "namba",
    labelKo: "난바",
    lat: 34.6654,
    lng: 135.5019,
    lodgingQuery: "오사카 난바 숙소",
    eateryQuery: "오사카 난바 맛집",
    poiQuery: "오사카 난바 관광 명소",
  },
  {
    id: "usj",
    labelKo: "유니버설",
    lat: 34.6654,
    lng: 135.4323,
    lodgingQuery: "오사카 유니버설 숙소",
    eateryQuery: "오사카 유니버설 맛집",
    poiQuery: "오사카 유니버설 스튜디오 관광",
  },
  {
    id: "dotonbori",
    labelKo: "도톤보리",
    lat: 34.6687,
    lng: 135.5013,
    lodgingQuery: "오사카 난바 숙소",
    eateryQuery: "오사카 도톤보리 맛집",
    poiQuery: "오사카 도톤보리 관광",
  },
  {
    id: "umeda",
    labelKo: "우메다",
    lat: 34.7055,
    lng: 135.4983,
    lodgingQuery: "오사카 우메다 숙소",
    eateryQuery: "오사카 우메다 맛집",
    poiQuery: "오사카 우메다 관광",
  },
  {
    id: "osaka_castle",
    labelKo: "오사카성",
    lat: 34.6873,
    lng: 135.5262,
    lodgingQuery: "오사카 중심 숙소",
    eateryQuery: "오사카성 맛집",
    poiQuery: "오사카성 관광",
  },
];

const DEST_HUB: Readonly<
  Record<string, { readonly lat: number; readonly lng: number }>
> = {
  오사카: { lat: 34.6937, lng: 135.5023 },
  大阪: { lat: 34.6937, lng: 135.5023 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  제주: { lat: 33.4996, lng: 126.5312 },
  도쿄: { lat: 35.6812, lng: 139.7671 },
  東京: { lat: 35.6812, lng: 139.7671 },
  후쿠오카: { lat: 33.5902, lng: 130.4017 },
  부산: { lat: 35.1796, lng: 129.0756 },
  서울: { lat: 37.5665, lng: 126.978 },
  교토: { lat: 35.0116, lng: 135.7681 },
};

function looksOsaka(dest: string): boolean {
  return /오사카|大阪|osaka/iu.test(dest);
}

function hubForDestination(destinationKo: string): {
  readonly lat: number;
  readonly lng: number;
} {
  const key = destinationKo.trim().toLowerCase();
  for (const [name, hub] of Object.entries(DEST_HUB)) {
    if (key.includes(name.toLowerCase()) || destinationKo.includes(name)) {
      return hub;
    }
  }
  return DEST_HUB.오사카!;
}

function genericClusters(
  dest: string,
  dayCount: number,
): TripDayCluster[] {
  const hub = hubForDestination(dest);
  const out: TripDayCluster[] = [];
  for (let d = 1; d <= dayCount; d += 1) {
    const jitter = (d - 1) * 0.012;
    out.push({
      id: `day_${d}`,
      labelKo: `${dest} ${d}일차`,
      lat: hub.lat + (d % 2 === 0 ? jitter : -jitter * 0.5),
      lng: hub.lng + (d % 3 === 0 ? jitter * 0.7 : -jitter * 0.4),
      lodgingQuery: `${dest} 숙소`,
      eateryQuery: `${dest} 맛집`,
      poiQuery: `${dest} 관광 명소`,
    });
  }
  return out;
}

/**
 * One cluster per trip day. Day1 lodging base = first cluster (Osaka → 난바).
 */
export function planTripDayClusters(
  destinationKo: string,
  dayCount: number,
): readonly TripDayCluster[] {
  const dest = destinationKo.trim() || "여행지";
  const n = Math.min(14, Math.max(1, Math.floor(dayCount)));
  if (looksOsaka(dest)) {
    const out: TripDayCluster[] = [];
    for (let d = 0; d < n; d += 1) {
      out.push(OSAKA_CLUSTERS[d % OSAKA_CLUSTERS.length]!);
    }
    return out;
  }
  return genericClusters(dest, n);
}

export function clusterForDay(
  clusters: readonly TripDayCluster[],
  day: number,
): TripDayCluster {
  const idx = Math.max(0, Math.min(clusters.length - 1, day - 1));
  return clusters[idx] ?? clusters[0]!;
}

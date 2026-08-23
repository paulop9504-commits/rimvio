/**
 * Curated GTFS feed slices — stop_times-derived routes + last trains.
 * Tier B ingest layer (no external zip yet; deterministic SSOT feed).
 */

export type GtfsFeedRouteRecord = {
  readonly cityId: string;
  readonly fromStationId: string;
  readonly toStationId: string;
  readonly lineId: string;
  readonly travelMinutes: number;
  readonly sourceKo: string;
};

export type GtfsFeedLastTrainRecord = {
  readonly cityId: string;
  readonly lineId: string;
  readonly lastDepartureMinutes: number;
  readonly directionKo: string;
  readonly sourceKo: string;
};

/** GTFS stop_times slice — weekday representative. */
export const GTFS_FEED_ROUTES: readonly GtfsFeedRouteRecord[] = [
  {
    cityId: "seoul",
    fromStationId: "gangnam",
    toStationId: "hongdae",
    lineId: "line-2",
    travelMinutes: 18,
    sourceKo: "Seoul Metro GTFS feed slice",
  },
  {
    cityId: "seoul",
    fromStationId: "hongdae",
    toStationId: "gangnam",
    lineId: "line-2",
    travelMinutes: 18,
    sourceKo: "Seoul Metro GTFS feed slice",
  },
  {
    cityId: "seoul",
    fromStationId: "gangnam",
    toStationId: "myeongdong",
    lineId: "line-2",
    travelMinutes: 12,
    sourceKo: "Seoul Metro GTFS feed slice",
  },
  {
    cityId: "tokyo",
    fromStationId: "shibuya",
    toStationId: "shinjuku",
    lineId: "metro-fukutoshin",
    travelMinutes: 7,
    sourceKo: "Tokyo Metro GTFS feed slice",
  },
  {
    cityId: "tokyo",
    fromStationId: "shinjuku",
    toStationId: "shibuya",
    lineId: "metro-fukutoshin",
    travelMinutes: 7,
    sourceKo: "Tokyo Metro GTFS feed slice",
  },
  {
    cityId: "osaka",
    fromStationId: "namba",
    toStationId: "umeda",
    lineId: "midosuji",
    travelMinutes: 12,
    sourceKo: "Osaka Metro GTFS feed slice",
  },
  {
    cityId: "osaka",
    fromStationId: "umeda",
    toStationId: "namba",
    lineId: "midosuji",
    travelMinutes: 12,
    sourceKo: "Osaka Metro GTFS feed slice",
  },
];

export const GTFS_FEED_LAST_TRAINS: readonly GtfsFeedLastTrainRecord[] = [
  {
    cityId: "seoul",
    lineId: "line-2",
    lastDepartureMinutes: 24 * 60 + 32,
    directionKo: "외선 순환",
    sourceKo: "Seoul Metro GTFS feed slice",
  },
  {
    cityId: "seoul",
    lineId: "line-3",
    lastDepartureMinutes: 24 * 60 + 22,
    directionKo: "대화 방면",
    sourceKo: "Seoul Metro GTFS feed slice",
  },
  {
    cityId: "tokyo",
    lineId: "metro-ginza",
    lastDepartureMinutes: 24 * 60 + 28,
    directionKo: "시부야 방면",
    sourceKo: "Tokyo Metro GTFS feed slice",
  },
  {
    cityId: "osaka",
    lineId: "midosuji",
    lastDepartureMinutes: 24 * 60 + 18,
    directionKo: "난바 방면",
    sourceKo: "Osaka Metro GTFS feed slice",
  },
];

export function lookupGtfsFeedRoute(input: {
  readonly cityId: string;
  readonly fromStationId: string;
  readonly toStationId: string;
}): GtfsFeedRouteRecord | null {
  return (
    GTFS_FEED_ROUTES.find(
      (row) =>
        row.cityId === input.cityId &&
        row.fromStationId === input.fromStationId &&
        row.toStationId === input.toStationId,
    ) ?? null
  );
}

export function lookupGtfsFeedLastTrains(input: {
  readonly cityId: string;
  readonly lineId?: string | null;
}): readonly GtfsFeedLastTrainRecord[] {
  const rows = GTFS_FEED_LAST_TRAINS.filter((r) => r.cityId === input.cityId);
  if (!input.lineId?.trim()) return rows;
  return rows.filter((r) => r.lineId === input.lineId);
}

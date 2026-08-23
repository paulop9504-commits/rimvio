/**
 * GTFS-RT feed slice — deterministic trip updates (Tier C).
 * External protobuf ingest plugs in here; Fact Query uses curated RT slice.
 */

export type GtfsRtTripUpdate = {
  readonly cityId: string;
  readonly stationId: string;
  readonly lineId: string;
  readonly directionKo: string;
  readonly headsignKo: string;
  /** Minutes until arrival at platform. */
  readonly arrivalMinutes: number;
  /** Service delay vs schedule (0 = on time). */
  readonly delayMinutes: number;
  readonly sourceKo: string;
};

/** Weekday peak representative — GTFS-RT TripUpdate slice. */
export const GTFS_RT_TRIP_UPDATES: readonly GtfsRtTripUpdate[] = [
  {
    cityId: "seoul",
    stationId: "gangnam",
    lineId: "line-2",
    directionKo: "외선(시청)",
    headsignKo: "시청 · 외선",
    arrivalMinutes: 3,
    delayMinutes: 1,
    sourceKo: "Seoul Metro GTFS-RT slice",
  },
  {
    cityId: "seoul",
    stationId: "gangnam",
    lineId: "line-2",
    directionKo: "내선(신도림)",
    headsignKo: "신도림 · 내선",
    arrivalMinutes: 6,
    delayMinutes: 0,
    sourceKo: "Seoul Metro GTFS-RT slice",
  },
  {
    cityId: "seoul",
    stationId: "hongdae",
    lineId: "line-2",
    directionKo: "외선(강남)",
    headsignKo: "강남 · 외선",
    arrivalMinutes: 4,
    delayMinutes: 2,
    sourceKo: "Seoul Metro GTFS-RT slice",
  },
  {
    cityId: "seoul",
    stationId: "sadang",
    lineId: "line-2",
    directionKo: "외선",
    headsignKo: "외선 순환",
    arrivalMinutes: 2,
    delayMinutes: 0,
    sourceKo: "Seoul Metro GTFS-RT slice",
  },
  {
    cityId: "seoul",
    stationId: "sadang",
    lineId: "line-4",
    directionKo: "당고개",
    headsignKo: "당고개",
    arrivalMinutes: 5,
    delayMinutes: 0,
    sourceKo: "Seoul Metro GTFS-RT slice",
  },
  {
    cityId: "tokyo",
    stationId: "shibuya",
    lineId: "metro-fukutoshin",
    directionKo: "和光市",
    headsignKo: "和光市",
    arrivalMinutes: 2,
    delayMinutes: 0,
    sourceKo: "Tokyo Metro GTFS-RT slice",
  },
  {
    cityId: "tokyo",
    stationId: "shibuya",
    lineId: "metro-ginza",
    directionKo: "浅草",
    headsignKo: "浅草",
    arrivalMinutes: 4,
    delayMinutes: 1,
    sourceKo: "Tokyo Metro GTFS-RT slice",
  },
  {
    cityId: "tokyo",
    stationId: "shinjuku",
    lineId: "metro-marunouchi",
    directionKo: "池袋",
    headsignKo: "池袋",
    arrivalMinutes: 3,
    delayMinutes: 0,
    sourceKo: "Tokyo Metro GTFS-RT slice",
  },
  {
    cityId: "osaka",
    stationId: "namba",
    lineId: "midosuji",
    directionKo: "新大阪",
    headsignKo: "新大阪",
    arrivalMinutes: 3,
    delayMinutes: 0,
    sourceKo: "Osaka Metro GTFS-RT slice",
  },
  {
    cityId: "osaka",
    stationId: "umeda",
    lineId: "midosuji",
    directionKo: "なんば",
    headsignKo: "なんば",
    arrivalMinutes: 5,
    delayMinutes: 2,
    sourceKo: "Osaka Metro GTFS-RT slice",
  },
];

export function lookupGtfsRtUpdates(input: {
  readonly cityId: string;
  readonly stationId: string;
  readonly lineId?: string | null;
}): readonly GtfsRtTripUpdate[] {
  const rows = GTFS_RT_TRIP_UPDATES.filter(
    (row) =>
      row.cityId === input.cityId && row.stationId === input.stationId,
  );
  if (!input.lineId?.trim()) {
    return rows.sort((a, b) => a.arrivalMinutes - b.arrivalMinutes);
  }
  return rows
    .filter((row) => row.lineId === input.lineId)
    .sort((a, b) => a.arrivalMinutes - b.arrivalMinutes);
}

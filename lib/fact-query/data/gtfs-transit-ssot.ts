/**
 * GTFS stub SSOT — curated last-train + route graph over transit SSOT packs.
 * Full GTFS feed ingest is Tier B; Fact Query uses deterministic stub.
 */

import {
  getTransitCityPack,
  type TransitCityPack,
  type TransitStationRecord,
} from "@/lib/fact-query/data/city-fact-registry";
import {
  lookupGtfsFeedLastTrains,
  lookupGtfsFeedRoute,
} from "@/lib/fact-query/gtfs/gtfs-feed-registry";

export type GtfsLastTrainRecord = {
  readonly cityId: string;
  readonly lineId: string;
  readonly lineLabelKo: string;
  /** Minutes from midnight (e.g. 00:30 → 1470). */
  readonly lastDepartureMinutes: number;
  readonly directionKo: string;
  readonly sourceKo: string;
};

export type GtfsRouteLeg = {
  readonly from: TransitStationRecord;
  readonly to: TransitStationRecord;
  readonly lineId: string;
  readonly lineLabelKo: string;
  readonly travelMinutes: number;
  readonly transfer: boolean;
};

export type GtfsRoutePlan = {
  readonly cityId: string;
  readonly cityLabelKo: string;
  readonly from: TransitStationRecord;
  readonly to: TransitStationRecord;
  readonly legs: readonly GtfsRouteLeg[];
  readonly totalMinutes: number;
  readonly transferCount: number;
  readonly sourceNote?: string;
};

/** Representative weekday last trains (stub — not live GTFS-RT). */
export const GTFS_LAST_TRAIN_SSOT: readonly GtfsLastTrainRecord[] = [
  {
    cityId: "tokyo",
    lineId: "metro-ginza",
    lineLabelKo: "도쿄 메트로 긴자선",
    lastDepartureMinutes: 24 * 60 + 30,
    directionKo: "시부야 방면",
    sourceKo: "Tokyo Metro SSOT stub",
  },
  {
    cityId: "tokyo",
    lineId: "metro-marunouchi",
    lineLabelKo: "도쿄 메트로 마루노우치선",
    lastDepartureMinutes: 24 * 60 + 20,
    directionKo: "신주쿠 방면",
    sourceKo: "Tokyo Metro SSOT stub",
  },
  {
    cityId: "osaka",
    lineId: "midosuji",
    lineLabelKo: "오사카 메트로 미도스지선",
    lastDepartureMinutes: 24 * 60 + 15,
    directionKo: "난바 방면",
    sourceKo: "Osaka Metro SSOT stub",
  },
  {
    cityId: "osaka",
    lineId: "chuo",
    lineLabelKo: "오사카 메트로 츄오선",
    lastDepartureMinutes: 24 * 60 + 10,
    directionKo: "본町 방면",
    sourceKo: "Osaka Metro SSOT stub",
  },
  {
    cityId: "seoul",
    lineId: "line-2",
    lineLabelKo: "서울 지하철 2호선",
    lastDepartureMinutes: 24 * 60 + 30,
    directionKo: "외선 순환",
    sourceKo: "Seoul Metro SSOT stub",
  },
  {
    cityId: "seoul",
    lineId: "line-3",
    lineLabelKo: "서울 지하철 3호선",
    lastDepartureMinutes: 24 * 60 + 20,
    directionKo: "대화 방면",
    sourceKo: "Seoul Metro SSOT stub",
  },
  {
    cityId: "seoul",
    lineId: "line-9",
    lineLabelKo: "서울 지하철 9호선",
    lastDepartureMinutes: 24 * 60 + 25,
    directionKo: "개화 방면",
    sourceKo: "Seoul Metro SSOT stub",
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "");
}

export function resolveTransitStationInPack(
  pack: TransitCityPack,
  query: string,
): TransitStationRecord | null {
  const q = normalize(query);
  if (!q) return null;
  for (const row of pack.stations) {
    const ko = normalize(row.nameKo);
    const ja = row.nameJa ? normalize(row.nameJa) : "";
    if (q === ko || q.includes(ko) || ko.includes(q)) return row;
    if (ja && (q === ja || q.includes(ja) || ja.includes(q))) return row;
    if (q === normalize(row.id)) return row;
  }
  return null;
}

function sharedLines(
  a: TransitStationRecord,
  b: TransitStationRecord,
): readonly string[] {
  const setB = new Set(b.lines);
  return a.lines.filter((id) => setB.has(id));
}

function estimateDirectMinutes(
  a: TransitStationRecord,
  b: TransitStationRecord,
): number {
  const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
  return Math.max(3, Math.round(km * 4 + 2));
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function findTransferHub(
  pack: TransitCityPack,
  from: TransitStationRecord,
  to: TransitStationRecord,
): TransitStationRecord | null {
  let best: TransitStationRecord | null = null;
  let bestScore = -1;
  for (const hub of pack.stations) {
    if (hub.id === from.id || hub.id === to.id) continue;
    const fromLines = new Set(from.lines);
    const toLines = new Set(to.lines);
    const hubFrom = hub.lines.some((id) => fromLines.has(id));
    const hubTo = hub.lines.some((id) => toLines.has(id));
    if (!hubFrom || !hubTo) continue;
    const score = hub.lines.length;
    if (score > bestScore) {
      bestScore = score;
      best = hub;
    }
  }
  return best;
}

export function planGtfsRoute(input: {
  readonly cityId: string;
  readonly fromQuery: string;
  readonly toQuery: string;
}): GtfsRoutePlan | null {
  const pack = getTransitCityPack(input.cityId);
  if (!pack) return null;

  const from = resolveTransitStationInPack(pack, input.fromQuery);
  const to = resolveTransitStationInPack(pack, input.toQuery);
  if (!from || !to) return null;
  if (from.id === to.id) {
    return {
      cityId: pack.cityId,
      cityLabelKo: pack.cityLabelKo,
      from,
      to,
      legs: [],
      totalMinutes: 0,
      transferCount: 0,
    };
  }

  const directLines = sharedLines(from, to);
  if (directLines.length > 0) {
    const lineId = directLines[0]!;
    const feed = lookupGtfsFeedRoute({
      cityId: pack.cityId,
      fromStationId: from.id,
      toStationId: to.id,
    });
    const travelMinutes =
      feed?.travelMinutes ?? estimateDirectMinutes(from, to);
    const sourceNote = feed ? "GTFS feed slice" : "Transit SSOT estimate";
    return {
      cityId: pack.cityId,
      cityLabelKo: pack.cityLabelKo,
      from,
      to,
      legs: [
        {
          from,
          to,
          lineId: feed?.lineId ?? lineId,
          lineLabelKo: pack.lineLabelKo(feed?.lineId ?? lineId),
          travelMinutes,
          transfer: false,
        },
      ],
      totalMinutes: travelMinutes,
      transferCount: 0,
      sourceNote,
    };
  }

  const hub = findTransferHub(pack, from, to);
  if (!hub) return null;

  const line1 = sharedLines(from, hub)[0];
  const line2 = sharedLines(hub, to)[0];
  if (!line1 || !line2) return null;

  const leg1Min = estimateDirectMinutes(from, hub);
  const leg2Min = estimateDirectMinutes(hub, to);
  const transferPenalty = 5;

  return {
    cityId: pack.cityId,
    cityLabelKo: pack.cityLabelKo,
    from,
    to,
    legs: [
      {
        from,
        to: hub,
        lineId: line1,
        lineLabelKo: pack.lineLabelKo(line1),
        travelMinutes: leg1Min,
        transfer: false,
      },
      {
        from: hub,
        to,
        lineId: line2,
        lineLabelKo: pack.lineLabelKo(line2),
        travelMinutes: leg2Min,
        transfer: true,
      },
    ],
    totalMinutes: leg1Min + leg2Min + transferPenalty,
    transferCount: 1,
  };
}

export function lookupGtfsLastTrain(input: {
  readonly cityId: string;
  readonly lineQuery?: string | null;
}): readonly GtfsLastTrainRecord[] {
  const feedRows = lookupGtfsFeedLastTrains({
    cityId: input.cityId,
    lineId: input.lineQuery ?? null,
  });
  if (feedRows.length > 0) {
    const pack = getTransitCityPack(input.cityId);
    return feedRows.map((row) => ({
      cityId: row.cityId,
      lineId: row.lineId,
      lineLabelKo: pack?.lineLabelKo(row.lineId) ?? row.lineId,
      lastDepartureMinutes: row.lastDepartureMinutes,
      directionKo: row.directionKo,
      sourceKo: row.sourceKo,
    }));
  }

  const rows = GTFS_LAST_TRAIN_SSOT.filter((r) => r.cityId === input.cityId);
  const q = input.lineQuery?.trim();
  if (!q) return rows;

  const n = normalize(q);
  return rows.filter(
    (r) =>
      normalize(r.lineLabelKo).includes(n) ||
      n.includes(normalize(r.lineLabelKo)) ||
      r.lineId.includes(n) ||
      n.includes(r.lineId),
  );
}

export function minutesToClockLabel(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  if (total >= 24 * 60) {
    return `다음날 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTransitLineQuery(text: string): string | null {
  const m = text.match(
    /(\d)\s*호선|([가-힣a-z-]+)\s*(?:선|line|metro)/iu,
  );
  if (!m) return null;
  if (m[1]) return `line-${m[1]}`;
  return m[2]?.trim() ?? null;
}

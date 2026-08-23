import { resolveFactPlace } from "@/lib/fact-query/data/resolve-fact-place";
import {
  getHotspotCityPack,
  getTransitCityPack,
} from "@/lib/fact-query/data/city-fact-registry";
import type { FactAnswerWire, FactEvidenceItem } from "@/lib/fact-query/types";

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function looksLikeMidpointMeetingAsk(utterance: string): boolean {
  const t = utterance.trim();
  return (
    /(?:중간|가운데|midpoint).*(?:만남|만나|meet|어디)/iu.test(t) ||
    /(?:와|과|랑|&)\s*.+(?:중간|가운데)/iu.test(t)
  );
}

export function parseMidpointMeetingQuery(utterance: string): {
  placeAQuery: string;
  placeBQuery: string;
} | null {
  const text = utterance.trim();
  const paired = text.match(
    /(.+?)(?:와|과|랑|&)\s*(.+?)(?:\s*(?:중간|가운데|midpoint)|$)/iu,
  );
  if (!paired?.[1] || !paired[2]) {
    return null;
  }
  return {
    placeAQuery: paired[1].trim(),
    placeBQuery: paired[2]
      .replace(/(?:중간|가운데|midpoint|만남|만나|meet|어디).*$/iu, "")
      .trim(),
  };
}

function inferCityId(
  placeA: { labelKo: string },
  placeB: { labelKo: string },
  utterance: string,
): string {
  const blob = `${placeA.labelKo} ${placeB.labelKo} ${utterance}`;
  if (/서울|강남|홍대|명동|seoul/u.test(blob)) return "seoul";
  if (/오사카|난바|osaka/u.test(blob)) return "osaka";
  if (/도쿄|시부야|신주쿠|tokyo/u.test(blob)) return "tokyo";
  return "seoul";
}

function pickMeetingSpot(input: {
  readonly midLat: number;
  readonly midLng: number;
  readonly cityId: string;
}): {
  labelKo: string;
  lat: number;
  lng: number;
  detailKo: string;
  source: string;
  id: string;
} {
  const hotspotPack = getHotspotCityPack(input.cityId);
  const transitPack = getTransitCityPack(input.cityId);

  let best:
    | {
        labelKo: string;
        lat: number;
        lng: number;
        detailKo: string;
        source: string;
        id: string;
        km: number;
      }
    | null = null;

  if (hotspotPack) {
    for (const row of hotspotPack.hotspots) {
      const km = haversineKm(input.midLat, input.midLng, row.lat, row.lng);
      if (!best || km < best.km) {
        best = {
          id: `hotspot:${row.id}`,
          labelKo: row.nameKo,
          lat: row.lat,
          lng: row.lng,
          detailKo: `중간점 근처 · ${row.reasonKo}`,
          source: `${input.cityId}_hotspot_ssot`,
          km,
        };
      }
    }
  }

  if (transitPack) {
    for (const row of transitPack.stations) {
      if (row.lines.length < 2) continue;
      const km = haversineKm(input.midLat, input.midLng, row.lat, row.lng);
      if (!best || km < best.km) {
        best = {
          id: `hub:${row.id}`,
          labelKo: row.nameKo,
          lat: row.lat,
          lng: row.lng,
          detailKo: `환승 허브 · ${row.lines.length}개 노선`,
          source: `${input.cityId}_transit_ssot`,
          km,
        };
      }
    }
  }

  if (best) {
    return best;
  }

  return {
    id: "midpoint:geo",
    labelKo: "지리 중간점",
    lat: input.midLat,
    lng: input.midLng,
    detailKo: "핫플·역 SSOT 근처 후보 없음 — 좌표 중간",
    source: "haversine_midpoint",
  };
}

export function runMidpointMeetingTool(utterance: string): FactAnswerWire | null {
  const parsed = parseMidpointMeetingQuery(utterance);
  if (!parsed) return null;

  const placeA = resolveFactPlace(parsed.placeAQuery);
  const placeB = resolveFactPlace(parsed.placeBQuery);
  if (!placeA || !placeB) return null;

  const midLat = (placeA.lat + placeB.lat) / 2;
  const midLng = (placeA.lng + placeB.lng) / 2;
  const cityId = inferCityId(placeA, placeB, utterance);
  const meeting = pickMeetingSpot({ midLat, midLng, cityId });
  const spanKm = haversineKm(placeA.lat, placeA.lng, placeB.lat, placeB.lng);
  const spanLabel = spanKm < 10 ? spanKm.toFixed(1) : String(Math.round(spanKm));

  const evidence: FactEvidenceItem[] = [
    {
      id: `from:${placeA.id}`,
      labelKo: placeA.labelKo,
      detailKo: "출발측",
      lat: placeA.lat,
      lng: placeA.lng,
      kind: "poi",
      score: null,
      source: placeA.source,
    },
    {
      id: meeting.id,
      labelKo: meeting.labelKo,
      detailKo: meeting.detailKo,
      lat: meeting.lat,
      lng: meeting.lng,
      kind: "highlight",
      score: null,
      source: meeting.source,
    },
    {
      id: `to:${placeB.id}`,
      labelKo: placeB.labelKo,
      detailKo: "도착측",
      lat: placeB.lat,
      lng: placeB.lng,
      kind: "poi",
      score: null,
      source: placeB.source,
    },
  ];

  const pack = getHotspotCityPack(cityId);

  return {
    queryId: `midpoint:${placeA.id}:${placeB.id}`,
    kind: "midpoint_meeting",
    headlineKo: `중간 만남 추천: ${meeting.labelKo}`,
    summaryKo: `${placeA.labelKo} ↔ ${placeB.labelKo} (직선 ${spanLabel}km) · ${pack?.cityLabelKo ?? cityId} 기준 중간점 근처 ${meeting.labelKo}에서 만나기 좋아요.`,
    evidence,
    highlightId: meeting.id,
    cityLabelKo: pack?.cityLabelKo ?? null,
    ranTool: true,
    sourceKo: "Rimvio Midpoint · Hotspot/Transit SSOT",
  };
}

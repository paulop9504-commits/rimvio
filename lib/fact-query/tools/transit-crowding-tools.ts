import {
  buildTransitEvidence,
  getTransitCityPack,
} from "@/lib/fact-query/data/city-fact-registry";
import { resolveTransitStationInPack } from "@/lib/fact-query/data/gtfs-transit-ssot";
import { lookupTransitCrowding } from "@/lib/fact-query/data/transit-crowding-ssot";
import type { FactAnswerWire } from "@/lib/fact-query/types";

function parseCrowdingStationQuery(utterance: string): string | null {
  const text = utterance.trim();
  const match = text.match(
    /(.+?)(?:역)?\s*(?:혼잡|crowd|congestion|만원|붐빌|사람\s*많)/iu,
  );
  if (match?.[1]?.trim()) {
    return match[1].trim();
  }
  const leading = text.match(
    /(?:혼잡|crowd|congestion).*(?:역\s*)?(.+?)(?:역)?$/iu,
  );
  if (leading?.[1]?.trim()) {
    return leading[1].trim();
  }
  const bare = text.match(/(.+?)역/u);
  if (bare?.[1]?.trim() && /혼잡|crowd|만원|붐빌/iu.test(text)) {
    return bare[1].trim();
  }
  return null;
}

export function looksLikeTransitCrowdingAsk(utterance: string): boolean {
  const t = utterance.trim();
  if (!t || t.startsWith("@")) {
    return false;
  }
  return (
    /(?:혼잡|crowd|congestion|만원|붐빌|사람\s*많)/iu.test(t) &&
    (/(?:역|지하철|메트로|subway|metro)/iu.test(t) ||
      /강남|홍대|시부야|신주쿠|난바|우메다|사당|명동/u.test(t))
  );
}

export function resolveCityForTransitCrowding(
  utterance: string,
  cityId: string | null,
): string {
  if (cityId) return cityId;
  if (/서울|seoul|강남|홍대|명동|사당/u.test(utterance)) return "seoul";
  if (/오사카|osaka|난바|우메다/u.test(utterance)) return "osaka";
  return "tokyo";
}

export function runTransitCrowdingTool(input: {
  readonly utterance: string;
  readonly cityId: string;
}): FactAnswerWire | null {
  const pack = getTransitCityPack(input.cityId);
  if (!pack) return null;

  const stationQuery = parseCrowdingStationQuery(input.utterance);
  if (!stationQuery) return null;

  const station = resolveTransitStationInPack(pack, stationQuery);
  if (!station) return null;

  const crowding = lookupTransitCrowding({
    cityId: input.cityId,
    stationId: station.id,
  });
  if (!crowding) return null;

  const lineLabels = station.lines.map((id) => pack.lineLabelKo(id)).join(" · ");

  return {
    queryId: `crowding:${input.cityId}:${station.id}`,
    kind: "transit_crowding_lookup",
    headlineKo: `${station.nameKo}: ${crowding.labelKo} (Lv.${crowding.level}/5)`,
    summaryKo: `${pack.cityLabelKo} · ${crowding.detailKo} · ${lineLabels}`,
    evidence: [
      {
        ...buildTransitEvidence(pack, station),
        detailKo: `${crowding.labelKo} · ${crowding.detailKo}`,
        score: crowding.level,
        source: "transit_crowding_ssot",
      },
    ],
    highlightId: station.id,
    cityLabelKo: pack.cityLabelKo,
    ranTool: true,
    sourceKo: crowding.sourceKo,
  };
}

import {
  buildTransitEvidence,
  getTransitCityPack,
} from "@/lib/fact-query/data/city-fact-registry";
import { resolveTransitStationInPack } from "@/lib/fact-query/data/gtfs-transit-ssot";
import { lookupGtfsRtUpdates } from "@/lib/fact-query/gtfs/gtfs-rt-registry";
import type { FactAnswerWire, FactEvidenceItem } from "@/lib/fact-query/types";

function parseLineIdFromUtterance(
  utterance: string,
  pack: NonNullable<ReturnType<typeof getTransitCityPack>>,
): string | null {
  const lineMatch = utterance.match(/(\d)\s*호선/u);
  if (lineMatch?.[1]) {
    return `line-${lineMatch[1]}`;
  }
  for (const station of pack.stations) {
    for (const lineId of station.lines) {
      const label = pack.lineLabelKo(lineId);
      if (label && utterance.includes(label.replace(/\s+/gu, ""))) {
        return lineId;
      }
    }
  }
  return null;
}

function parseStationQuery(utterance: string): string | null {
  const text = utterance.trim();
  const stationMatch = text.match(
    /(.+?)(?:역)?\s*(?:\d\s*호선|실시간|도착|몇\s*분|지연|rt|RT|subway|지하철|메트로)/iu,
  );
  if (stationMatch?.[1]?.trim()) {
    return stationMatch[1].trim();
  }
  const trailingMatch = text.match(
    /(?:역\s*)?(.+?)(?:역)?\s*(?:실시간|도착|몇\s*분\s*후|지연)/iu,
  );
  if (trailingMatch?.[1]?.trim()) {
    return trailingMatch[1].trim();
  }
  const bareStation = text.match(/(.+?)역/u);
  if (bareStation?.[1]?.trim()) {
    return bareStation[1].trim();
  }
  return null;
}

export function looksLikeTransitRealtimeAsk(utterance: string): boolean {
  const t = utterance.trim();
  if (!t || t.startsWith("@")) {
    return false;
  }
  if (/(?:막차|last\s*train|운행\s*종료)/iu.test(t)) {
    return false;
  }
  if (/(?:혼잡|crowd|congestion|만원|붐빌)/iu.test(t)) {
    return false;
  }
  return (
    /(?:실시간|gtfs[\s-]?rt|도착|몇\s*분\s*후|지연|delay|arrival|live\s*transit)/iu.test(
      t,
    ) &&
    (/(?:역|지하철|메트로|subway|metro|호선)/iu.test(t) ||
      /강남|홍대|시부야|신주쿠|난바|우메다|사당|명동/u.test(t))
  );
}

export function resolveCityForTransitRealtime(
  utterance: string,
  cityId: string | null,
): string {
  if (cityId) return cityId;
  if (/서울|seoul|강남|홍대|명동|사당/u.test(utterance)) return "seoul";
  if (/오사카|osaka|난바|우메다/u.test(utterance)) return "osaka";
  return "tokyo";
}

export function runTransitRealtimeTool(input: {
  readonly utterance: string;
  readonly cityId: string;
}): FactAnswerWire | null {
  const pack = getTransitCityPack(input.cityId);
  if (!pack) return null;

  const stationQuery = parseStationQuery(input.utterance);
  if (!stationQuery) return null;

  const station = resolveTransitStationInPack(pack, stationQuery);
  if (!station) return null;

  const lineId = parseLineIdFromUtterance(input.utterance, pack);
  const updates = lookupGtfsRtUpdates({
    cityId: input.cityId,
    stationId: station.id,
    lineId,
  });
  if (updates.length === 0) return null;

  const lead = updates[0]!;
  const lineLabel = pack.lineLabelKo(lead.lineId);
  const delayLabel =
    lead.delayMinutes > 0 ? ` · ${lead.delayMinutes}분 지연` : " · 정시";

  const evidence: FactEvidenceItem[] = updates.slice(0, 4).map((row) => ({
    ...buildTransitEvidence(pack, station),
    id: `rt:${station.id}:${row.lineId}:${row.directionKo}`,
    labelKo: `${lineLabel} ${row.directionKo}`,
    detailKo: `${row.arrivalMinutes}분 후 · ${row.headsignKo}${row.delayMinutes > 0 ? ` · ${row.delayMinutes}분 지연` : ""}`,
    score: row.arrivalMinutes,
    source: "gtfs_rt_slice",
  }));

  const moreLines =
    updates.length > 1
      ? ` · ${updates
          .slice(1, 3)
          .map(
            (row) =>
              `${pack.lineLabelKo(row.lineId)} ${row.arrivalMinutes}분${row.delayMinutes > 0 ? `(+${row.delayMinutes})` : ""}`,
          )
          .join(" · ")}`
      : "";

  return {
    queryId: `gtfs-rt:${input.cityId}:${station.id}:${lead.lineId}`,
    kind: "transit_realtime_lookup",
    headlineKo: `${station.nameKo} ${lineLabel}: ${lead.arrivalMinutes}분 후${delayLabel}`,
    summaryKo: `${pack.cityLabelKo} GTFS-RT · ${lead.directionKo} ${lead.headsignKo}${moreLines} · 실시간 변동 가능`,
    evidence,
    highlightId: station.id,
    cityLabelKo: pack.cityLabelKo,
    ranTool: true,
    sourceKo: lead.sourceKo,
  };
}

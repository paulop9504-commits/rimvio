import {
  lookupGtfsLastTrain,
  minutesToClockLabel,
  planGtfsRoute,
} from "@/lib/fact-query/data/gtfs-transit-ssot";
import {
  buildTransitEvidence,
  getTransitCityPack,
} from "@/lib/fact-query/data/city-fact-registry";
import type { FactAnswerWire, FactEvidenceItem } from "@/lib/fact-query/types";

export function parseTransitRouteQuery(utterance: string): {
  fromQuery: string;
  toQuery: string;
} | null {
  const text = utterance.trim();
  const m = text.match(
    /(.+?)(?:에서|부터)\s+(.+?)(?:까지|으로|가는\s*(?:길|법|경로)|(?:지하철|메트로|subway)\s*(?:로|으로|가|타고)|$)/iu,
  );
  if (!m?.[1] || !m[2]) return null;
  return {
    fromQuery: m[1].trim(),
    toQuery: m[2]
      .replace(/(?:지하철|메트로|subway|경로|가는\s*길).*$/iu, "")
      .trim(),
  };
}

export function looksLikeTransitRouteAsk(utterance: string): boolean {
  const t = utterance.trim();
  if (/(?:까지|→)\s*(?:거리|km|킬로)/iu.test(t)) return false;
  if (/(?:막차|last\s*train|운행\s*종료)/iu.test(t)) return false;
  return (
    parseTransitRouteQuery(t) !== null &&
    /(?:지하철|메트로|subway|경로|가는\s*(?:길|법)|타고\s*가)/iu.test(t)
  );
}

export function looksLikeTransitLastTrainAsk(utterance: string): boolean {
  const t = utterance.trim();
  return (
    /(?:막차|last\s*train|몇\s*시\s*까지\s*운행|운행\s*종료|마지막\s*열차)/iu.test(
      t,
    ) && /(?:지하철|메트로|subway|호선|metro)/iu.test(t)
  );
}

export function runTransitRouteLookupTool(input: {
  readonly utterance: string;
  readonly cityId: string;
}): FactAnswerWire | null {
  const parsed = parseTransitRouteQuery(input.utterance);
  if (!parsed) return null;

  const plan = planGtfsRoute({
    cityId: input.cityId,
    fromQuery: parsed.fromQuery,
    toQuery: parsed.toQuery,
  });
  if (!plan) return null;

  const pack = getTransitCityPack(input.cityId);
  if (!pack) return null;

  const pinIds = new Set<string>();
  const evidence: FactEvidenceItem[] = [];
  const addPin = (station: typeof plan.from, detailKo: string) => {
    if (pinIds.has(station.id)) return;
    pinIds.add(station.id);
    evidence.push({
      ...buildTransitEvidence(pack, station),
      detailKo,
    });
  };

  addPin(plan.from, "출발");
  for (const leg of plan.legs) {
    if (leg.transfer) {
      addPin(leg.from, `환승 · ${leg.lineLabelKo}`);
    }
    addPin(leg.to, leg.transfer ? "환승 후" : "도착");
  }
  if (plan.legs.length === 0) {
    addPin(plan.to, "동일 역");
  }

  const legSummary = plan.legs
    .map(
      (leg) =>
        `${leg.from.nameKo}→${leg.to.nameKo} ${leg.lineLabelKo} 약 ${leg.travelMinutes}분`,
    )
    .join(" · ");

  return {
    queryId: `gtfs-route:${plan.cityId}:${plan.from.id}:${plan.to.id}`,
    kind: "transit_route_lookup",
    headlineKo: `${plan.from.nameKo} → ${plan.to.nameKo}: 약 ${plan.totalMinutes}분${plan.transferCount > 0 ? ` · 환승 ${plan.transferCount}회` : " · 직통"}`,
    summaryKo:
      plan.legs.length > 0
        ? `${plan.cityLabelKo} ${plan.sourceNote === "GTFS feed slice" ? "GTFS" : "지하철 SSOT"} 경로 · ${legSummary}${plan.sourceNote === "GTFS feed slice" ? "" : " · GTFS stub (실시간 변동 가능)"}`
        : `${plan.from.nameKo}와 ${plan.to.nameKo}는 같은 역입니다.`,
    evidence,
    highlightId: plan.to.id,
    cityLabelKo: plan.cityLabelKo,
    ranTool: true,
    sourceKo:
      plan.sourceNote === "GTFS feed slice"
        ? "Rimvio GTFS feed slice"
        : "Rimvio GTFS stub · Transit SSOT",
  };
}

export function runTransitLastTrainTool(input: {
  readonly utterance: string;
  readonly cityId: string;
}): FactAnswerWire | null {
  const text = input.utterance.trim();
  const lineMatch = text.match(/(\d)\s*호선/);
  const lineQuery = lineMatch?.[1] ? `line-${lineMatch[1]}` : null;

  const rows = lookupGtfsLastTrain({
    cityId: input.cityId,
    lineQuery,
  });
  if (rows.length === 0) return null;

  const pack = getTransitCityPack(input.cityId);
  const lead = rows[0]!;
  const hub =
    pack?.stations.find((s) => s.lines.includes(lead.lineId)) ?? pack?.stations[0];

  const evidence: FactEvidenceItem[] = rows.slice(0, 4).map((row, index) => {
    const station =
      pack?.stations.find((s) => s.lines.includes(row.lineId)) ?? hub;
    return {
      id: `last-train:${row.lineId}`,
      labelKo: row.lineLabelKo,
      detailKo: `${row.directionKo} · 막차 ${minutesToClockLabel(row.lastDepartureMinutes)}`,
      lat: station?.lat ?? 0,
      lng: station?.lng ?? 0,
      kind: "transit_hub" as const,
      score: row.lastDepartureMinutes,
      source: "gtfs_last_train_stub",
    };
  });

  return {
    queryId: `gtfs-last:${input.cityId}:${lead.lineId}`,
    kind: "transit_last_train",
    headlineKo: `${lead.lineLabelKo} 막차 ${minutesToClockLabel(lead.lastDepartureMinutes)}`,
    summaryKo:
      rows.length > 1
        ? `${pack?.cityLabelKo ?? input.cityId} 지하철 막차(평일 기준 stub) — ${rows
            .map(
              (r) =>
                `${r.lineLabelKo} ${minutesToClockLabel(r.lastDepartureMinutes)}`,
            )
            .join(" · ")}`
        : `${lead.directionKo} · 평일 기준 대표 막차 · GTFS stub (실시간 변동 가능)`,
    evidence,
    highlightId: evidence[0]?.id ?? null,
    cityLabelKo: pack?.cityLabelKo ?? null,
    ranTool: true,
    sourceKo: "Rimvio GTFS stub · Last train SSOT",
  };
}

export function resolveCityForTransitRoute(
  utterance: string,
  cityId: string | null,
): string {
  if (cityId) return cityId;
  if (/서울|seoul|강남|홍대|명동/u.test(utterance)) return "seoul";
  if (/오사카|osaka|난바|우메다/u.test(utterance)) return "osaka";
  return "tokyo";
}

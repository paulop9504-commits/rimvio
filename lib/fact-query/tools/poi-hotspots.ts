import {
  buildHotspotEvidence,
  getHotspotCityPack,
} from "@/lib/fact-query/data/city-fact-registry";
import type { FactAnswerWire } from "@/lib/fact-query/types";

export function runPoiHotspotsTool(input: {
  readonly cityId: string;
  readonly limit?: number;
}): FactAnswerWire | null {
  const pack = getHotspotCityPack(input.cityId);
  if (!pack) {
    return null;
  }

  const limit = input.limit ?? 5;
  const ranked = [...pack.hotspots].sort((a, b) => b.hotScore - a.hotScore);
  const top = ranked.slice(0, limit);
  const lead = top[0];
  if (!lead) {
    return null;
  }

  const evidence = top.map((row) => buildHotspotEvidence(pack, row));

  return {
    queryId: `hotspots:${pack.cityId}:${lead.id}`,
    kind: "poi_hotspots",
    headlineKo: `${pack.cityLabelKo} 핫플 1위: ${lead.nameKo}`,
    summaryKo: `관광·트렌드·체류 기준 상위 ${top.length}곳 — ${top
      .map((r) => r.nameKo)
      .join(", ")}`,
    evidence,
    highlightId: lead.id,
    cityLabelKo: pack.cityLabelKo,
    ranTool: true,
    sourceKo: pack.sourceKo,
  };
}

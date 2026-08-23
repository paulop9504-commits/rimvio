import {
  buildTransitEvidence,
  getTransitCityPack,
} from "@/lib/fact-query/data/city-fact-registry";
import type { FactAnswerWire } from "@/lib/fact-query/types";

export function runTransitMaxInterchangeTool(input: {
  readonly cityId: string;
}): FactAnswerWire | null {
  const pack = getTransitCityPack(input.cityId);
  if (!pack) {
    return null;
  }

  const ranked = [...pack.stations].sort((a, b) => b.lines.length - a.lines.length);
  const top = ranked[0];
  if (!top) {
    return null;
  }

  const maxLines = top.lines.length;
  const ties = ranked.filter((s) => s.lines.length === maxLines);
  const evidence = ranked.slice(0, 5).map((s) => buildTransitEvidence(pack, s));

  return {
    queryId: `transit-max:${pack.cityId}:${top.id}`,
    kind: "transit_max_interchange",
    headlineKo: `환승 최다: ${top.nameKo} (${maxLines}개 노선)`,
    summaryKo:
      ties.length > 1
        ? `${pack.cityLabelKo} 지하철 ${pack.lineCountLabel} 기준 ${top.nameKo}·${ties
            .slice(1)
            .map((s) => s.nameKo)
            .join("·")}가 ${maxLines}개 노선으로 동률 1위입니다.`
        : `${pack.cityLabelKo} 지하철 ${pack.lineCountLabel} 기준 ${top.nameKo}(${top.nameJa})가 ${maxLines}개 노선이 만나는 최대 환승 허브입니다.`,
    evidence,
    highlightId: top.id,
    cityLabelKo: pack.cityLabelKo,
    ranTool: true,
    sourceKo: pack.sourceKo,
  };
}

import type { FactAnswerWire, FactEvidenceItem } from "@/lib/fact-query/types";

export type TransitStationRecord = {
  readonly id: string;
  readonly nameKo: string;
  readonly nameJa: string;
  readonly lat: number;
  readonly lng: number;
  readonly lines: readonly string[];
};

export type TransitCityPack = {
  readonly cityId: string;
  readonly cityLabelKo: string;
  readonly lineCountLabel: string;
  readonly sourceKo: string;
  readonly lineLabelKo: (lineId: string) => string;
  readonly stations: readonly TransitStationRecord[];
};

import {
  TOKYO_TRANSIT_LINE_LABEL_KO,
  TOKYO_TRANSIT_STATIONS,
} from "@/lib/fact-query/data/tokyo-transit-ssot";
import {
  OSAKA_TRANSIT_LINE_LABEL_KO,
  OSAKA_TRANSIT_STATIONS,
} from "@/lib/fact-query/data/osaka-transit-ssot";
import {
  SEOUL_TRANSIT_LINE_LABEL_KO,
  SEOUL_TRANSIT_STATIONS,
} from "@/lib/fact-query/data/seoul-transit-ssot";
import {
  OSAKA_HOTSPOTS,
} from "@/lib/fact-query/data/osaka-hotspot-ssot";
import {
  SEOUL_HOTSPOTS,
} from "@/lib/fact-query/data/seoul-hotspot-ssot";
import {
  TOKYO_HOTSPOTS,
} from "@/lib/fact-query/data/tokyo-hotspot-ssot";

export type HotspotRecord = {
  readonly id: string;
  readonly nameKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly hotScore: number;
  readonly reasonKo: string;
};

export type HotspotCityPack = {
  readonly cityId: string;
  readonly cityLabelKo: string;
  readonly sourceKo: string;
  readonly hotspots: readonly HotspotRecord[];
};

const TRANSIT_PACKS: Record<string, TransitCityPack> = {
  tokyo: {
    cityId: "tokyo",
    cityLabelKo: "도쿄",
    lineCountLabel: "13노선(메트로 9+도에이 4)",
    sourceKo: "Tokyo Metro + Toei SSOT",
    lineLabelKo: (id) =>
      TOKYO_TRANSIT_LINE_LABEL_KO[id as keyof typeof TOKYO_TRANSIT_LINE_LABEL_KO] ?? id,
    stations: TOKYO_TRANSIT_STATIONS,
  },
  osaka: {
    cityId: "osaka",
    cityLabelKo: "오사카",
    lineCountLabel: "9노선(오사카 메트로)",
    sourceKo: "Osaka Metro SSOT",
    lineLabelKo: (id) =>
      OSAKA_TRANSIT_LINE_LABEL_KO[id as keyof typeof OSAKA_TRANSIT_LINE_LABEL_KO] ?? id,
    stations: OSAKA_TRANSIT_STATIONS,
  },
  seoul: {
    cityId: "seoul",
    cityLabelKo: "서울",
    lineCountLabel: "9호선(서울 지하철)",
    sourceKo: "Seoul Metro SSOT",
    lineLabelKo: (id) =>
      SEOUL_TRANSIT_LINE_LABEL_KO[id as keyof typeof SEOUL_TRANSIT_LINE_LABEL_KO] ?? id,
    stations: SEOUL_TRANSIT_STATIONS.map((s) => ({
      id: s.id,
      nameKo: s.nameKo,
      nameJa: s.nameEn,
      lat: s.lat,
      lng: s.lng,
      lines: s.lines,
    })),
  },
};

const HOTSPOT_PACKS: Record<string, HotspotCityPack> = {
  tokyo: {
    cityId: "tokyo",
    cityLabelKo: "도쿄",
    sourceKo: "Rimvio Tokyo Hotspot Index",
    hotspots: TOKYO_HOTSPOTS,
  },
  osaka: {
    cityId: "osaka",
    cityLabelKo: "오사카",
    sourceKo: "Rimvio Osaka Hotspot Index",
    hotspots: OSAKA_HOTSPOTS,
  },
  seoul: {
    cityId: "seoul",
    cityLabelKo: "서울",
    sourceKo: "Rimvio Seoul Hotspot Index",
    hotspots: SEOUL_HOTSPOTS,
  },
};

export function getTransitCityPack(cityId: string): TransitCityPack | null {
  return TRANSIT_PACKS[cityId] ?? null;
}

export function getHotspotCityPack(cityId: string): HotspotCityPack | null {
  return HOTSPOT_PACKS[cityId] ?? null;
}

export function buildTransitEvidence(
  pack: TransitCityPack,
  station: TransitStationRecord,
): FactEvidenceItem {
  const lineLabels = station.lines.map((id) => pack.lineLabelKo(id)).join(" · ");
  return {
    id: station.id,
    labelKo: station.nameKo,
    detailKo: `${station.lines.length}개 노선 · ${lineLabels}`,
    lat: station.lat,
    lng: station.lng,
    kind: "transit_hub",
    score: station.lines.length,
    source: `${pack.cityId}_transit_ssot`,
  };
}

export function buildHotspotEvidence(
  pack: HotspotCityPack,
  row: HotspotRecord,
): FactEvidenceItem {
  return {
    id: row.id,
    labelKo: row.nameKo,
    detailKo: row.reasonKo,
    lat: row.lat,
    lng: row.lng,
    kind: "hotspot",
    score: row.hotScore,
    source: `${pack.cityId}_hotspot_ssot`,
  };
}

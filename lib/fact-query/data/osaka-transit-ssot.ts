/**
 * Osaka Metro SSOT — 9 lines (Municipal subway).
 */

export type OsakaTransitLineId =
  | "midosuji"
  | "tanimachi"
  | "yotsubashi"
  | "chuo"
  | "sennichimae"
  | "sakaisuji"
  | "nagahori"
  | "imazato"
  | "new-tram";

export type OsakaTransitStation = {
  readonly id: string;
  readonly nameKo: string;
  readonly nameJa: string;
  readonly lat: number;
  readonly lng: number;
  readonly lines: readonly OsakaTransitLineId[];
};

export const OSAKA_TRANSIT_LINE_LABEL_KO: Record<OsakaTransitLineId, string> = {
  midosuji: "미도스지",
  tanimachi: "타니마치",
  yotsubashi: "요츠바시",
  chuo: "츄오",
  sennichimae: "센니치마에",
  sakaisuji: "사카이스지",
  nagahori: "나가호리",
  imazato: "이마자토",
  "new-tram": "뉴트램",
};

export const OSAKA_TRANSIT_STATIONS: readonly OsakaTransitStation[] = [
  {
    id: "namba",
    nameKo: "난바",
    nameJa: "難波",
    lat: 34.6654,
    lng: 135.5013,
    lines: ["midosuji", "sennichimae", "yotsubashi"],
  },
  {
    id: "hommachi",
    nameKo: "혼마치",
    nameJa: "本町",
    lat: 34.6835,
    lng: 135.4994,
    lines: ["midosuji", "chuo", "yotsubashi"],
  },
  {
    id: "tennoji",
    nameKo: "텐노지",
    nameJa: "天王寺",
    lat: 34.6464,
    lng: 135.5135,
    lines: ["midosuji", "tanimachi", "sakaisuji"],
  },
  {
    id: "umeda",
    nameKo: "우메다",
    nameJa: "梅田",
    lat: 34.7055,
    lng: 135.4983,
    lines: ["midosuji", "tanimachi"],
  },
  {
    id: "awaza",
    nameKo: "아와자",
    nameJa: "阿波座",
    lat: 34.672,
    lng: 135.496,
    lines: ["chuo", "sennichimae"],
  },
  {
    id: "nippombashi",
    nameKo: "닛폰바시",
    nameJa: "日本橋",
    lat: 34.6669,
    lng: 135.5063,
    lines: ["sennichimae", "sakaisuji"],
  },
];

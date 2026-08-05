/**
 * Osaka Metro line catalog — Workspace MapLibre overlay only (not 3D Globe).
 * Official-ish stroke colors for custom dark canvas.
 */

export const OSAKA_METRO_LINE_IDS = [
  "midosuji",
  "tanimachi",
  "yotsubashi",
  "chuo",
  "sennichimae",
  "sakaisuji",
  "nagahori",
  "imazatosuji",
  "nanko",
  /** JR West Sakurajima / Yumesaki — Universal City (USJ). Not Osaka Metro. */
  "jr_yumesaki",
] as const;

export type OsakaMetroLineId = (typeof OSAKA_METRO_LINE_IDS)[number];

export type OsakaMetroLineEntry = {
  readonly id: OsakaMetroLineId;
  readonly labelKo: string;
  /** Compact map / legend label (minimal). */
  readonly shortLabelKo: string;
  readonly labelEn: string;
  readonly color: string;
  /** Rough mid-line anchor for on-map HTML label [lng, lat]. */
  readonly labelAnchor: readonly [number, number];
  /** NL aliases (KO / JA / EN / code) */
  readonly aliases: readonly string[];
};

import { linePathMidpoint } from "@/lib/geo/osaka-metro/station-catalog";

function mid(
  lineId: OsakaMetroLineId,
  fallback: readonly [number, number],
): readonly [number, number] {
  return linePathMidpoint(lineId) ?? fallback;
}

export const OSAKA_METRO_LINE_CATALOG: readonly OsakaMetroLineEntry[] = [
  {
    id: "midosuji",
    labelKo: "미도스지선",
    shortLabelKo: "미도스지",
    labelEn: "Midosuji Line",
    color: "#E60012",
    labelAnchor: mid("midosuji", [135.5052, 34.6548]),
    aliases: [
      "미도스지",
      "미도스지선",
      "御堂筋",
      "御堂筋線",
      "midosuji",
      "midōsuji",
      "m선",
      "m line",
    ],
  },
  {
    id: "tanimachi",
    labelKo: "다니마치선",
    shortLabelKo: "다니마치",
    labelEn: "Tanimachi Line",
    color: "#522886",
    labelAnchor: mid("tanimachi", [135.5152, 34.6652]),
    aliases: ["다니마치", "다니마치선", "谷町", "谷町線", "tanimachi", "t선"],
  },
  {
    id: "yotsubashi",
    labelKo: "요쓰바시선",
    shortLabelKo: "요쓰바시",
    labelEn: "Yotsubashi Line",
    color: "#0078BA",
    labelAnchor: mid("yotsubashi", [135.4938, 34.6742]),
    aliases: ["요쓰바시", "요츠바시", "요쓰바시선", "四つ橋", "yotsubashi", "y선"],
  },
  {
    id: "chuo",
    labelKo: "주오선",
    shortLabelKo: "주오",
    labelEn: "Chuo Line",
    color: "#019A66",
    labelAnchor: mid("chuo", [135.5102, 34.6812]),
    aliases: ["주오", "주오선", "中央", "中央線", "chuo", "chūō", "c선"],
  },
  {
    id: "sennichimae",
    labelKo: "센니치마에선",
    shortLabelKo: "센니치",
    labelEn: "Sennichimae Line",
    color: "#E44D93",
    labelAnchor: mid("sennichimae", [135.5125, 34.6628]),
    aliases: [
      "센니치마에",
      "센니치마에선",
      "千日前",
      "千日前線",
      "sennichimae",
      "s선",
    ],
  },
  {
    id: "sakaisuji",
    labelKo: "사카이스지선",
    shortLabelKo: "사카이스지",
    labelEn: "Sakaisuji Line",
    color: "#B5A36A",
    labelAnchor: mid("sakaisuji", [135.5095, 34.6748]),
    aliases: ["사카이스지", "사카이스지선", "堺筋", "堺筋線", "sakaisuji", "k선"],
  },
  {
    id: "nagahori",
    labelKo: "나가호리쓰루미료쿠치선",
    shortLabelKo: "나가호리",
    labelEn: "Nagahori Tsurumi-ryokuchi Line",
    color: "#A8BF00",
    labelAnchor: mid("nagahori", [135.5205, 34.6805]),
    aliases: [
      "나가호리",
      "나가호리선",
      "나가호리쓰루미",
      "長堀",
      "長堀鶴見緑地線",
      "nagahori",
      "n선",
    ],
  },
  {
    id: "imazatosuji",
    labelKo: "이마자토스지선",
    shortLabelKo: "이마자토",
    labelEn: "Imazatosuji Line",
    color: "#EE7B1A",
    labelAnchor: mid("imazatosuji", [135.5385, 34.6682]),
    aliases: [
      "이마자토스지",
      "이마자토",
      "이마자토스지선",
      "今里筋",
      "今里筋線",
      "imazatosuji",
      "i선",
    ],
  },
  {
    id: "nanko",
    labelKo: "난코포트타운선",
    shortLabelKo: "난코",
    labelEn: "Nanko Port Town Line",
    color: "#00A0DE",
    labelAnchor: mid("nanko", [135.4225, 34.6385]),
    aliases: [
      "난코",
      "난코포트",
      "난코포트타운",
      "난코포트타운선",
      "南港",
      "ニュートラム",
      "nanko",
      "new tram",
      "p선",
    ],
  },
  {
    id: "jr_yumesaki",
    labelKo: "JR유메사키선",
    shortLabelKo: "JR유메사키",
    labelEn: "JR Yumesaki (Sakurajima) Line",
    color: "#1A6BB5",
    labelAnchor: mid("jr_yumesaki", [135.452, 34.672]),
    aliases: [
      "유메사키",
      "유메사키선",
      "jr유메사키",
      "jr 유메사키",
      "사쿠라지마",
      "사쿠라지마선",
      "桜島",
      "桜島線",
      "夢咲",
      "夢咲線",
      "yumesaki",
      "sakurajima",
      "universal city",
      "유니버설시티",
      "유니버셜시티",
      "유니버설 시티",
      "usj선",
      "유니버설선",
      "유니버셜선",
    ],
  },
] as const;

export const OSAKA_METRO_GEOJSON_URL = "/geo/osaka_metro.geojson";

export function getOsakaMetroLineEntry(
  id: string,
): OsakaMetroLineEntry | null {
  return OSAKA_METRO_LINE_CATALOG.find((e) => e.id === id) ?? null;
}

/**
 * Resolve lineId from utterance fragment (longest alias wins).
 */
export function resolveOsakaMetroLineIdFromText(
  text: string,
): OsakaMetroLineId | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  let best: OsakaMetroLineId | null = null;
  let bestLen = 0;
  for (const entry of OSAKA_METRO_LINE_CATALOG) {
    for (const alias of entry.aliases) {
      const a = alias.toLowerCase();
      if (a.length >= 2 && t.includes(a) && a.length > bestLen) {
        best = entry.id;
        bestLen = a.length;
      }
    }
  }
  return best;
}

/**
 * Korea national rail catalog — Workspace MapLibre overlay only (not 3D Globe).
 * Simplified corridor colors for Toss-style light canvas.
 */

export const KOREA_RAIL_LINE_IDS = [
  "ktx_gyeongbu",
  "ktx_honam",
  "ktx_gangneung",
  "ktx_jeolla",
  "ktx_gyeongjeon",
  "srt",
  "gyeongbu",
  "honam",
  "jeolla",
  "jungang",
  "yeongdong",
  "donghae",
  "janghang",
] as const;

export type KoreaRailLineId = (typeof KOREA_RAIL_LINE_IDS)[number];

export type KoreaRailLineEntry = {
  readonly id: KoreaRailLineId;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly color: string;
  readonly aliases: readonly string[];
};

/** Official-ish Korail / KTX map hues (simplified). */
export const KOREA_RAIL_LINE_CATALOG: readonly KoreaRailLineEntry[] = [
  {
    id: "ktx_gyeongbu",
    labelKo: "KTX 경부선",
    labelEn: "KTX Gyeongbu",
    color: "#0054A6",
    aliases: [
      "ktx 경부",
      "ktx경부",
      "경부고속",
      "경부 ktx",
      "ktx gyeongbu",
      "gyeongbu ktx",
    ],
  },
  {
    id: "ktx_honam",
    labelKo: "KTX 호남선",
    labelEn: "KTX Honam",
    color: "#00A651",
    aliases: ["ktx 호남", "ktx호남", "호남고속", "호남 ktx", "ktx honam"],
  },
  {
    id: "ktx_gangneung",
    labelKo: "KTX 강릉선",
    labelEn: "KTX Gangneung",
    color: "#00B5E2",
    aliases: [
      "ktx 강릉",
      "ktx강릉",
      "강릉선",
      "강릉 ktx",
      "원주강릉",
      "ktx gangneung",
    ],
  },
  {
    id: "ktx_jeolla",
    labelKo: "KTX 전라선",
    labelEn: "KTX Jeolla",
    color: "#8DC63F",
    aliases: ["ktx 전라", "ktx전라", "전라고속", "전라 ktx", "ktx jeolla"],
  },
  {
    id: "ktx_gyeongjeon",
    labelKo: "KTX 경전선",
    labelEn: "KTX Gyeongjeon",
    color: "#F15A29",
    aliases: ["ktx 경전", "ktx경전", "경전고속", "경전 ktx", "ktx gyeongjeon"],
  },
  {
    id: "srt",
    labelKo: "SRT",
    labelEn: "SRT",
    color: "#6B2D7B",
    aliases: ["srt", "에스알티", "수서고속", "수서 srt"],
  },
  {
    id: "gyeongbu",
    labelKo: "경부선",
    labelEn: "Gyeongbu Line",
    color: "#1B75BB",
    aliases: ["경부선", "경부", "gyeongbu line", "gyeongbu"],
  },
  {
    id: "honam",
    labelKo: "호남선",
    labelEn: "Honam Line",
    color: "#39B54A",
    aliases: ["호남선", "호남", "honam line", "honam"],
  },
  {
    id: "jeolla",
    labelKo: "전라선",
    labelEn: "Jeolla Line",
    color: "#A8CF45",
    aliases: ["전라선", "전라", "jeolla line", "jeolla"],
  },
  {
    id: "jungang",
    labelKo: "중앙선",
    labelEn: "Jungang Line",
    color: "#F7941D",
    aliases: ["중앙선", "중앙", "jungang line", "jungang", "중부내륙"],
  },
  {
    id: "yeongdong",
    labelKo: "영동선",
    labelEn: "Yeongdong Line",
    color: "#9B59B6",
    aliases: ["영동선", "영동", "yeongdong line", "yeongdong"],
  },
  {
    id: "donghae",
    labelKo: "동해선",
    labelEn: "Donghae Line",
    color: "#E91E63",
    aliases: ["동해선", "동해", "donghae line", "donghae"],
  },
  {
    id: "janghang",
    labelKo: "장항선",
    labelEn: "Janghang Line",
    color: "#795548",
    aliases: ["장항선", "장항", "janghang line", "janghang"],
  },
] as const;

export const KOREA_RAIL_GEOJSON_URL = "/geo/korea_rail.geojson";

/** Rough peninsula bbox for fitBounds fallback. */
export const KOREA_RAIL_BOUNDS: [[number, number], [number, number]] = [
  [125.8, 33.9],
  [129.6, 38.1],
];

export function getKoreaRailLineEntry(id: string): KoreaRailLineEntry | null {
  return KOREA_RAIL_LINE_CATALOG.find((e) => e.id === id) ?? null;
}

/**
 * Resolve lineId from utterance (longest alias wins).
 * Avoid matching bare 「경부」 inside unrelated phrases when shorter.
 */
export function resolveKoreaRailLineIdFromText(
  text: string,
): KoreaRailLineId | null {
  const t = text.trim().toLowerCase().replace(/\s+/gu, " ");
  if (!t) return null;
  let best: KoreaRailLineId | null = null;
  let bestLen = 0;
  for (const entry of KOREA_RAIL_LINE_CATALOG) {
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

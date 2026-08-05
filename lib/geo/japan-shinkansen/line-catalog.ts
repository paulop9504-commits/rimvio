/**
 * Japan Shinkansen catalog — Workspace MapLibre overlay only (not 3D Globe).
 * Simplified national corridors for travel Workspace preview.
 */

export const JAPAN_SHINKANSEN_LINE_IDS = [
  "tokaido",
  "sanyo",
  "tohoku",
  "joetsu",
  "hokuriku",
  "kyushu",
  "hokkaido",
  "yamagata",
  "akita",
  "nishi_kyushu",
] as const;

export type JapanShinkansenLineId = (typeof JAPAN_SHINKANSEN_LINE_IDS)[number];

export type JapanShinkansenLineEntry = {
  readonly id: JapanShinkansenLineId;
  readonly labelKo: string;
  readonly shortLabelKo: string;
  readonly labelEn: string;
  readonly color: string;
  /** Mid-corridor label anchor [lng, lat]. */
  readonly labelAnchor: readonly [number, number];
  readonly aliases: readonly string[];
};

/** JR Shinkansen map-ish hues (simplified). */
export const JAPAN_SHINKANSEN_LINE_CATALOG: readonly JapanShinkansenLineEntry[] =
  [
    {
      id: "tokaido",
      labelKo: "도카이도신칸센",
      shortLabelKo: "도카이도",
      labelEn: "Tokaido Shinkansen",
      color: "#0067C0",
      labelAnchor: [137.6, 35.0],
      aliases: [
        "도카이도",
        "도카이도신칸센",
        "東海道",
        "東海道新幹線",
        "tokaido",
        "tokaido shinkansen",
      ],
    },
    {
      id: "sanyo",
      labelKo: "산요신칸센",
      shortLabelKo: "산요",
      labelEn: "Sanyo Shinkansen",
      color: "#0072BC",
      labelAnchor: [133.2, 34.55],
      aliases: [
        "산요",
        "산요신칸센",
        "山陽",
        "山陽新幹線",
        "sanyo",
        "sanyo shinkansen",
      ],
    },
    {
      id: "tohoku",
      labelKo: "도호쿠신칸센",
      shortLabelKo: "도호쿠",
      labelEn: "Tohoku Shinkansen",
      color: "#00A040",
      labelAnchor: [140.5, 38.5],
      aliases: [
        "도호쿠",
        "도호쿠신칸센",
        "東北",
        "東北新幹線",
        "tohoku",
        "tohoku shinkansen",
      ],
    },
    {
      id: "joetsu",
      labelKo: "조에쓰신칸센",
      shortLabelKo: "조에쓰",
      labelEn: "Joetsu Shinkansen",
      color: "#E60012",
      labelAnchor: [139.0, 36.8],
      aliases: [
        "조에쓰",
        "조에츠",
        "조에쓰신칸센",
        "上越",
        "上越新幹線",
        "joetsu",
        "joetsu shinkansen",
      ],
    },
    {
      id: "hokuriku",
      labelKo: "호쿠리쿠신칸센",
      shortLabelKo: "호쿠리쿠",
      labelEn: "Hokuriku Shinkansen",
      color: "#C8102E",
      labelAnchor: [137.5, 36.5],
      aliases: [
        "호쿠리쿠",
        "호쿠리쿠신칸센",
        "北陸",
        "北陸新幹線",
        "hokuriku",
        "hokuriku shinkansen",
        "나가노신칸센",
      ],
    },
    {
      id: "kyushu",
      labelKo: "큐슈신칸센",
      shortLabelKo: "큐슈",
      labelEn: "Kyushu Shinkansen",
      color: "#F15A22",
      labelAnchor: [130.65, 32.7],
      aliases: [
        "큐슈",
        "규슈",
        "큐슈신칸센",
        "규슈신칸센",
        "九州",
        "九州新幹線",
        "kyushu",
        "kyushu shinkansen",
      ],
    },
    {
      id: "hokkaido",
      labelKo: "홋카이도신칸센",
      shortLabelKo: "홋카이도",
      labelEn: "Hokkaido Shinkansen",
      color: "#00A0E9",
      labelAnchor: [140.78, 41.35],
      aliases: [
        "홋카이도",
        "홋카이도신칸센",
        "北海道",
        "北海道新幹線",
        "hokkaido",
        "hokkaido shinkansen",
      ],
    },
    {
      id: "yamagata",
      labelKo: "야마가타신칸센",
      shortLabelKo: "야마가타",
      labelEn: "Yamagata Shinkansen",
      color: "#F7931E",
      labelAnchor: [140.3, 38.3],
      aliases: [
        "야마가타",
        "야마가타신칸센",
        "山形",
        "山形新幹線",
        "yamagata",
        "yamagata shinkansen",
      ],
    },
    {
      id: "akita",
      labelKo: "아키타신칸센",
      shortLabelKo: "아키타",
      labelEn: "Akita Shinkansen",
      color: "#E4002B",
      labelAnchor: [140.7, 39.7],
      aliases: [
        "아키타",
        "아키타신칸센",
        "秋田",
        "秋田新幹線",
        "akita",
        "akita shinkansen",
      ],
    },
    {
      id: "nishi_kyushu",
      labelKo: "니시큐슈신칸센",
      shortLabelKo: "니시큐슈",
      labelEn: "Nishi-Kyushu Shinkansen",
      color: "#7B2D8E",
      labelAnchor: [129.95, 33.0],
      aliases: [
        "니시큐슈",
        "니시규슈",
        "니시큐슈신칸센",
        "西九州",
        "西九州新幹線",
        "nishi kyushu",
        "nishi-kyushu",
        "나가사키신칸센",
      ],
    },
  ] as const;

export const JAPAN_SHINKANSEN_GEOJSON_URL = "/geo/japan_shinkansen.geojson";

/** Japan main islands bbox for fitBounds fallback. */
export const JAPAN_SHINKANSEN_BOUNDS: [[number, number], [number, number]] = [
  [129.5, 31.2],
  [141.8, 41.9],
];

export function getJapanShinkansenLineEntry(
  id: string,
): JapanShinkansenLineEntry | null {
  return JAPAN_SHINKANSEN_LINE_CATALOG.find((e) => e.id === id) ?? null;
}

export function resolveJapanShinkansenLineIdFromText(
  text: string,
): JapanShinkansenLineId | null {
  const t = text.trim().toLowerCase().replace(/\s+/gu, " ");
  if (!t) return null;
  let best: JapanShinkansenLineId | null = null;
  let bestLen = 0;
  for (const entry of JAPAN_SHINKANSEN_LINE_CATALOG) {
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

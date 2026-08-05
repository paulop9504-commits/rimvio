/**
 * Osaka JR (West) line catalog — Reality Provider `cached_overlay` payload.
 * Workspace MapLibre projection only (not 3D Globe).
 */

export const OSAKA_JR_LINE_IDS = [
  "jr_osaka_loop",
  "jr_kyoto",
  "jr_kobe",
  "jr_hanwa",
  "jr_yamatoji",
  "jr_yumesaki",
] as const;

export type OsakaJrLineId = (typeof OSAKA_JR_LINE_IDS)[number];

export type OsakaJrLineEntry = {
  readonly id: OsakaJrLineId;
  readonly labelKo: string;
  readonly shortLabelKo: string;
  readonly labelEn: string;
  readonly color: string;
  readonly labelAnchor: readonly [number, number];
  readonly aliases: readonly string[];
};

export const OSAKA_JR_LINE_CATALOG: readonly OsakaJrLineEntry[] = [
  {
    id: "jr_osaka_loop",
    labelKo: "JR오사카순환선",
    shortLabelKo: "순환선",
    labelEn: "JR Osaka Loop Line",
    color: "#E85298",
    labelAnchor: [135.505, 34.68],
    aliases: ["순환선", "오사카순환선", "루프선", "大阪環状", "osaka loop", "loop line"],
  },
  {
    id: "jr_kyoto",
    labelKo: "JR교토선",
    shortLabelKo: "교토선",
    labelEn: "JR Kyoto Line",
    color: "#0072BC",
    labelAnchor: [135.55, 34.78],
    aliases: ["교토선", "JR교토", "京都線", "kyoto line"],
  },
  {
    id: "jr_kobe",
    labelKo: "JR고베선",
    shortLabelKo: "고베선",
    labelEn: "JR Kobe Line",
    color: "#0072BC",
    labelAnchor: [135.4, 34.72],
    aliases: ["고베선", "JR고베", "神戸線", "kobe line"],
  },
  {
    id: "jr_hanwa",
    labelKo: "JR한와선",
    shortLabelKo: "한와선",
    labelEn: "JR Hanwa Line",
    color: "#F15A22",
    labelAnchor: [135.48, 34.55],
    aliases: ["한와선", "JR한와", "阪和線", "hanwa"],
  },
  {
    id: "jr_yamatoji",
    labelKo: "JR야마토지선",
    shortLabelKo: "야마토지",
    labelEn: "JR Yamatoji Line",
    color: "#00A651",
    labelAnchor: [135.58, 34.62],
    aliases: ["야마토지", "야마토지선", "大和路線", "yamatoji"],
  },
  {
    id: "jr_yumesaki",
    labelKo: "JR유메사키선",
    shortLabelKo: "유메사키",
    labelEn: "JR Yumesaki Line",
    color: "#1A6BB5",
    labelAnchor: [135.452, 34.672],
    aliases: ["유메사키", "사쿠라지마", "桜島", "yumesaki", "universal city"],
  },
] as const;

export const OSAKA_JR_GEOJSON_URL = "/geo/osaka_jr.geojson";

export const OSAKA_JR_BOUNDS: [[number, number], [number, number]] = [
  [135.35, 34.48],
  [135.68, 34.85],
];

export function getOsakaJrLineEntry(id: string): OsakaJrLineEntry | null {
  return OSAKA_JR_LINE_CATALOG.find((e) => e.id === id) ?? null;
}

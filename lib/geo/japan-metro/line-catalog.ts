/**
 * Japan nationwide subway/metro catalog — Workspace MapLibre only (not 3D Globe).
 * Simplified corridor colors (operator-ish). Detailed Osaka stays in osaka-metro/.
 */

export const JAPAN_METRO_LINE_IDS = [
  // Tokyo Metro
  "tokyo_ginza",
  "tokyo_marunouchi",
  "tokyo_hibiya",
  "tokyo_tozai",
  "tokyo_chiyoda",
  "tokyo_yurakucho",
  "tokyo_hanzomon",
  "tokyo_namboku",
  "tokyo_fukutoshin",
  // Toei
  "toei_asakusa",
  "toei_mita",
  "toei_shinjuku",
  "toei_oedo",
  // Yokohama
  "yokohama_blue",
  "yokohama_green",
  // Nagoya
  "nagoya_higashiyama",
  "nagoya_meijo",
  "nagoya_tsurumai",
  "nagoya_sakuradori",
  // Kyoto
  "kyoto_karasuma",
  "kyoto_tozai",
  // Osaka (national preview — local detail: osaka-metro)
  "osaka_midosuji",
  "osaka_tanimachi",
  "osaka_yotsubashi",
  "osaka_chuo",
  "osaka_sennichimae",
  "osaka_sakaisuji",
  "osaka_nagahori",
  // Kobe
  "kobe_seishin",
  "kobe_kaigan",
  // Fukuoka
  "fukuoka_kuko",
  "fukuoka_hakozaki",
  "fukuoka_nanakuma",
  // Sendai
  "sendai_namboku",
  "sendai_tozai",
  // Sapporo
  "sapporo_namboku",
  "sapporo_tozai",
  "sapporo_toho",
] as const;

export type JapanMetroLineId = (typeof JAPAN_METRO_LINE_IDS)[number];

export type JapanMetroLineEntry = {
  readonly id: JapanMetroLineId;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly cityKo: string;
  readonly color: string;
  readonly aliases: readonly string[];
};

export const JAPAN_METRO_LINE_CATALOG: readonly JapanMetroLineEntry[] = [
  {
    id: "tokyo_ginza",
    labelKo: "긴자선",
    labelEn: "Ginza Line",
    cityKo: "도쿄",
    color: "#FF9500",
    aliases: ["긴자선", "긴자", "銀座線", "ginza", "tokyo ginza"],
  },
  {
    id: "tokyo_marunouchi",
    labelKo: "마루노우치선",
    labelEn: "Marunouchi Line",
    cityKo: "도쿄",
    color: "#F62E36",
    aliases: ["마루노우치선", "마루노우치", "丸ノ内線", "marunouchi"],
  },
  {
    id: "tokyo_hibiya",
    labelKo: "히비야선",
    labelEn: "Hibiya Line",
    cityKo: "도쿄",
    color: "#B5B5AC",
    aliases: ["히비야선", "히비야", "日比谷線", "hibiya"],
  },
  {
    id: "tokyo_tozai",
    labelKo: "도자이선",
    labelEn: "Tozai Line",
    cityKo: "도쿄",
    color: "#009BBF",
    aliases: ["도자이선", "도쿄 도자이", "東西線", "tozai line tokyo"],
  },
  {
    id: "tokyo_chiyoda",
    labelKo: "치요다선",
    labelEn: "Chiyoda Line",
    cityKo: "도쿄",
    color: "#00BB66",
    aliases: ["치요다선", "치요다", "千代田線", "chiyoda"],
  },
  {
    id: "tokyo_yurakucho",
    labelKo: "유라쿠초선",
    labelEn: "Yurakucho Line",
    cityKo: "도쿄",
    color: "#C1A470",
    aliases: ["유라쿠초선", "유라쿠초", "有楽町線", "yurakucho", "yurakuchō"],
  },
  {
    id: "tokyo_hanzomon",
    labelKo: "한조몬선",
    labelEn: "Hanzomon Line",
    cityKo: "도쿄",
    color: "#8F76D6",
    aliases: ["한조몬선", "한조몬", "半蔵門線", "hanzomon", "hanzōmon"],
  },
  {
    id: "tokyo_namboku",
    labelKo: "난보쿠선",
    labelEn: "Namboku Line",
    cityKo: "도쿄",
    color: "#00AC9B",
    aliases: ["난보쿠선", "난보쿠", "南北線", "namboku", "nanboku"],
  },
  {
    id: "tokyo_fukutoshin",
    labelKo: "후쿠토신선",
    labelEn: "Fukutoshin Line",
    cityKo: "도쿄",
    color: "#9C5E31",
    aliases: ["후쿠토신선", "후쿠토신", "副都心線", "fukutoshin"],
  },
  {
    id: "toei_asakusa",
    labelKo: "아사쿠사선",
    labelEn: "Asakusa Line",
    cityKo: "도쿄",
    color: "#E85298",
    aliases: ["아사쿠사선", "도에이 아사쿠사", "浅草線", "asakusa line", "toei asakusa"],
  },
  {
    id: "toei_mita",
    labelKo: "미타선",
    labelEn: "Mita Line",
    cityKo: "도쿄",
    color: "#0079C2",
    aliases: ["미타선", "도에이 미타", "三田線", "mita line", "toei mita"],
  },
  {
    id: "toei_shinjuku",
    labelKo: "신주쿠선",
    labelEn: "Shinjuku Line",
    cityKo: "도쿄",
    color: "#6CBB5A",
    aliases: ["신주쿠선", "도에이 신주쿠", "新宿線", "toei shinjuku"],
  },
  {
    id: "toei_oedo",
    labelKo: "오에도선",
    labelEn: "Oedo Line",
    cityKo: "도쿄",
    color: "#B6007A",
    aliases: ["오에도선", "오에도", "大江戸線", "oedo", "ōedo", "toei oedo"],
  },
  {
    id: "yokohama_blue",
    labelKo: "요코하마 블루라인",
    labelEn: "Yokohama Blue Line",
    cityKo: "요코하마",
    color: "#0068B7",
    aliases: ["요코하마 블루", "블루라인", "横浜ブルー", "yokohama blue"],
  },
  {
    id: "yokohama_green",
    labelKo: "요코하마 그린라인",
    labelEn: "Yokohama Green Line",
    cityKo: "요코하마",
    color: "#00A651",
    aliases: ["요코하마 그린", "그린라인", "横浜グリーン", "yokohama green"],
  },
  {
    id: "nagoya_higashiyama",
    labelKo: "히가시야마선",
    labelEn: "Higashiyama Line",
    cityKo: "나고야",
    color: "#FFCC00",
    aliases: ["히가시야마선", "히가시야마", "東山線", "higashiyama"],
  },
  {
    id: "nagoya_meijo",
    labelKo: "메이죠선",
    labelEn: "Meijo Line",
    cityKo: "나고야",
    color: "#C71585",
    aliases: ["메이죠선", "메이죠", "名城線", "meijo", "meijō"],
  },
  {
    id: "nagoya_tsurumai",
    labelKo: "쓰루마이선",
    labelEn: "Tsurumai Line",
    cityKo: "나고야",
    color: "#0095D9",
    aliases: ["쓰루마이선", "츠루마이", "鶴舞線", "tsurumai"],
  },
  {
    id: "nagoya_sakuradori",
    labelKo: "사쿠라도리선",
    labelEn: "Sakura-dori Line",
    cityKo: "나고야",
    color: "#E85298",
    aliases: ["사쿠라도리선", "사쿠라도리", "桜通線", "sakura-dori", "sakuradori"],
  },
  {
    id: "kyoto_karasuma",
    labelKo: "가라스마선",
    labelEn: "Karasuma Line",
    cityKo: "교토",
    color: "#1A9E4E",
    aliases: ["가라스마선", "가라스마", "烏丸線", "karasuma"],
  },
  {
    id: "kyoto_tozai",
    labelKo: "교토 도자이선",
    labelEn: "Kyoto Tozai Line",
    cityKo: "교토",
    color: "#00A7E3",
    aliases: ["교토 도자이", "교토도자이선", "京都市東西線", "kyoto tozai"],
  },
  {
    id: "osaka_midosuji",
    labelKo: "미도스지선",
    labelEn: "Midosuji Line",
    cityKo: "오사카",
    color: "#E60012",
    aliases: ["미도스지선", "미도스지", "御堂筋線", "midosuji"],
  },
  {
    id: "osaka_tanimachi",
    labelKo: "다니마치선",
    labelEn: "Tanimachi Line",
    cityKo: "오사카",
    color: "#522886",
    aliases: ["다니마치선", "다니마치", "谷町線", "tanimachi"],
  },
  {
    id: "osaka_yotsubashi",
    labelKo: "요쓰바시선",
    labelEn: "Yotsubashi Line",
    cityKo: "오사카",
    color: "#0078BA",
    aliases: ["요쓰바시선", "요츠바시", "四つ橋線", "yotsubashi"],
  },
  {
    id: "osaka_chuo",
    labelKo: "주오선",
    labelEn: "Chuo Line",
    cityKo: "오사카",
    color: "#019A66",
    aliases: ["오사카 주오", "주오선 오사카", "大阪中央線", "osaka chuo"],
  },
  {
    id: "osaka_sennichimae",
    labelKo: "센니치마에선",
    labelEn: "Sennichimae Line",
    cityKo: "오사카",
    color: "#E44D93",
    aliases: ["센니치마에선", "센니치마에", "千日前線", "sennichimae"],
  },
  {
    id: "osaka_sakaisuji",
    labelKo: "사카이스지선",
    labelEn: "Sakaisuji Line",
    cityKo: "오사카",
    color: "#B5A36A",
    aliases: ["사카이스지선", "사카이스지", "堺筋線", "sakaisuji"],
  },
  {
    id: "osaka_nagahori",
    labelKo: "나가호리선",
    labelEn: "Nagahori Line",
    cityKo: "오사카",
    color: "#A8BF00",
    aliases: ["나가호리선", "나가호리", "長堀線", "nagahori"],
  },
  {
    id: "kobe_seishin",
    labelKo: "세이신·야마테선",
    labelEn: "Seishin-Yamate Line",
    cityKo: "고베",
    color: "#0078C1",
    aliases: ["세이신선", "야마테선", "西神山手", "seishin", "kobe subway"],
  },
  {
    id: "kobe_kaigan",
    labelKo: "카이간선",
    labelEn: "Kaigan Line",
    cityKo: "고베",
    color: "#00A0E9",
    aliases: ["카이간선", "해안선 고베", "海岸線", "kaigan"],
  },
  {
    id: "fukuoka_kuko",
    labelKo: "공항선",
    labelEn: "Kuko Line",
    cityKo: "후쿠오카",
    color: "#FF9E1B",
    aliases: ["후쿠오카 공항선", "공항선 후쿠오카", "空港線", "kuko line", "fukuoka airport line"],
  },
  {
    id: "fukuoka_hakozaki",
    labelKo: "하코자키선",
    labelEn: "Hakozaki Line",
    cityKo: "후쿠오카",
    color: "#0077C8",
    aliases: ["하코자키선", "하코자키", "箱崎線", "hakozaki"],
  },
  {
    id: "fukuoka_nanakuma",
    labelKo: "나나쿠마선",
    labelEn: "Nanakuma Line",
    cityKo: "후쿠오카",
    color: "#9BCC3C",
    aliases: ["나나쿠마선", "나나쿠마", "七隈線", "nanakuma"],
  },
  {
    id: "sendai_namboku",
    labelKo: "센다이 난보쿠선",
    labelEn: "Sendai Namboku Line",
    cityKo: "센다이",
    color: "#0077C8",
    aliases: ["센다이 난보쿠", "센다이 남북", "仙台南北", "sendai namboku"],
  },
  {
    id: "sendai_tozai",
    labelKo: "센다이 도자이선",
    labelEn: "Sendai Tozai Line",
    cityKo: "센다이",
    color: "#FF9E1B",
    aliases: ["센다이 도자이", "仙台東西", "sendai tozai"],
  },
  {
    id: "sapporo_namboku",
    labelKo: "삿포로 난보쿠선",
    labelEn: "Sapporo Namboku Line",
    cityKo: "삿포로",
    color: "#007A33",
    aliases: ["삿포로 난보쿠", "札幌南北", "sapporo namboku"],
  },
  {
    id: "sapporo_tozai",
    labelKo: "삿포로 도자이선",
    labelEn: "Sapporo Tozai Line",
    cityKo: "삿포로",
    color: "#0073BC",
    aliases: ["삿포로 도자이", "札幌東西", "sapporo tozai"],
  },
  {
    id: "sapporo_toho",
    labelKo: "삿포로 도호선",
    labelEn: "Sapporo Toho Line",
    cityKo: "삿포로",
    color: "#F15A22",
    aliases: ["삿포로 도호", "도호선", "東豊線", "sapporo toho", "toho"],
  },
] as const;

export const JAPAN_METRO_GEOJSON_URL = "/geo/japan_metro.geojson";

/** Rough Japan metro coverage bbox (Sapporo–Fukuoka). */
export const JAPAN_METRO_BOUNDS: [[number, number], [number, number]] = [
  [130.2, 33.4],
  [141.6, 43.2],
];

export function getJapanMetroLineEntry(
  id: string,
): JapanMetroLineEntry | null {
  return JAPAN_METRO_LINE_CATALOG.find((e) => e.id === id) ?? null;
}

export function resolveJapanMetroLineIdFromText(
  text: string,
): JapanMetroLineId | null {
  const t = text.trim().toLowerCase().replace(/\s+/gu, " ");
  if (!t) return null;
  let best: JapanMetroLineId | null = null;
  let bestLen = 0;
  for (const entry of JAPAN_METRO_LINE_CATALOG) {
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

/** City group → line ids for 「도쿄 지하철」 style commands. */
export const JAPAN_METRO_CITY_GROUPS: ReadonlyArray<{
  readonly cityId: string;
  readonly aliases: readonly string[];
  readonly lineIds: readonly JapanMetroLineId[];
}> = [
  {
    cityId: "tokyo",
    aliases: ["도쿄 지하철", "도쿄 메트로", "tokyo metro", "tokyo subway", "도에이"],
    lineIds: JAPAN_METRO_LINE_IDS.filter(
      (id) => id.startsWith("tokyo_") || id.startsWith("toei_"),
    ),
  },
  {
    cityId: "osaka",
    aliases: ["오사카 지하철", "오사카 메트로", "osaka metro", "osaka subway"],
    lineIds: JAPAN_METRO_LINE_IDS.filter((id) => id.startsWith("osaka_")),
  },
  {
    cityId: "nagoya",
    aliases: ["나고야 지하철", "나고야 메트로", "nagoya subway"],
    lineIds: JAPAN_METRO_LINE_IDS.filter((id) => id.startsWith("nagoya_")),
  },
  {
    cityId: "kyoto",
    aliases: ["교토 지하철", "kyoto subway"],
    lineIds: JAPAN_METRO_LINE_IDS.filter((id) => id.startsWith("kyoto_")),
  },
  {
    cityId: "kobe",
    aliases: ["고베 지하철", "kobe subway"],
    lineIds: JAPAN_METRO_LINE_IDS.filter((id) => id.startsWith("kobe_")),
  },
  {
    cityId: "fukuoka",
    aliases: ["후쿠오카 지하철", "후쿠오카 메트로", "fukuoka subway"],
    lineIds: JAPAN_METRO_LINE_IDS.filter((id) => id.startsWith("fukuoka_")),
  },
  {
    cityId: "sendai",
    aliases: ["센다이 지하철", "sendai subway"],
    lineIds: JAPAN_METRO_LINE_IDS.filter((id) => id.startsWith("sendai_")),
  },
  {
    cityId: "sapporo",
    aliases: ["삿포로 지하철", "sapporo subway"],
    lineIds: JAPAN_METRO_LINE_IDS.filter((id) => id.startsWith("sapporo_")),
  },
  {
    cityId: "yokohama",
    aliases: ["요코하마 지하철", "yokohama subway"],
    lineIds: JAPAN_METRO_LINE_IDS.filter((id) => id.startsWith("yokohama_")),
  },
];

export function resolveJapanMetroCityLineIds(
  text: string,
): readonly JapanMetroLineId[] | null {
  const t = text.trim().toLowerCase().replace(/\s+/gu, " ");
  let best: (typeof JAPAN_METRO_CITY_GROUPS)[number] | null = null;
  let bestLen = 0;
  for (const g of JAPAN_METRO_CITY_GROUPS) {
    for (const alias of g.aliases) {
      const a = alias.toLowerCase();
      if (a.length >= 2 && t.includes(a) && a.length > bestLen) {
        best = g;
        bestLen = a.length;
      }
    }
  }
  return best?.lineIds ?? null;
}

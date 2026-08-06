/**
 * Osaka Metro / JR Yumesaki stations — real-ish WGS84 for Workspace map.
 * Ordered paths drive LineString GeoJSON (scripts/generate-osaka-metro-geojson.ts).
 */

import type { OsakaMetroLineId } from "@/lib/geo/osaka-metro/line-catalog";

export type OsakaMetroStation = {
  readonly id: string;
  readonly nameKo: string;
  /** Official-ish station code for dense zoom (e.g. M16). */
  readonly code?: string;
  readonly lineIds: readonly OsakaMetroLineId[];
  readonly lng: number;
  readonly lat: number;
  /** Shown from lower zoom (transfer / tourist hubs). */
  readonly hub?: boolean;
};

/**
 * Station dictionary — coords aligned to OSM/public rail positions (±~50m).
 */
export const OSAKA_METRO_STATION_BY_ID: Readonly<
  Record<string, OsakaMetroStation>
> = {
  // —— 미도스지 (N→S) ——
  "midosuji:esaka": {
    id: "midosuji:esaka",
    nameKo: "에사카",
    code: "M11",
    lineIds: ["midosuji"],
    lng: 135.64528,
    lat: 34.75778,
  },
  "midosuji:higashimikuni": {
    id: "midosuji:higashimikuni",
    nameKo: "히가시미쿠니",
    code: "M12",
    lineIds: ["midosuji"],
    lng: 135.52861,
    lat: 34.74194,
  },
  "midosuji:shin-osaka": {
    id: "midosuji:shin-osaka",
    nameKo: "신오사카",
    code: "M13",
    lineIds: ["midosuji"],
    lng: 135.5001,
    lat: 34.7334,
    hub: true,
  },
  "midosuji:nishinakajima": {
    id: "midosuji:nishinakajima",
    nameKo: "니시나카지마",
    code: "M14",
    lineIds: ["midosuji"],
    lng: 135.49806,
    lat: 34.72639,
  },
  "midosuji:nakatsu": {
    id: "midosuji:nakatsu",
    nameKo: "나카쓰",
    code: "M15",
    lineIds: ["midosuji"],
    lng: 135.49722,
    lat: 34.71028,
  },
  "midosuji:umeda": {
    id: "midosuji:umeda",
    nameKo: "우메다",
    code: "M16",
    lineIds: ["midosuji"],
    lng: 135.49806,
    lat: 34.7025,
    hub: true,
  },
  "midosuji:yodoyabashi": {
    id: "midosuji:yodoyabashi",
    nameKo: "요도야바시",
    code: "M17",
    lineIds: ["midosuji"],
    lng: 135.50139,
    lat: 34.6925,
    hub: true,
  },
  "midosuji:hommachi": {
    id: "midosuji:hommachi",
    nameKo: "혼마치",
    code: "M18",
    lineIds: ["midosuji", "chuo", "yotsubashi"],
    lng: 135.49972,
    lat: 34.68167,
    hub: true,
  },
  "midosuji:shinsaibashi": {
    id: "midosuji:shinsaibashi",
    nameKo: "신사이바시",
    code: "M19",
    lineIds: ["midosuji", "nagahori"],
    lng: 135.50028,
    lat: 34.67472,
    hub: true,
  },
  "midosuji:namba": {
    id: "midosuji:namba",
    nameKo: "난바",
    code: "M20",
    lineIds: ["midosuji", "yotsubashi", "sennichimae"],
    lng: 135.50056,
    lat: 34.66611,
    hub: true,
  },
  "midosuji:daikokucho": {
    id: "midosuji:daikokucho",
    nameKo: "다이코쿠초",
    code: "M21",
    lineIds: ["midosuji", "yotsubashi"],
    lng: 135.50611,
    lat: 34.65556,
  },
  "midosuji:dobutsuen": {
    id: "midosuji:dobutsuen",
    nameKo: "도부쓰엔마에",
    code: "M22",
    lineIds: ["midosuji", "sakaisuji"],
    lng: 135.50806,
    lat: 34.64861,
  },
  "midosuji:tennoji": {
    id: "midosuji:tennoji",
    nameKo: "덴노지",
    code: "M23",
    lineIds: ["midosuji", "tanimachi"],
    lng: 135.51361,
    lat: 34.64611,
    hub: true,
  },
  "midosuji:showacho": {
    id: "midosuji:showacho",
    nameKo: "쇼와초",
    code: "M24",
    lineIds: ["midosuji"],
    lng: 135.52,
    lat: 34.63806,
  },
  "midosuji:nishitanabe": {
    id: "midosuji:nishitanabe",
    nameKo: "니시타나베",
    code: "M25",
    lineIds: ["midosuji"],
    lng: 135.52806,
    lat: 34.6275,
  },
  "midosuji:nagai": {
    id: "midosuji:nagai",
    nameKo: "나가이",
    code: "M26",
    lineIds: ["midosuji"],
    lng: 135.5325,
    lat: 34.61194,
  },
  "midosuji:abiko": {
    id: "midosuji:abiko",
    nameKo: "아비코",
    code: "M27",
    lineIds: ["midosuji"],
    lng: 135.51278,
    lat: 34.59972,
  },
  "midosuji:kitahanada": {
    id: "midosuji:kitahanada",
    nameKo: "기타하나다",
    code: "M28",
    lineIds: ["midosuji"],
    lng: 135.50833,
    lat: 34.57722,
  },
  "midosuji:shinkanaoka": {
    id: "midosuji:shinkanaoka",
    nameKo: "신카나오카",
    code: "M29",
    lineIds: ["midosuji"],
    lng: 135.50694,
    lat: 34.56417,
  },
  "midosuji:nakamozu": {
    id: "midosuji:nakamozu",
    nameKo: "나카모즈",
    code: "M30",
    lineIds: ["midosuji"],
    lng: 135.50583,
    lat: 34.55611,
  },

  // —— 다니마치 (N→S) ——
  "tanimachi:dainichi": {
    id: "tanimachi:dainichi",
    nameKo: "다이니치",
    code: "T11",
    lineIds: ["tanimachi"],
    lng: 135.57806,
    lat: 34.74222,
  },
  "tanimachi:moriguchi": {
    id: "tanimachi:moriguchi",
    nameKo: "모리구치",
    code: "T12",
    lineIds: ["tanimachi"],
    lng: 135.56444,
    lat: 34.73528,
  },
  "tanimachi:taishibashi": {
    id: "tanimachi:taishibashi",
    nameKo: "다이시바시",
    code: "T14",
    lineIds: ["tanimachi"],
    lng: 135.545,
    lat: 34.72111,
  },
  "tanimachi:miyakojima": {
    id: "tanimachi:miyakojima",
    nameKo: "미야코지마",
    code: "T18",
    lineIds: ["tanimachi"],
    lng: 135.52222,
    lat: 34.70194,
  },
  "tanimachi:higashi-umeda": {
    id: "tanimachi:higashi-umeda",
    nameKo: "히가시우메다",
    code: "T20",
    lineIds: ["tanimachi"],
    lng: 135.50194,
    lat: 34.70028,
    hub: true,
  },
  "tanimachi:minami-morimachi": {
    id: "tanimachi:minami-morimachi",
    nameKo: "미나미모리마치",
    code: "T21",
    lineIds: ["tanimachi", "sakaisuji"],
    lng: 135.51111,
    lat: 34.69528,
  },
  "tanimachi:temmabashi": {
    id: "tanimachi:temmabashi",
    nameKo: "텐마바시",
    code: "T22",
    lineIds: ["tanimachi"],
    lng: 135.51694,
    lat: 34.68972,
  },
  "tanimachi:tanimachi4": {
    id: "tanimachi:tanimachi4",
    nameKo: "다니마치4",
    code: "T23",
    lineIds: ["tanimachi", "chuo"],
    lng: 135.51889,
    lat: 34.68222,
    hub: true,
  },
  "tanimachi:tanimachi6": {
    id: "tanimachi:tanimachi6",
    nameKo: "다니마치6",
    code: "T24",
    lineIds: ["tanimachi", "nagahori"],
    lng: 135.51889,
    lat: 34.67556,
  },
  "tanimachi:tanimachi9": {
    id: "tanimachi:tanimachi9",
    nameKo: "다니마치9",
    code: "T25",
    lineIds: ["tanimachi", "sennichimae"],
    lng: 135.51806,
    lat: 34.66611,
    hub: true,
  },
  "tanimachi:shitennouji": {
    id: "tanimachi:shitennouji",
    nameKo: "시텐노지마에",
    code: "T26",
    lineIds: ["tanimachi"],
    lng: 135.51972,
    lat: 34.655,
  },
  "tanimachi:tennoji": {
    id: "tanimachi:tennoji",
    nameKo: "덴노지",
    code: "T27",
    lineIds: ["tanimachi", "midosuji"],
    lng: 135.51361,
    lat: 34.64611,
    hub: true,
  },
  "tanimachi:abeno": {
    id: "tanimachi:abeno",
    nameKo: "아베노",
    code: "T28",
    lineIds: ["tanimachi"],
    lng: 135.51222,
    lat: 34.64306,
  },
  "tanimachi:yaominami": {
    id: "tanimachi:yaominami",
    nameKo: "야오미나미",
    code: "T36",
    lineIds: ["tanimachi"],
    lng: 135.575,
    lat: 34.54028,
  },

  // —— 요쓰바시 (N→S) ——
  "yotsubashi:nishi-umeda": {
    id: "yotsubashi:nishi-umeda",
    nameKo: "니시우메다",
    code: "Y11",
    lineIds: ["yotsubashi"],
    lng: 135.49611,
    lat: 34.69972,
    hub: true,
  },
  "yotsubashi:higobashi": {
    id: "yotsubashi:higobashi",
    nameKo: "히고바시",
    code: "Y12",
    lineIds: ["yotsubashi"],
    lng: 135.49639,
    lat: 34.69111,
  },
  "yotsubashi:hommachi": {
    id: "yotsubashi:hommachi",
    nameKo: "혼마치",
    code: "Y13",
    lineIds: ["yotsubashi", "midosuji", "chuo"],
    lng: 135.49972,
    lat: 34.68167,
    hub: true,
  },
  "yotsubashi:yotsubashi": {
    id: "yotsubashi:yotsubashi",
    nameKo: "요쓰바시",
    code: "Y14",
    lineIds: ["yotsubashi", "nagahori"],
    lng: 135.49722,
    lat: 34.67028,
  },
  "yotsubashi:namba": {
    id: "yotsubashi:namba",
    nameKo: "난바",
    code: "Y15",
    lineIds: ["yotsubashi", "midosuji", "sennichimae"],
    lng: 135.50056,
    lat: 34.66611,
    hub: true,
  },
  "yotsubashi:daikokucho": {
    id: "yotsubashi:daikokucho",
    nameKo: "다이코쿠초",
    code: "Y16",
    lineIds: ["yotsubashi", "midosuji"],
    lng: 135.50611,
    lat: 34.65556,
  },
  "yotsubashi:hanazonocho": {
    id: "yotsubashi:hanazonocho",
    nameKo: "하나조노초",
    code: "Y17",
    lineIds: ["yotsubashi"],
    lng: 135.49528,
    lat: 34.64722,
  },
  "yotsubashi:kishinosato": {
    id: "yotsubashi:kishinosato",
    nameKo: "기시노사토",
    code: "Y18",
    lineIds: ["yotsubashi"],
    lng: 135.49167,
    lat: 34.64028,
  },
  "yotsubashi:tamade": {
    id: "yotsubashi:tamade",
    nameKo: "타마데",
    code: "Y19",
    lineIds: ["yotsubashi"],
    lng: 135.48889,
    lat: 34.62917,
  },
  "yotsubashi:suminoekoen": {
    id: "yotsubashi:suminoekoen",
    nameKo: "스미노에코엔",
    code: "Y21",
    lineIds: ["yotsubashi", "nanko"],
    lng: 135.48028,
    lat: 34.61056,
  },

  // —— 주오 (W→E) ——
  "chuo:cosmosquare": {
    id: "chuo:cosmosquare",
    nameKo: "코스모스퀘어",
    code: "C10",
    lineIds: ["chuo", "nanko"],
    lng: 135.39139,
    lat: 34.64583,
    hub: true,
  },
  "chuo:osakako": {
    id: "chuo:osakako",
    nameKo: "오사카코",
    code: "C11",
    lineIds: ["chuo"],
    lng: 135.43056,
    lat: 34.65583,
  },
  "chuo:asashiobashi": {
    id: "chuo:asashiobashi",
    nameKo: "아사시오바시",
    code: "C12",
    lineIds: ["chuo"],
    lng: 135.45028,
    lat: 34.66167,
  },
  "chuo:bentencho": {
    id: "chuo:bentencho",
    nameKo: "벤텐초",
    code: "C13",
    lineIds: ["chuo"],
    lng: 135.46194,
    lat: 34.66806,
  },
  "chuo:kujo": {
    id: "chuo:kujo",
    nameKo: "쿠조",
    code: "C14",
    lineIds: ["chuo"],
    lng: 135.47361,
    lat: 34.6725,
  },
  "chuo:awaza": {
    id: "chuo:awaza",
    nameKo: "아와자",
    code: "C15",
    lineIds: ["chuo", "sennichimae"],
    lng: 135.48639,
    lat: 34.67639,
    hub: true,
  },
  "chuo:hommachi": {
    id: "chuo:hommachi",
    nameKo: "혼마치",
    code: "C16",
    lineIds: ["chuo", "midosuji", "yotsubashi"],
    lng: 135.49972,
    lat: 34.68167,
    hub: true,
  },
  "chuo:sakaisuji-hommachi": {
    id: "chuo:sakaisuji-hommachi",
    nameKo: "사카이스지혼마치",
    code: "C17",
    lineIds: ["chuo", "sakaisuji"],
    lng: 135.50639,
    lat: 34.68194,
    hub: true,
  },
  "chuo:tanimachi4": {
    id: "chuo:tanimachi4",
    nameKo: "다니마치4",
    code: "C18",
    lineIds: ["chuo", "tanimachi"],
    lng: 135.51889,
    lat: 34.68222,
    hub: true,
  },
  "chuo:morinomiya": {
    id: "chuo:morinomiya",
    nameKo: "모리노미야",
    code: "C19",
    lineIds: ["chuo", "nagahori"],
    lng: 135.53417,
    lat: 34.68139,
    hub: true,
  },
  "chuo:midoribashi": {
    id: "chuo:midoribashi",
    nameKo: "미도리바시",
    code: "C20",
    lineIds: ["chuo", "imazatosuji"],
    lng: 135.54472,
    lat: 34.68111,
  },
  "chuo:fukaebashi": {
    id: "chuo:fukaebashi",
    nameKo: "후카에바시",
    code: "C21",
    lineIds: ["chuo"],
    lng: 135.55556,
    lat: 34.68028,
  },
  "chuo:takaida": {
    id: "chuo:takaida",
    nameKo: "다카이다",
    code: "C23",
    lineIds: ["chuo"],
    lng: 135.57361,
    lat: 34.67917,
  },
  "chuo:nagata": {
    id: "chuo:nagata",
    nameKo: "나가타",
    code: "C23",
    lineIds: ["chuo"],
    lng: 135.59167,
    lat: 34.67806,
  },

  // —— 센니치마에 (W→E) ——
  "sennichimae:nodahanshin": {
    id: "sennichimae:nodahanshin",
    nameKo: "노다한신",
    code: "S11",
    lineIds: ["sennichimae"],
    lng: 135.47528,
    lat: 34.69028,
  },
  "sennichimae:tamagawa": {
    id: "sennichimae:tamagawa",
    nameKo: "다마가와",
    code: "S12",
    lineIds: ["sennichimae"],
    lng: 135.48056,
    lat: 34.68694,
  },
  "sennichimae:awaza": {
    id: "sennichimae:awaza",
    nameKo: "아와자",
    code: "S13",
    lineIds: ["sennichimae", "chuo"],
    lng: 135.48639,
    lat: 34.67639,
    hub: true,
  },
  "sennichimae:nishinagahori": {
    id: "sennichimae:nishinagahori",
    nameKo: "니시나가호리",
    code: "S14",
    lineIds: ["sennichimae", "nagahori"],
    lng: 135.49028,
    lat: 34.67167,
  },
  "sennichimae:sakuragawa": {
    id: "sennichimae:sakuragawa",
    nameKo: "사쿠라가와",
    code: "S15",
    lineIds: ["sennichimae"],
    lng: 135.49444,
    lat: 34.66806,
  },
  "sennichimae:namba": {
    id: "sennichimae:namba",
    nameKo: "난바",
    code: "S16",
    lineIds: ["sennichimae", "midosuji", "yotsubashi"],
    lng: 135.50056,
    lat: 34.66611,
    hub: true,
  },
  "sennichimae:nipponbashi": {
    id: "sennichimae:nipponbashi",
    nameKo: "닛폰바시",
    code: "S17",
    lineIds: ["sennichimae", "sakaisuji"],
    lng: 135.50611,
    lat: 34.66167,
    hub: true,
  },
  "sennichimae:tanimachi9": {
    id: "sennichimae:tanimachi9",
    nameKo: "다니마치9",
    code: "S18",
    lineIds: ["sennichimae", "tanimachi"],
    lng: 135.51806,
    lat: 34.66611,
    hub: true,
  },
  "sennichimae:tsuruhashi": {
    id: "sennichimae:tsuruhashi",
    nameKo: "쓰루하시",
    code: "S19",
    lineIds: ["sennichimae"],
    lng: 135.52972,
    lat: 34.66528,
    hub: true,
  },
  "sennichimae:imazato": {
    id: "sennichimae:imazato",
    nameKo: "이마자토",
    code: "S20",
    lineIds: ["sennichimae", "imazatosuji"],
    lng: 135.54444,
    lat: 34.6625,
    hub: true,
  },
  "sennichimae:shin-fukae": {
    id: "sennichimae:shin-fukae",
    nameKo: "신후카에",
    code: "S21",
    lineIds: ["sennichimae"],
    lng: 135.555,
    lat: 34.66111,
  },
  "sennichimae:minami-tatsumi": {
    id: "sennichimae:minami-tatsumi",
    nameKo: "미나미타쓰미",
    code: "S22",
    lineIds: ["sennichimae"],
    lng: 135.56528,
    lat: 34.65833,
  },

  // —— 사카이스지 (N→S) ——
  "sakaisuji:tenjinbashisuji6": {
    id: "sakaisuji:tenjinbashisuji6",
    nameKo: "텐진바시스지6",
    code: "K11",
    lineIds: ["sakaisuji"],
    lng: 135.51111,
    lat: 34.71028,
  },
  "sakaisuji:ogimachi": {
    id: "sakaisuji:ogimachi",
    nameKo: "오기마치",
    code: "K12",
    lineIds: ["sakaisuji"],
    lng: 135.51056,
    lat: 34.70417,
  },
  "sakaisuji:minami-morimachi": {
    id: "sakaisuji:minami-morimachi",
    nameKo: "미나미모리마치",
    code: "K13",
    lineIds: ["sakaisuji", "tanimachi"],
    lng: 135.51111,
    lat: 34.69528,
  },
  "sakaisuji:kitahama": {
    id: "sakaisuji:kitahama",
    nameKo: "기타하마",
    code: "K14",
    lineIds: ["sakaisuji"],
    lng: 135.5075,
    lat: 34.69111,
  },
  "sakaisuji:sakaisuji-hommachi": {
    id: "sakaisuji:sakaisuji-hommachi",
    nameKo: "사카이스지혼마치",
    code: "K15",
    lineIds: ["sakaisuji", "chuo"],
    lng: 135.50639,
    lat: 34.68194,
    hub: true,
  },
  "sakaisuji:nagahoribashi": {
    id: "sakaisuji:nagahoribashi",
    nameKo: "나가호리바시",
    code: "K16",
    lineIds: ["sakaisuji", "nagahori"],
    lng: 135.50556,
    lat: 34.6725,
    hub: true,
  },
  "sakaisuji:nipponbashi": {
    id: "sakaisuji:nipponbashi",
    nameKo: "닛폰바시",
    code: "K17",
    lineIds: ["sakaisuji", "sennichimae"],
    lng: 135.50611,
    lat: 34.66167,
    hub: true,
  },
  "sakaisuji:ebisucho": {
    id: "sakaisuji:ebisucho",
    nameKo: "에비스초",
    code: "K18",
    lineIds: ["sakaisuji"],
    lng: 135.5075,
    lat: 34.65444,
  },
  "sakaisuji:dobutsuen": {
    id: "sakaisuji:dobutsuen",
    nameKo: "도부쓰엔마에",
    code: "K19",
    lineIds: ["sakaisuji", "midosuji"],
    lng: 135.50806,
    lat: 34.64861,
  },
  "sakaisuji:tengachaya": {
    id: "sakaisuji:tengachaya",
    nameKo: "텐가차야",
    code: "K20",
    lineIds: ["sakaisuji"],
    lng: 135.49917,
    lat: 34.63611,
  },

  // —— 나가호리 (W→E) ——
  "nagahori:taisho": {
    id: "nagahori:taisho",
    nameKo: "다이쇼",
    code: "N11",
    lineIds: ["nagahori"],
    lng: 135.47222,
    lat: 34.65944,
  },
  "nagahori:dome-mae": {
    id: "nagahori:dome-mae",
    nameKo: "도메마에",
    code: "N12",
    lineIds: ["nagahori"],
    lng: 135.47861,
    lat: 34.66972,
  },
  "nagahori:nishinagahori": {
    id: "nagahori:nishinagahori",
    nameKo: "니시나가호리",
    code: "N13",
    lineIds: ["nagahori", "sennichimae"],
    lng: 135.49028,
    lat: 34.67167,
  },
  "nagahori:nishiohashi": {
    id: "nagahori:nishiohashi",
    nameKo: "니시오하시",
    code: "N14",
    lineIds: ["nagahori"],
    lng: 135.495,
    lat: 34.67222,
  },
  "nagahori:shinsaibashi": {
    id: "nagahori:shinsaibashi",
    nameKo: "신사이바시",
    code: "N15",
    lineIds: ["nagahori", "midosuji"],
    lng: 135.50028,
    lat: 34.67472,
    hub: true,
  },
  "nagahori:nagahoribashi": {
    id: "nagahori:nagahoribashi",
    nameKo: "나가호리바시",
    code: "N16",
    lineIds: ["nagahori", "sakaisuji"],
    lng: 135.50556,
    lat: 34.6725,
    hub: true,
  },
  "nagahori:matsuyamachi": {
    id: "nagahori:matsuyamachi",
    nameKo: "마쓰야마치",
    code: "N17",
    lineIds: ["nagahori"],
    lng: 135.51194,
    lat: 34.675,
  },
  "nagahori:tanimachi6": {
    id: "nagahori:tanimachi6",
    nameKo: "다니마치6",
    code: "N18",
    lineIds: ["nagahori", "tanimachi"],
    lng: 135.51889,
    lat: 34.67556,
  },
  "nagahori:tamatsukuri": {
    id: "nagahori:tamatsukuri",
    nameKo: "다마쓰쿠리",
    code: "N19",
    lineIds: ["nagahori"],
    lng: 135.52528,
    lat: 34.67778,
  },
  "nagahori:morinomiya": {
    id: "nagahori:morinomiya",
    nameKo: "모리노미야",
    code: "N20",
    lineIds: ["nagahori", "chuo"],
    lng: 135.53417,
    lat: 34.68139,
    hub: true,
  },
  "nagahori:gamo4": {
    id: "nagahori:gamo4",
    nameKo: "가모4",
    code: "N21",
    lineIds: ["nagahori", "imazatosuji"],
    lng: 135.54528,
    lat: 34.68861,
  },
  "nagahori:imaike": {
    id: "nagahori:imaike",
    nameKo: "이마이케",
    code: "N22",
    lineIds: ["nagahori"],
    lng: 135.54278,
    lat: 34.69611,
  },
  "nagahori:kyobashi": {
    id: "nagahori:kyobashi",
    nameKo: "교바시",
    code: "N23",
    lineIds: ["nagahori"],
    lng: 135.52861,
    lat: 34.69639,
    hub: true,
  },
  "nagahori:tsurumi-ryokuchi": {
    id: "nagahori:tsurumi-ryokuchi",
    nameKo: "쓰루미료쿠치",
    code: "N27",
    lineIds: ["nagahori"],
    lng: 135.57778,
    lat: 34.71111,
  },

  // —— 이마자토스지 (N→S) ——
  "imazatosuji:itakano": {
    id: "imazatosuji:itakano",
    nameKo: "이타카노",
    code: "I11",
    lineIds: ["imazatosuji"],
    lng: 135.54861,
    lat: 34.7125,
  },
  "imazatosuji:zuiko4": {
    id: "imazatosuji:zuiko4",
    nameKo: "즈이코4",
    code: "I14",
    lineIds: ["imazatosuji"],
    lng: 135.54694,
    lat: 34.70028,
  },
  "imazatosuji:gamo4": {
    id: "imazatosuji:gamo4",
    nameKo: "가모4",
    code: "I18",
    lineIds: ["imazatosuji", "nagahori"],
    lng: 135.54528,
    lat: 34.68861,
  },
  "imazatosuji:midoribashi": {
    id: "imazatosuji:midoribashi",
    nameKo: "미도리바시",
    code: "I19",
    lineIds: ["imazatosuji", "chuo"],
    lng: 135.54472,
    lat: 34.68111,
  },
  "imazatosuji:imazato": {
    id: "imazatosuji:imazato",
    nameKo: "이마자토",
    code: "I21",
    lineIds: ["imazatosuji", "sennichimae"],
    lng: 135.54444,
    lat: 34.6625,
    hub: true,
  },
  "imazatosuji:shimizu": {
    id: "imazatosuji:shimizu",
    nameKo: "시미즈",
    code: "I22",
    lineIds: ["imazatosuji"],
    lng: 135.54167,
    lat: 34.64861,
  },
  "imazatosuji:imaike": {
    id: "imazatosuji:imaike",
    nameKo: "이마이케",
    code: "I24",
    lineIds: ["imazatosuji"],
    lng: 135.52861,
    lat: 34.62806,
  },
  "imazatosuji:yata": {
    id: "imazatosuji:yata",
    nameKo: "야타",
    code: "I27",
    lineIds: ["imazatosuji"],
    lng: 135.52806,
    lat: 34.59944,
  },

  // —— 난코포트타운 ——
  "nanko:cosmosquare": {
    id: "nanko:cosmosquare",
    nameKo: "코스모스퀘어",
    code: "P09",
    lineIds: ["nanko", "chuo"],
    lng: 135.39139,
    lat: 34.64583,
    hub: true,
  },
  "nanko:trade-center": {
    id: "nanko:trade-center",
    nameKo: "트레이드센터",
    code: "P10",
    lineIds: ["nanko"],
    lng: 135.40833,
    lat: 34.63833,
  },
  "nanko:nakafuto": {
    id: "nanko:nakafuto",
    nameKo: "나카후토",
    code: "P11",
    lineIds: ["nanko"],
    lng: 135.42222,
    lat: 34.63806,
  },
  "nanko:port-town-nishi": {
    id: "nanko:port-town-nishi",
    nameKo: "포트타운니시",
    code: "P14",
    lineIds: ["nanko"],
    lng: 135.43056,
    lat: 34.63194,
  },
  "nanko:port-town-higashi": {
    id: "nanko:port-town-higashi",
    nameKo: "포트타운히가시",
    code: "P15",
    lineIds: ["nanko"],
    lng: 135.43889,
    lat: 34.62917,
  },
  "nanko:ferry-terminal": {
    id: "nanko:ferry-terminal",
    nameKo: "페리터미널",
    code: "P16",
    lineIds: ["nanko"],
    lng: 135.45,
    lat: 34.62111,
  },
  "nanko:suminoekoen": {
    id: "nanko:suminoekoen",
    nameKo: "스미노에코엔",
    code: "P18",
    lineIds: ["nanko", "yotsubashi"],
    lng: 135.48028,
    lat: 34.61056,
  },

  // —— JR 유메사키 ——
  "jr_yumesaki:nishikujo": {
    id: "jr_yumesaki:nishikujo",
    nameKo: "니시쿠조",
    lineIds: ["jr_yumesaki"],
    lng: 135.46694,
    lat: 34.68167,
    hub: true,
  },
  "jr_yumesaki:ajikawaguchi": {
    id: "jr_yumesaki:ajikawaguchi",
    nameKo: "아지카와구치",
    lineIds: ["jr_yumesaki"],
    lng: 135.455,
    lat: 34.675,
  },
  "jr_yumesaki:universal-city": {
    id: "jr_yumesaki:universal-city",
    nameKo: "유니버설시티",
    lineIds: ["jr_yumesaki"],
    lng: 135.4389,
    lat: 34.6678,
    hub: true,
  },
  "jr_yumesaki:sakurajima": {
    id: "jr_yumesaki:sakurajima",
    nameKo: "사쿠라지마",
    lineIds: ["jr_yumesaki"],
    lng: 135.43056,
    lat: 34.6625,
  },
};

/** Ordered station ids per line — drives accurate LineString geometry. */
export const OSAKA_METRO_LINE_PATHS: Readonly<
  Record<OsakaMetroLineId, readonly string[]>
> = {
  midosuji: [
    "midosuji:esaka",
    "midosuji:higashimikuni",
    "midosuji:shin-osaka",
    "midosuji:nishinakajima",
    "midosuji:nakatsu",
    "midosuji:umeda",
    "midosuji:yodoyabashi",
    "midosuji:hommachi",
    "midosuji:shinsaibashi",
    "midosuji:namba",
    "midosuji:daikokucho",
    "midosuji:dobutsuen",
    "midosuji:tennoji",
    "midosuji:showacho",
    "midosuji:nishitanabe",
    "midosuji:nagai",
    "midosuji:abiko",
    "midosuji:kitahanada",
    "midosuji:shinkanaoka",
    "midosuji:nakamozu",
  ],
  tanimachi: [
    "tanimachi:dainichi",
    "tanimachi:moriguchi",
    "tanimachi:taishibashi",
    "tanimachi:miyakojima",
    "tanimachi:higashi-umeda",
    "tanimachi:minami-morimachi",
    "tanimachi:temmabashi",
    "tanimachi:tanimachi4",
    "tanimachi:tanimachi6",
    "tanimachi:tanimachi9",
    "tanimachi:shitennouji",
    "tanimachi:tennoji",
    "tanimachi:abeno",
    "tanimachi:yaominami",
  ],
  yotsubashi: [
    "yotsubashi:nishi-umeda",
    "yotsubashi:higobashi",
    "yotsubashi:hommachi",
    "yotsubashi:yotsubashi",
    "yotsubashi:namba",
    "yotsubashi:daikokucho",
    "yotsubashi:hanazonocho",
    "yotsubashi:kishinosato",
    "yotsubashi:tamade",
    "yotsubashi:suminoekoen",
  ],
  chuo: [
    "chuo:cosmosquare",
    "chuo:osakako",
    "chuo:asashiobashi",
    "chuo:bentencho",
    "chuo:kujo",
    "chuo:awaza",
    "chuo:hommachi",
    "chuo:sakaisuji-hommachi",
    "chuo:tanimachi4",
    "chuo:morinomiya",
    "chuo:midoribashi",
    "chuo:fukaebashi",
    "chuo:takaida",
    "chuo:nagata",
  ],
  sennichimae: [
    "sennichimae:nodahanshin",
    "sennichimae:tamagawa",
    "sennichimae:awaza",
    "sennichimae:nishinagahori",
    "sennichimae:sakuragawa",
    "sennichimae:namba",
    "sennichimae:nipponbashi",
    "sennichimae:tanimachi9",
    "sennichimae:tsuruhashi",
    "sennichimae:imazato",
    "sennichimae:shin-fukae",
    "sennichimae:minami-tatsumi",
  ],
  sakaisuji: [
    "sakaisuji:tenjinbashisuji6",
    "sakaisuji:ogimachi",
    "sakaisuji:minami-morimachi",
    "sakaisuji:kitahama",
    "sakaisuji:sakaisuji-hommachi",
    "sakaisuji:nagahoribashi",
    "sakaisuji:nipponbashi",
    "sakaisuji:ebisucho",
    "sakaisuji:dobutsuen",
    "sakaisuji:tengachaya",
  ],
  nagahori: [
    "nagahori:taisho",
    "nagahori:dome-mae",
    "nagahori:nishinagahori",
    "nagahori:nishiohashi",
    "nagahori:shinsaibashi",
    "nagahori:nagahoribashi",
    "nagahori:matsuyamachi",
    "nagahori:tanimachi6",
    "nagahori:tamatsukuri",
    "nagahori:morinomiya",
    "nagahori:gamo4",
    "nagahori:imaike",
    "nagahori:kyobashi",
    "nagahori:tsurumi-ryokuchi",
  ],
  imazatosuji: [
    "imazatosuji:itakano",
    "imazatosuji:zuiko4",
    "imazatosuji:gamo4",
    "imazatosuji:midoribashi",
    "imazatosuji:imazato",
    "imazatosuji:shimizu",
    "imazatosuji:imaike",
    "imazatosuji:yata",
  ],
  nanko: [
    "nanko:cosmosquare",
    "nanko:trade-center",
    "nanko:nakafuto",
    "nanko:port-town-nishi",
    "nanko:port-town-higashi",
    "nanko:ferry-terminal",
    "nanko:suminoekoen",
  ],
  jr_yumesaki: [
    "jr_yumesaki:nishikujo",
    "jr_yumesaki:ajikawaguchi",
    "jr_yumesaki:universal-city",
    "jr_yumesaki:sakurajima",
  ],
};

export const OSAKA_METRO_STATIONS: readonly OsakaMetroStation[] = Object.values(
  OSAKA_METRO_STATION_BY_ID,
);

/** Common Hangul spelling variants for tourist station names. */
const OSAKA_STATION_NAME_ALIASES: Readonly<Record<string, string>> = {
  모리노미아: "모리노미야",
  모리노미야: "모리노미야",
  morinomiya: "모리노미야",
  텐노지: "덴노지",
  신사이바시: "신사이바시",
  혼마치: "혼마치",
  혼쪼: "혼마치",
};

function normalizeStationLookupKey(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/gu, "")
    .replace(/(?:역|駅|station)$/iu, "")
    .toLowerCase();
}

/**
 * Resolve Osaka Metro / JR Yumesaki station from NL (incl. Hangul aliases).
 * Used when world-geo catalog misses a tourist station name.
 */
export function resolveOsakaMetroStationFromText(
  text: string,
): OsakaMetroStation | null {
  const raw = text.trim();
  if (!raw) return null;

  const named = raw.match(/([가-힣A-Za-z0-9·]+)역/u)?.[1] ?? raw;
  const key = normalizeStationLookupKey(named);
  if (!key) return null;

  const aliasTarget =
    OSAKA_STATION_NAME_ALIASES[key] ??
    OSAKA_STATION_NAME_ALIASES[named.trim()] ??
    null;
  const targets = new Set<string>(
    [key, aliasTarget, aliasTarget ? normalizeStationLookupKey(aliasTarget) : null].filter(
      (v): v is string => Boolean(v),
    ),
  );

  let best: OsakaMetroStation | null = null;
  for (const station of OSAKA_METRO_STATIONS) {
    const nameKey = normalizeStationLookupKey(station.nameKo);
    if (targets.has(nameKey)) {
      // Prefer hub duplicate (e.g. chuo:morinomiya) when same name exists twice
      if (!best || (station.hub && !best.hub)) best = station;
      continue;
    }
    if (
      !best &&
      (nameKey.includes(key) || key.includes(nameKey)) &&
      key.length >= 2 &&
      nameKey.length >= 2
    ) {
      best = station;
    }
  }
  return best;
}

export function stationsForVisibleLines(
  visibleLineIds: readonly OsakaMetroLineId[],
  opts?: { readonly hubsOnly?: boolean },
): readonly OsakaMetroStation[] {
  if (visibleLineIds.length === 0) return [];
  const set = new Set(visibleLineIds);
  const seen = new Set<string>();
  const out: OsakaMetroStation[] = [];
  for (const s of OSAKA_METRO_STATIONS) {
    if (opts?.hubsOnly && !s.hub) continue;
    if (!s.lineIds.some((id) => set.has(id))) continue;
    const key = `${s.nameKo}:${s.lng.toFixed(4)}:${s.lat.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/** Midpoint of a line path — for on-map line name label. */
export function linePathMidpoint(
  lineId: OsakaMetroLineId,
): readonly [number, number] | null {
  const path = OSAKA_METRO_LINE_PATHS[lineId];
  if (!path?.length) return null;
  const mid = path[Math.floor(path.length / 2)]!;
  const s = OSAKA_METRO_STATION_BY_ID[mid];
  if (!s) return null;
  return [s.lng, s.lat];
}

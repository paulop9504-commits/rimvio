/**
 * Seoul Metro SSOT — Lines 1–9 (curated interchange analytics).
 */

export type SeoulTransitLineId =
  | "line-1"
  | "line-2"
  | "line-3"
  | "line-4"
  | "line-5"
  | "line-6"
  | "line-7"
  | "line-8"
  | "line-9";

export type SeoulTransitStation = {
  readonly id: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly lat: number;
  readonly lng: number;
  readonly lines: readonly SeoulTransitLineId[];
};

export const SEOUL_TRANSIT_LINE_LABEL_KO: Record<SeoulTransitLineId, string> = {
  "line-1": "1호선",
  "line-2": "2호선",
  "line-3": "3호선",
  "line-4": "4호선",
  "line-5": "5호선",
  "line-6": "6호선",
  "line-7": "7호선",
  "line-8": "8호선",
  "line-9": "9호선",
};

export const SEOUL_TRANSIT_STATIONS: readonly SeoulTransitStation[] = [
  {
    id: "sadang",
    nameKo: "사당",
    nameEn: "Sadang",
    lat: 37.4765,
    lng: 126.9816,
    lines: ["line-2", "line-3", "line-4"],
  },
  {
    id: "express-bus-terminal",
    nameKo: "고속터미널",
    nameEn: "Express Bus Terminal",
    lat: 37.5045,
    lng: 127.0049,
    lines: ["line-3", "line-7", "line-9"],
  },
  {
    id: "jongno-3ga",
    nameKo: "종로3가",
    nameEn: "Jongno 3-ga",
    lat: 37.5714,
    lng: 126.9918,
    lines: ["line-1", "line-3", "line-5"],
  },
  {
    id: "euljiro-3ga",
    nameKo: "을지로3가",
    nameEn: "Euljiro 3-ga",
    lat: 37.5664,
    lng: 126.9919,
    lines: ["line-2", "line-3", "line-5"],
  },
  {
    id: "gangnam",
    nameKo: "강남",
    nameEn: "Gangnam",
    lat: 37.4979,
    lng: 127.0276,
    lines: ["line-2"],
  },
  {
    id: "hongdae",
    nameKo: "홍대입구",
    nameEn: "Hongik Univ.",
    lat: 37.5572,
    lng: 126.9244,
    lines: ["line-2"],
  },
  {
    id: "myeongdong",
    nameKo: "명동",
    nameEn: "Myeongdong",
    lat: 37.5609,
    lng: 126.9863,
    lines: ["line-4"],
  },
  {
    id: "seoul-station",
    nameKo: "서울역",
    nameEn: "Seoul Station",
    lat: 37.5547,
    lng: 126.9707,
    lines: ["line-1", "line-4"],
  },
  {
    id: "city-hall",
    nameKo: "시청",
    nameEn: "City Hall",
    lat: 37.5647,
    lng: 126.977,
    lines: ["line-1", "line-2"],
  },
  {
    id: "gwanghwamun",
    nameKo: "광화문",
    nameEn: "Gwanghwamun",
    lat: 37.571,
    lng: 126.9768,
    lines: ["line-5"],
  },
  {
    id: "sinchon",
    nameKo: "신촌",
    nameEn: "Sinchon",
    lat: 37.5558,
    lng: 126.9369,
    lines: ["line-2"],
  },
];

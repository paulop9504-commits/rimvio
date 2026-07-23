import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

/**
 * Offline / demo lodging names + coords only — KR · JP · SEA · HK · TW · worldwide.
 * Never attach Unsplash, stock stills, or sample MP4s. Venue media must come from
 * LiteAPI / Google Places (identity-scored) only; mock rows stay media-empty.
 */
const NO_MEDIA: readonly string[] = [];

function stampMockProvider(
  row: Omit<ContextLodgingInventoryRow, "provider" | "photoSource" | "photoConfidence"> &
    Partial<
      Pick<ContextLodgingInventoryRow, "provider" | "photoSource" | "photoConfidence">
    >,
): ContextLodgingInventoryRow {
  return {
    ...row,
    images: NO_MEDIA,
    videoUrl: null,
    provider: "mock",
    photoSource: "mock",
    photoConfidence: "mock",
  };
}

/** Demo inventory — Hongdae / Mapo regression + screenshot parity. */
export function resolveLodgingMockNearUser(input: {
  lat: number;
  lng: number;
}): readonly ContextLodgingInventoryRow[] {
  const isSeoulMetro =
    input.lat >= 37.42 &&
    input.lat <= 37.65 &&
    input.lng >= 126.85 &&
    input.lng <= 127.12;

  if (isSeoulMetro) {
    const mLat = (m: number) => m / 111_320;
    const mLng = (m: number) => m / (111_320 * Math.cos((input.lat * Math.PI) / 180));
    return [
      stampMockProvider({
        placeId: "hh-guesthouse",
        name: "홍대 게스트하우스",
        lat: input.lat + mLat(120),
        lng: input.lng + mLng(85),
        priceKrw: 65_000,
        partnerLabel: "demo",
        images: NO_MEDIA,
        videoUrl: null,
      }),
      stampMockProvider({
        placeId: "hh-han-river",
        name: "한강뷰 레지던스",
        lat: input.lat + mLat(290),
        lng: input.lng - mLng(140),
        priceKrw: 95_000,
        partnerLabel: "demo",
        images: NO_MEDIA,
        videoUrl: null,
      }),
      stampMockProvider({
        placeId: "hh-myeongdong",
        name: "명동 시티호텔",
        lat: input.lat - mLat(180),
        lng: input.lng + mLng(320),
        priceKrw: 120_000,
        partnerLabel: "demo",
        images: NO_MEDIA,
        videoUrl: null,
      }),
      stampMockProvider({
        placeId: "hh-gangnam",
        name: "강남 비즈니스",
        lat: input.lat - mLat(350),
        lng: input.lng - mLng(60),
        priceKrw: 89_000,
        partnerLabel: "demo",
        images: NO_MEDIA,
        videoUrl: null,
      }),
    ];
  }

  return resolveLodgingMockForPlace("근처", input);
}

/** Demo inventory — absolute coords for 대전 regression tests. */
export const DAEJEON_LODGING_MOCK: readonly ContextLodgingInventoryRow[] = [
  stampMockProvider({
    placeId: "dj-yuseong-spa",
    name: "유성온천 스파 호텔",
    lat: 36.3554,
    lng: 127.2983,
    priceKrw: 89000,
    partnerLabel: "demo",
    images: NO_MEDIA,
    videoUrl: null,
  }),
  stampMockProvider({
    placeId: "dj-station-central",
    name: "대전역 센트럴 스테이",
    lat: 36.3325,
    lng: 127.4347,
    priceKrw: 72000,
    partnerLabel: "demo",
    images: NO_MEDIA,
    videoUrl: null,
  }),
  stampMockProvider({
    placeId: "dj-kaist-inn",
    name: "카이스트 인근 게스트하우스",
    lat: 36.3741,
    lng: 127.3604,
    priceKrw: 54000,
    partnerLabel: "demo",
    images: NO_MEDIA,
    videoUrl: null,
  }),
  stampMockProvider({
    placeId: "dj-expo-lake",
    name: "엑스포 호수뷰 펜션",
    lat: 36.3892,
    lng: 127.4121,
    priceKrw: 98000,
    partnerLabel: "demo",
    images: NO_MEDIA,
    videoUrl: null,
  }),
  stampMockProvider({
    placeId: "dj-sintanjin-rest",
    name: "신탄진 휴게 스테이",
    lat: 36.4568,
    lng: 127.3055,
    priceKrw: 61000,
    partnerLabel: "demo",
    images: NO_MEDIA,
    videoUrl: null,
  }),
];

type LodgingMockTemplate = {
  id: string;
  name: string;
  dLat: number;
  dLng: number;
  priceKrw: number;
};

const LODGING_MOCK_TEMPLATES: readonly LodgingMockTemplate[] = [
  { id: "spa", name: "스파 호텔", dLat: 0.018, dLng: -0.012, priceKrw: 89000 },
  { id: "central", name: "센트럴 스테이", dLat: -0.008, dLng: 0.022, priceKrw: 72000 },
  { id: "guest", name: "게스트하우스", dLat: 0.012, dLng: 0.008, priceKrw: 54000 },
  { id: "view", name: "뷰 펜션", dLat: 0.025, dLng: 0.015, priceKrw: 98000 },
  { id: "rest", name: "휴게 스테이", dLat: -0.015, dLng: -0.018, priceKrw: 61000 },
];

const JAPAN_LODGING_TEMPLATES: readonly LodgingMockTemplate[] = [
  { id: "jp-shinjuku", name: "新宿ステイ", dLat: 0.012, dLng: -0.008, priceKrw: 125_000 },
  { id: "jp-shibuya", name: "渋谷ビューホテル", dLat: -0.009, dLng: 0.014, priceKrw: 142_000 },
  { id: "jp-ginza", name: "銀座シティホテル", dLat: 0.006, dLng: 0.019, priceKrw: 168_000 },
  { id: "jp-asakusa", name: "浅草ゲストハウス", dLat: 0.018, dLng: -0.016, priceKrw: 78_000 },
  { id: "jp-ikebukuro", name: "池袋レジデンス", dLat: -0.014, dLng: -0.011, priceKrw: 96_000 },
  { id: "jp-osaka-capsule-namba", name: "난바 캡슐호텔", dLat: 0.004, dLng: 0.003, priceKrw: 22_000 },
  { id: "jp-osaka-capsule-inn", name: "Capsule Inn Osaka", dLat: 0.002, dLng: -0.002, priceKrw: 24_000 },
  {
    id: "jp-osaka-capsule-daitoyo",
    name: "사우나&캡슐호텔 다이토요",
    dLat: -0.003,
    dLng: 0.004,
    priceKrw: 26_000,
  },
  {
    id: "jp-osaka-capsule-dotonbori",
    name: "도톤보리 캡슐호텔",
    dLat: -0.005,
    dLng: 0.006,
    priceKrw: 23_000,
  },
  {
    id: "jp-osaka-capsule-shinsaibashi",
    name: "신사이바시 캡슐 인",
    dLat: 0.001,
    dLng: 0.008,
    priceKrw: 27_000,
  },
  { id: "jp-osaka-capsule-umeda", name: "우메다 캡슐 인", dLat: 0.011, dLng: -0.005, priceKrw: 28_000 },
  {
    id: "jp-osaka-hostel",
    name: "도톤보리 게스트하우스",
    dLat: -0.006,
    dLng: 0.007,
    priceKrw: 25_000,
  },
];

function isJapanTravelPlace(placeLabel: string, anchor: { lat: number; lng: number }): boolean {
  if (
    /東京|tokyo|오사카|osaka|교토|kyoto|후쿠오카|fukuoka|일본|japan|신주쿠|shinjuku|시부야|shibuya|나라|nara|홋카이도|hokkaido|삿포로|sapporo|나고야|nagoya/iu.test(
      placeLabel,
    )
  ) {
    return true;
  }
  return (
    anchor.lat >= 33.5 &&
    anchor.lat <= 43.5 &&
    anchor.lng >= 129 &&
    anchor.lng <= 146
  );
}

function mapLodgingMockTemplates(
  templates: readonly LodgingMockTemplate[],
  anchor: { lat: number; lng: number },
  placeIdPrefix: string,
): readonly ContextLodgingInventoryRow[] {
  return templates.map((template, index) =>
    stampMockProvider({
      placeId: `${placeIdPrefix}:${template.id}:${anchor.lat.toFixed(3)}:${index}`,
      name: template.name,
      lat: anchor.lat + template.dLat,
      lng: anchor.lng + template.dLng,
      priceKrw: template.priceKrw,
      partnerLabel: "demo",
      images: NO_MEDIA,
      videoUrl: null,
    }),
  );
}

/** Hub factory mock — spread around context destination, not hardcoded 대전. */
export function resolveLodgingMockForPlace(
  placeLabel: string,
  anchor: { lat: number; lng: number },
): readonly ContextLodgingInventoryRow[] {
  const place = placeLabel.trim();
  if (
    /대전|유성|신탄진|kaist|카이스트/iu.test(place) &&
    !isJapanTravelPlace(place, anchor)
  ) {
    return DAEJEON_LODGING_MOCK;
  }

  if (isJapanTravelPlace(place, anchor)) {
    return mapLodgingMockTemplates(JAPAN_LODGING_TEMPLATES, anchor, "jp");
  }

  const prefix = place.slice(0, 12) || "숙소";
  return LODGING_MOCK_TEMPLATES.map((template, index) =>
    stampMockProvider({
      placeId: `${template.id}:${anchor.lat.toFixed(3)}:${index}`,
      name: `${prefix} ${template.name}`,
      lat: anchor.lat + template.dLat,
      lng: anchor.lng + template.dLng,
      priceKrw: template.priceKrw,
      partnerLabel: "demo",
      images: NO_MEDIA,
      videoUrl: null,
    }),
  );
}

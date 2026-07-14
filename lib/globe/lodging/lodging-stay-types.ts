/**
 * Accommodation taxonomy SSOT — hierarchical Resolve Target for Intent Replace.
 *
 * Accommodation
 * ├── Hotel (luxury · business · boutique · resort · airport · capsule · residence)
 * ├── Traditional (ryokan · hanok · machiya · temple stay)
 * ├── Budget (guesthouse · hostel · dormitory · motel)
 * ├── Vacation Rental (pension · villa · pool villa · condo · apartment · airbnb)
 * ├── Nature (lodge · cabin · camping · glamping · caravan)
 * └── Local Stay (homestay · farm stay · B&B)
 *
 * Fine stay type drives search keyword + inventory filter; coarse band keeps legacy wire.
 */

export const LODGING_STAY_BRANCHES = [
  "hotel",
  "traditional",
  "budget",
  "vacation_rental",
  "nature",
  "local_stay",
] as const;

export type LodgingStayBranch = (typeof LODGING_STAY_BRANCHES)[number];

export const LODGING_STAY_TYPES = [
  // Hotel
  "hotel",
  "luxury_hotel",
  "business_hotel",
  "boutique_hotel",
  "resort",
  "airport_hotel",
  "capsule",
  "residence_hotel",
  // Traditional
  "ryokan",
  "hanok",
  "machiya",
  "temple_stay",
  // Budget
  "guesthouse",
  "hostel",
  "dormitory",
  "motel",
  // Vacation rental
  "pension",
  "villa",
  "pool_villa",
  "condo",
  "apartment",
  "airbnb",
  // Nature
  "lodge",
  "cabin",
  "campsite",
  "glamping",
  "caravan",
  // Local stay
  "homestay",
  "farmstay",
  "bnb",
] as const;

export type LodgingStayType = (typeof LODGING_STAY_TYPES)[number];

/** Legacy discovery band — budget / provider routing. */
export type LodgingStayBand = "hotel" | "airbnb" | "hostel" | "any";

export type LodgingStayTypeEntry = {
  readonly id: LodgingStayType;
  readonly branch: LodgingStayBranch;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly summaryKo: string;
  /** Places / inventory text-search query */
  readonly searchKeywordKo: string;
  /** Match order: first hit wins (more specific first) */
  readonly cues: RegExp;
  /** Inventory name/address match */
  readonly filterSignal: RegExp;
  readonly band: LodgingStayBand;
};

/**
 * Catalog order = parse specificity. Specific before generic.
 * 「캡슐호텔」 / 「공항 호텔」 must beat bare 「호텔」.
 */
export const LODGING_STAY_TYPE_CATALOG: readonly LodgingStayTypeEntry[] = [
  // ── Hotel (specific) ─────────────────────────────────────────
  {
    id: "capsule",
    branch: "hotel",
    labelKo: "캡슐호텔",
    labelEn: "Capsule Hotel",
    summaryKo: "캡슐형 개인 공간",
    searchKeywordKo: "캡슐호텔",
    cues: /캡슐\s*호텔|capsule\s*hotel|capsule/iu,
    filterSignal: /캡슐|capsule/iu,
    band: "hostel",
  },
  {
    id: "airport_hotel",
    branch: "hotel",
    labelKo: "공항 호텔",
    labelEn: "Airport Hotel",
    summaryKo: "공항 인접",
    searchKeywordKo: "공항 호텔",
    cues: /공항\s*호텔|공항\s*근처\s*호텔|airport\s*hotel/iu,
    filterSignal: /공항\s*호텔|airport\s*hotel/iu,
    band: "hotel",
  },
  {
    id: "residence_hotel",
    branch: "hotel",
    labelKo: "레지던스 호텔",
    labelEn: "Residence Hotel",
    summaryKo: "호텔+아파트 · 장기",
    searchKeywordKo: "레지던스 호텔",
    cues: /레지던스\s*호텔|서비스드\s*아파트|residence\s*hotel|aparthotel|serviced\s*apartment/iu,
    filterSignal: /레지던스|aparthotel|serviced\s*apartment/iu,
    band: "hotel",
  },
  {
    id: "luxury_hotel",
    branch: "hotel",
    labelKo: "럭셔리 호텔",
    labelEn: "Luxury Hotel",
    summaryKo: "최고급 서비스",
    searchKeywordKo: "5성급 호텔",
    cues: /럭셔리\s*호텔|5\s*성급|특급\s*호텔|luxury\s*hotel|five\s*star/iu,
    filterSignal: /럭셔리|5성|특급|luxury|hilton|hyatt|marriott|ritz/iu,
    band: "hotel",
  },
  {
    id: "boutique_hotel",
    branch: "hotel",
    labelKo: "부티크 호텔",
    labelEn: "Boutique Hotel",
    summaryKo: "개성·소규모",
    searchKeywordKo: "부티크 호텔",
    cues: /부티크\s*호텔|부티크|boutique\s*hotel|\bboutique\b/iu,
    filterSignal: /부티크|boutique/iu,
    band: "hotel",
  },
  {
    id: "business_hotel",
    branch: "hotel",
    labelKo: "비즈니스 호텔",
    labelEn: "Business Hotel",
    summaryKo: "출장·업무 편의",
    searchKeywordKo: "비즈니스 호텔",
    cues: /비즈니스\s*호텔|비지니스\s*호텔|business\s*hotel|시티\s*호텔/iu,
    filterSignal: /비즈니스|비지니스|business\s*hotel|시티\s*호텔/iu,
    band: "hotel",
  },
  {
    id: "resort",
    branch: "hotel",
    labelKo: "리조트",
    labelEn: "Resort Hotel",
    summaryKo: "휴양 중심",
    searchKeywordKo: "리조트",
    cues: /리조트\s*호텔|리조트|resort\s*hotel|\bresort\b/iu,
    filterSignal: /리조트|resort/iu,
    band: "hotel",
  },
  // ── Traditional ──────────────────────────────────────────────
  {
    id: "temple_stay",
    branch: "traditional",
    labelKo: "템플스테이",
    labelEn: "Temple Stay",
    summaryKo: "사찰 체험",
    searchKeywordKo: "템플스테이",
    cues: /템플\s*스테이|temple\s*stay|사찰\s*숙박/iu,
    filterSignal: /템플|사찰|temple\s*stay/iu,
    band: "any",
  },
  {
    id: "machiya",
    branch: "traditional",
    labelKo: "마치야",
    labelEn: "Machiya",
    summaryKo: "일본 전통 목조 가옥",
    searchKeywordKo: "마치야",
    cues: /마치야|machiya|町家/iu,
    filterSignal: /마치야|machiya|町家/iu,
    band: "airbnb",
  },
  {
    id: "hanok",
    branch: "traditional",
    labelKo: "한옥스테이",
    labelEn: "Hanok Stay",
    summaryKo: "한국 전통 숙소",
    searchKeywordKo: "한옥스테이",
    cues: /한옥\s*스테이|한옥|hanok/iu,
    filterSignal: /한옥|hanok/iu,
    band: "airbnb",
  },
  {
    id: "ryokan",
    branch: "traditional",
    labelKo: "료칸",
    labelEn: "Ryokan",
    summaryKo: "일본 전통 숙소",
    searchKeywordKo: "료칸",
    cues: /료칸|ryokan|旅館/iu,
    filterSignal: /료칸|ryokan|旅館/iu,
    band: "hotel",
  },
  // ── Vacation rental (specific before apartment) ──────────────
  {
    id: "pool_villa",
    branch: "vacation_rental",
    labelKo: "풀빌라",
    labelEn: "Pool Villa",
    summaryKo: "독립 수영장",
    searchKeywordKo: "풀빌라",
    cues: /풀\s*빌라|private\s*pool|pool\s*villa/iu,
    filterSignal: /풀\s*빌라|pool\s*villa|private\s*pool/iu,
    band: "airbnb",
  },
  {
    id: "villa",
    branch: "vacation_rental",
    labelKo: "빌라",
    labelEn: "Villa",
    summaryKo: "단독 휴양 숙소",
    searchKeywordKo: "빌라",
    cues: /빌라(?!\s*호텔)|(?<!풀\s*)villa(?!\s*hotel)/iu,
    filterSignal: /빌라|\bvilla\b/iu,
    band: "airbnb",
  },
  {
    id: "airbnb",
    branch: "vacation_rental",
    labelKo: "에어비앤비",
    labelEn: "Airbnb",
    summaryKo: "단기 임대 숙소",
    searchKeywordKo: "에어비앤비",
    cues: /에어\s*비\s*앤\s*비|에어비앤비|\bairbnb\b/iu,
    filterSignal: /에어비앤비|airbnb/iu,
    band: "airbnb",
  },
  {
    id: "condo",
    branch: "vacation_rental",
    labelKo: "콘도",
    labelEn: "Condo",
    summaryKo: "취사 가능",
    searchKeywordKo: "콘도미니엄",
    cues: /콘도미니엄|콘도|condominium|\bcondo\b/iu,
    filterSignal: /콘도|condo|condominium/iu,
    band: "airbnb",
  },
  {
    id: "apartment",
    branch: "vacation_rental",
    labelKo: "아파트",
    labelEn: "Apartment",
    summaryKo: "취사·세탁 가능",
    searchKeywordKo: "아파트 숙소",
    cues: /아파트\s*숙소|임대\s*아파트|\bapartment\b(?!\s*hotel)/iu,
    filterSignal: /아파트|apartment/iu,
    band: "airbnb",
  },
  {
    id: "pension",
    branch: "vacation_rental",
    labelKo: "펜션",
    labelEn: "Pension",
    summaryKo: "가족·단체",
    searchKeywordKo: "펜션",
    cues: /펜션|pension/iu,
    filterSignal: /펜션|pension/iu,
    band: "airbnb",
  },
  // ── Nature ───────────────────────────────────────────────────
  {
    id: "glamping",
    branch: "nature",
    labelKo: "글램핑",
    labelEn: "Glamping",
    summaryKo: "럭셔리 캠핑",
    searchKeywordKo: "글램핑",
    cues: /글램핑|glamping/iu,
    filterSignal: /글램핑|glamping/iu,
    band: "any",
  },
  {
    id: "caravan",
    branch: "nature",
    labelKo: "카라반",
    labelEn: "Caravan",
    summaryKo: "이동식 숙소",
    searchKeywordKo: "카라반",
    cues: /카라반|캠핑카|\bRV\b|caravan|motorhome/iu,
    filterSignal: /카라반|캠핑카|\bRV\b|caravan|motorhome/iu,
    band: "any",
  },
  {
    id: "campsite",
    branch: "nature",
    labelKo: "캠핑장",
    labelEn: "Camping",
    summaryKo: "직접 텐트 설치",
    searchKeywordKo: "캠핑장",
    cues: /캠핑장|오토\s*캠핑|캠핑(?!\s*카)|campground|campsite|\bcamping\b/iu,
    filterSignal: /캠핑장|오토캠핑|campground|campsite/iu,
    band: "any",
  },
  {
    id: "cabin",
    branch: "nature",
    labelKo: "오두막",
    labelEn: "Cabin",
    summaryKo: "숲속 숙소",
    searchKeywordKo: "통나무집",
    cues: /오두막|통나무|산장|cabin|chalet|mountain\s*hut/iu,
    filterSignal: /오두막|통나무|산장|cabin|chalet/iu,
    band: "airbnb",
  },
  {
    id: "lodge",
    branch: "nature",
    labelKo: "로지",
    labelEn: "Lodge",
    summaryKo: "자연 속 숙소",
    searchKeywordKo: "로지",
    cues: /로지|lodge(?!\s*hotel)/iu,
    filterSignal: /\blodge\b|로지/iu,
    band: "hotel",
  },
  // ── Local stay ───────────────────────────────────────────────
  {
    id: "farmstay",
    branch: "local_stay",
    labelKo: "팜스테이",
    labelEn: "Farm Stay",
    summaryKo: "농촌 체험",
    searchKeywordKo: "팜스테이",
    cues: /팜\s*스테이|농촌\s*체험|farm\s*stay|farmstay/iu,
    filterSignal: /팜\s*스테이|farm\s*stay|농촌/iu,
    band: "airbnb",
  },
  {
    id: "homestay",
    branch: "local_stay",
    labelKo: "홈스테이",
    labelEn: "Homestay",
    summaryKo: "현지 가정 숙박",
    searchKeywordKo: "홈스테이",
    cues: /홈\s*스테이|homestay|home\s*stay/iu,
    filterSignal: /홈\s*스테이|homestay/iu,
    band: "airbnb",
  },
  {
    id: "bnb",
    branch: "local_stay",
    labelKo: "민박",
    labelEn: "B&B",
    summaryKo: "B&B · 조식",
    searchKeywordKo: "민박",
    cues: /민박|비앤비|B\s*&\s*B|bed\s*and\s*breakfast|\bbnb\b/iu,
    filterSignal: /민박|B&B|bnb|bed\s*and\s*breakfast/iu,
    band: "airbnb",
  },
  // ── Budget ───────────────────────────────────────────────────
  {
    id: "dormitory",
    branch: "budget",
    labelKo: "도미토리",
    labelEn: "Dormitory",
    summaryKo: "다인실 중심",
    searchKeywordKo: "도미토리",
    cues: /도미토리|dormitory|\bdorm\b/iu,
    filterSignal: /도미토리|dormitory|\bdorm\b/iu,
    band: "hostel",
  },
  {
    id: "guesthouse",
    branch: "budget",
    labelKo: "게스트하우스",
    labelEn: "Guesthouse",
    summaryKo: "저렴 · 공용 공간",
    searchKeywordKo: "게스트하우스",
    cues: /게스트\s*하우스|게스트하우스|guesthouse|guest\s*house/iu,
    filterSignal:
      /게스트\s*하우스|게스트하우스|guesthouse|guest\s*house|backpacker/iu,
    band: "hostel",
  },
  {
    id: "hostel",
    branch: "budget",
    labelKo: "호스텔",
    labelEn: "Hostel",
    summaryKo: "배낭·유스",
    searchKeywordKo: "호스텔",
    cues: /호스텔|유스\s*호스텔|hostel|youth\s*hostel/iu,
    filterSignal: /호스텔|hostel|youth\s*hostel/iu,
    band: "hostel",
  },
  {
    id: "motel",
    branch: "budget",
    labelKo: "모텔",
    labelEn: "Motel",
    summaryKo: "자동차 여행",
    searchKeywordKo: "모텔",
    cues: /모텔|motel/iu,
    filterSignal: /모텔|motel/iu,
    band: "hotel",
  },
  // ── Hotel generic (last) ─────────────────────────────────────
  {
    id: "hotel",
    branch: "hotel",
    labelKo: "호텔",
    labelEn: "Hotel",
    summaryKo: "일반 숙박",
    searchKeywordKo: "호텔",
    cues: /호텔|hotel|宿泊|ホテル/iu,
    filterSignal: /호텔|hotel|ホテル/iu,
    band: "hotel",
  },
] as const;

const BY_ID = new Map(
  LODGING_STAY_TYPE_CATALOG.map((row) => [row.id, row] as const),
);

/** @deprecated Prefer `condo` — alias for older specs / messages. */
export const LODGING_STAY_TYPE_ALIASES: Readonly<
  Record<string, LodgingStayType>
> = {
  condominium: "condo",
  serviced_apartment: "residence_hotel",
  mountain_hut: "cabin",
};

/** Union of all lodging nouns for domain cue. */
export const LODGING_STAY_ENTITY_SOURCE = LODGING_STAY_TYPE_CATALOG.map(
  (row) => row.cues.source,
)
  .concat([
    String.raw`숙소|숙박|lodging|accommodation|stay\b|inn\b|宿`,
  ])
  .join("|");

export const LODGING_STAY_ENTITY_RE = new RegExp(
  `(?:${LODGING_STAY_ENTITY_SOURCE})`,
  "iu",
);

export function normalizeLodgingStayType(
  id: string | null | undefined,
): LodgingStayType | null {
  if (!id) {
    return null;
  }
  if (BY_ID.has(id as LodgingStayType)) {
    return id as LodgingStayType;
  }
  return LODGING_STAY_TYPE_ALIASES[id] ?? null;
}

export function getLodgingStayTypeEntry(
  id: LodgingStayType | string | null | undefined,
): LodgingStayTypeEntry | null {
  const normalized = normalizeLodgingStayType(id ?? null);
  if (!normalized) {
    return null;
  }
  return BY_ID.get(normalized) ?? null;
}

export function lodgingStayTypeBranch(
  id: LodgingStayType | null | undefined,
): LodgingStayBranch | null {
  return getLodgingStayTypeEntry(id)?.branch ?? null;
}

/** First matching stay type (catalog order = specificity). */
export function parseLodgingStayTypeFromText(
  text: string,
): LodgingStayType | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  for (const row of LODGING_STAY_TYPE_CATALOG) {
    if (row.cues.test(trimmed)) {
      return row.id;
    }
  }
  if (/숙소|숙박|lodging|accommodation/iu.test(trimmed)) {
    return null;
  }
  return null;
}

export function lodgingStayTypeToBand(
  stayType: LodgingStayType | null | undefined,
): LodgingStayBand {
  if (!stayType) {
    return "any";
  }
  return getLodgingStayTypeEntry(stayType)?.band ?? "any";
}

/**
 * Different fine types → Replace (Intent Relationship).
 * Same branch siblings (guesthouse → hostel) also replace.
 */
export function lodgingStayTypesConflict(
  a: LodgingStayType | string | null | undefined,
  b: LodgingStayType | string | null | undefined,
): boolean {
  const left = normalizeLodgingStayType(a ?? null);
  const right = normalizeLodgingStayType(b ?? null);
  if (!left || !right || left === right) {
    return false;
  }
  return true;
}

export function resolveLodgingStaySearchKeyword(input: {
  stayType?: LodgingStayType | null;
  lodgingKind?: LodgingStayBand | null;
  message?: string | null;
}): string | null {
  const fromMessage = parseLodgingStayTypeFromText(input.message ?? "");
  const stay = fromMessage ?? normalizeLodgingStayType(input.stayType) ?? null;
  if (stay) {
    return BY_ID.get(stay)?.searchKeywordKo ?? null;
  }
  if (input.lodgingKind === "hostel") {
    return "게스트하우스";
  }
  if (input.lodgingKind === "airbnb") {
    return "에어비앤비";
  }
  return null;
}

export function lodgingRowMatchesStayType(
  row: { name: string; address?: string | null; partnerLabel?: string | null },
  stayType: LodgingStayType,
): boolean {
  const entry = getLodgingStayTypeEntry(stayType);
  if (!entry) {
    return false;
  }
  const blob = `${row.name} ${row.address ?? ""} ${row.partnerLabel ?? ""}`;
  return entry.filterSignal.test(blob);
}

export function defaultWidenSeedForStayType(
  stayType: LodgingStayType | null | undefined,
): string {
  const entry = getLodgingStayTypeEntry(stayType);
  if (entry) {
    return `${entry.labelKo} 더 넓게 찾아줘`;
  }
  return "주변 숙소 더 넓게 찾아줘";
}

export function listLodgingStayTypesByBranch(
  branch: LodgingStayBranch,
): readonly LodgingStayTypeEntry[] {
  return LODGING_STAY_TYPE_CATALOG.filter((row) => row.branch === branch);
}

/**
 * Place category classifier (Discovery Category Integrity Guard).
 *
 * Retrieval providers (Naver Local / Google Places) return a raw category string
 * on each row — Naver like "카페,디저트" / "숙박>호텔" / "여행,관광명소", Google
 * like "cafe" / "restaurant" / "lodging" / "tourist_attraction". A literal
 * "오사카 놀거리" search happily returns a puzzle *cafe* or a *hotel*; without
 * knowing each row's true category we can't tell that's off-domain.
 *
 * This maps (categoryLabel + provider type + name + cuisineHint) to one canonical
 * PlaceCategory so the verifier can keep/drop rows by the requested domain.
 */

export type PlaceCategory =
  | "lodging"
  | "restaurant"
  | "cafe"
  | "theme_park"
  | "museum"
  | "park"
  | "shopping"
  | "nightlife"
  | "photo_spot"
  | "attraction"
  | "amenity"
  | "unknown";

type Matcher = { readonly category: PlaceCategory; readonly re: RegExp };

// Order matters — most specific first. Naver strings are Korean; Google types are
// snake_case English. Both are matched from a single lowercased blob.
const MATCHERS: readonly Matcher[] = [
  {
    category: "lodging",
    re: /숙박|호텔|료칸|여관|게스트\s*하우스|게스트하우스|민박|모텔|리조트|펜션|hotel|lodging|hostel|motel|resort|ryokan|guest\s*house|ホテル|旅館|宿/iu,
  },
  {
    category: "amenity",
    re: /약국|드럭\s*스토어|드럭스토어|편의점|은행|현금인출|atm|환전|병원|의원|클리닉|응급|주유소|충전소|마트|슈퍼|세탁|코인워시|우체국|택배|pharmacy|drugstore|convenience\s*store|\bbank\b|\batm\b|hospital|clinic|gas\s*station|supermarket|grocery|laundry|post\s*office|薬局|コンビニ/iu,
  },
  {
    category: "theme_park",
    re: /테마\s*파크|테마파크|놀이\s*공원|놀이공원|놀이\s*동산|유원지|워터\s*파크|워터파크|유니버설|유니버셜|디즈니|레고랜드|amusement\s*park|theme\s*park|water\s*park|universal|disney|legoland|遊園地|テーマパーク/iu,
  },
  {
    category: "museum",
    re: /박물관|미술관|갤러리|전시관|과학관|수족관|아쿠아리움|동물원|플라네타|museum|art\s*gallery|\bgallery\b|aquarium|\bzoo\b|planetarium|exhibit|美術館|博物館|水族館/iu,
  },
  {
    category: "park",
    re: /공원|정원|수목원|식물원|해변|바닷가|해수욕장|호수|계곡|산책로|둘레길|전망대\s*공원|park(?!ing)|garden|arboretum|botanical|beach|lake|nature\s*reserve|trail|公園|庭園|海岸/iu,
  },
  {
    category: "shopping",
    re: /쇼핑|아울렛|아웃렛|백화점|몰\b|상점가|시장|면세점|편집샵|아케이드|shopping|outlet|mall|department\s*store|market|arcade|duty\s*free|百貨店|商店街|市場/iu,
  },
  {
    category: "nightlife",
    re: /야경|나이트\s*라이프|나이트라이프|클럽|라운지|루프탑|재즈바|칵테일\s*바|night\s*life|nightlife|night\s*club|club\b|lounge|rooftop|jazz\s*bar|cocktail\s*bar|live\s*music|夜景|ナイトクラブ|ルーフトップ/iu,
  },
  {
    category: "photo_spot",
    re: /포토\s*스팟|포토스팟|사진\s*명소|인생샷|뷰포인트|전망\s*포인트|인스타\s*스팟|instagrammable|photo\s*spot|view\s*point|viewpoint|scenic\s*point|observation\s*deck|景色|撮影スポット/iu,
  },
  {
    category: "cafe",
    re: /카페|커피|coffee|cafe|café|디저트|dessert|베이커리|제과|bakery|찻집|티\s*하우스|茶|喫茶/iu,
  },
  {
    category: "restaurant",
    re: /맛집|식당|음식점|레스토랑|먹거리|밥집|이자카야|포차|술집|바\b|다이닝|한식|일식|중식|양식|분식|라멘|스시|초밥|고기|국밥|면요리|restaurant|eatery|dining|izakaya|\bbar\b|\bpub\b|ramen|sushi|noodle|bbq|food(?:\s*court)?|レストラン|食堂|居酒屋/iu,
  },
  {
    category: "attraction",
    re: /관광|명소|관광지|볼거리|랜드마크|전망대|타워|성곽|사찰|신사|절\b|유적|명승|point\s*of\s*interest|tourist\s*attraction|landmark|observatory|tower|temple|shrine|castle|観光|名所|展望台|寺|神社/iu,
  },
];

/** Canonical category for a discovery row — best-effort, defaults to unknown. */
export function classifyPlaceCategory(input: {
  name?: string | null;
  categoryLabel?: string | null;
  cuisineHint?: string | null;
  address?: string | null;
}): PlaceCategory {
  // Provider category first (highest signal), then name/cuisine for backup.
  const primary = [input.categoryLabel, input.cuisineHint]
    .filter(Boolean)
    .join(" ")
    .trim();
  const fallback = [input.name, input.address].filter(Boolean).join(" ").trim();

  for (const source of [primary, fallback]) {
    if (!source) {
      continue;
    }
    // Google types are snake_case (amusement_park, tourist_attraction) — flatten
    // underscores so the space-tolerant matchers below hit them.
    const normalized = source.replace(/_/gu, " ");
    for (const matcher of MATCHERS) {
      if (matcher.re.test(normalized)) {
        return matcher.category;
      }
    }
  }
  return "unknown";
}

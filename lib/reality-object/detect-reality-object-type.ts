import type {
  RealityObjectType,
  RealityPinCompatKind,
} from "@/lib/reality-object/types";

export type DetectRealityObjectTypeInput = {
  title: string;
  /** Existing pin / discovery kind when known. */
  pinKind?: RealityPinCompatKind | null;
  categoryLabel?: string | null;
  cuisineHint?: string | null;
  placeId?: string | null;
};

function haystack(input: DetectRealityObjectTypeInput): string {
  return [
    input.title,
    input.categoryLabel ?? "",
    input.cuisineHint ?? "",
    input.placeId ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

const LANDMARK_RE =
  /castle|성\s*공원|성곽|palace|temple|신사|사원|landmark|attraction|universal\s*studios|유니버설|도톤보리|dotonbori|타워|tower|공원|park|박물관|museum|전망대/iu;

const HOTEL_RE =
  /hotel|호텔|hilton|hyatt|marriott|sheraton|리조트|resort|ryokan|료칸/iu;

const ACCOMMODATION_RE =
  /hostel|호스텔|capsule|캡슐|guesthouse|게스트하우스|airbnb|민박|숙소|숙박/iu;

const CAFE_RE = /cafe|café|커피|카페|blue\s*bottle|스타벅스|starbucks|디저트/iu;

const RESTAURANT_RE =
  /ramen|라멘|일식|스시|sushi|izakaya|이자카야|식당|맛집|restaurant|cuisine|bib\s*gourmand|미슐랭|ichiran|이치란/iu;

const SHOPPING_RE =
  /shopping|쇼핑|mall|몰|market|시장|백화점|outlet|아울렛|store|매장/iu;

/**
 * Detect Reality Object type from title + optional discovery cues.
 * Prefer pinKind when present, then lexical cues.
 */
export function detectRealityObjectType(
  input: DetectRealityObjectTypeInput,
): RealityObjectType {
  const text = haystack(input);
  const pin = input.pinKind ?? null;

  if (pin === "lodging") {
    if (HOTEL_RE.test(text) && !ACCOMMODATION_RE.test(text)) {
      return "hotel";
    }
    if (ACCOMMODATION_RE.test(text) && !HOTEL_RE.test(text)) {
      return "accommodation";
    }
    return HOTEL_RE.test(text) ? "hotel" : "accommodation";
  }

  if (pin === "eatery") {
    if (CAFE_RE.test(text) && !RESTAURANT_RE.test(text)) {
      return "cafe";
    }
    return "restaurant";
  }

  if (pin === "amenity") {
    if (SHOPPING_RE.test(text)) {
      return "shopping";
    }
    if (LANDMARK_RE.test(text)) {
      return "landmark";
    }
    return "activity";
  }

  if (pin === "activity") {
    if (LANDMARK_RE.test(text)) {
      return "landmark";
    }
    if (SHOPPING_RE.test(text)) {
      return "shopping";
    }
    return "activity";
  }

  if (LANDMARK_RE.test(text)) {
    return "landmark";
  }
  if (HOTEL_RE.test(text)) {
    return "hotel";
  }
  if (ACCOMMODATION_RE.test(text)) {
    return "accommodation";
  }
  if (CAFE_RE.test(text) && !RESTAURANT_RE.test(text)) {
    return "cafe";
  }
  if (RESTAURANT_RE.test(text)) {
    return "restaurant";
  }
  if (SHOPPING_RE.test(text)) {
    return "shopping";
  }

  return "activity";
}

/** Map object type back to ContextPinnedItemKind for compat writers. */
export function realityObjectTypeToPinKind(
  objectType: RealityObjectType,
): RealityPinCompatKind {
  switch (objectType) {
    case "hotel":
    case "accommodation":
      return "lodging";
    case "restaurant":
    case "cafe":
      return "eatery";
    case "shopping":
    case "parking":
      return "amenity";
    default:
      return "activity";
  }
}

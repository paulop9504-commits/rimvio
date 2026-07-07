/**
 * Broad-domain classifier for the Globe Context Condition panel.
 *
 * The lodging/eatery pipeline only knew `restaurant | hotel`, so broad "놀거리"
 * (things to do) queries fell back to hotels. This resolves the intended
 * discovery domain so activity/amenity searches route to a generic place loader
 * instead of hijacking the hotel channel.
 */

export type LocalDiscoveryDomain = "activity" | "amenity";

/** Broad activity intent — needs a clarify chip before searching. */
const ACTIVITY_BROAD =
  /놀거리|놀\s*거리|즐길\s*거리|즐길거리|가\s*볼\s*만한|가볼만한|가\s*볼\s*곳|관광|관광지|명소|볼거리|볼\s*거리|액티비티|놀\s*것|놀\s*데|구경|나들이|데이트\s*코스|데이트코스|할\s*거리|할거리|things\s*to\s*do|attraction|activit(?:y|ies)|sightsee/iu;

/** Specific activity focus — user already narrowed, skip clarify. */
const ACTIVITY_SPECIFIC: { re: RegExp; focus: string }[] = [
  { re: /유니버설|유니버셜|universal|usj/iu, focus: "유니버설 스튜디오" },
  { re: /디즈니|disney/iu, focus: "디즈니랜드" },
  { re: /테마\s*파크|놀이공원|놀이\s*동산|theme\s*park|amusement/iu, focus: "테마파크" },
  { re: /수족관|아쿠아리움|aquarium/iu, focus: "수족관" },
  { re: /동물원|zoo/iu, focus: "동물원" },
  { re: /전망대|타워|전망|observatory|tower/iu, focus: "전망대" },
  { re: /미술관|박물관|museum|gallery/iu, focus: "박물관·미술관" },
  { re: /온천|스파|onsen|spa/iu, focus: "온천·스파" },
  { re: /해변|바닷가|해수욕장|beach/iu, focus: "해변" },
  { re: /공원|park(?!ing)/iu, focus: "공원" },
  { re: /쇼핑|아울렛|아웃렛|백화점|mall|shopping|outlet/iu, focus: "쇼핑" },
  { re: /야시장|야경|night\s*market|night\s*view/iu, focus: "야시장·야경" },
];

/** Amenity intent — pharmacy/convenience/etc. Generic place loader. */
const AMENITY_ENTRIES: { re: RegExp; focus: string }[] = [
  { re: /약국|드럭스토어|pharmacy|drugstore/iu, focus: "약국" },
  { re: /편의점|convenience\s*store|convenience/iu, focus: "편의점" },
  { re: /은행|atm|현금|인출|환전|money\s*exchange/iu, focus: "ATM·은행" },
  { re: /병원|응급|의원|clinic|hospital|emergency/iu, focus: "병원" },
  { re: /주유소|충전소|gas\s*station|charging/iu, focus: "주유소" },
  { re: /마트|슈퍼|supermarket|grocery/iu, focus: "마트" },
  { re: /세탁|코인워시|빨래|laundry/iu, focus: "세탁소" },
  { re: /우체국|택배|post\s*office/iu, focus: "우체국" },
];

export function parseActivitySpecificFocus(text: string): string | null {
  const trimmed = text.trim();
  for (const entry of ACTIVITY_SPECIFIC) {
    if (entry.re.test(trimmed)) {
      return entry.focus;
    }
  }
  return null;
}

export function parseAmenityFocus(text: string): string | null {
  const trimmed = text.trim();
  for (const entry of AMENITY_ENTRIES) {
    if (entry.re.test(trimmed)) {
      return entry.focus;
    }
  }
  return null;
}

/** Which discovery domain does this message target (null → lodging/eatery flow). */
export function resolveLocalDiscoveryDomain(
  text: string,
): LocalDiscoveryDomain | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (parseAmenityFocus(trimmed)) {
    return "amenity";
  }
  if (ACTIVITY_BROAD.test(trimmed) || parseActivitySpecificFocus(trimmed)) {
    return "activity";
  }
  return null;
}

/** Broad activity with no specific focus — the panel should ask a clarify chip. */
export function isBroadActivityQuery(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (parseAmenityFocus(trimmed)) {
    return false;
  }
  return ACTIVITY_BROAD.test(trimmed) && !parseActivitySpecificFocus(trimmed);
}

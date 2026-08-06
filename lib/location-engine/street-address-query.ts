/**
 * Worldwide street / parcel address detection (KR · JP · CN · US · …).
 * Not a landmark seed — Provider (Nominatim / Naver / Google) resolves live.
 */

const SEARCH_STEAL_RE =
  /호텔|숙소|캡슐|료칸|맛집|레스토랑|카페|편의점|약국|병원|찾아\s*줘|추천해|hotel|restaurant|cafe|near\s+me/iu;

/** 계산동 722 · 계산동 722-3 */
const KR_JIBUN_RE =
  /[가-힣A-Za-z0-9]{1,12}동\s+\d{1,5}(?:-\d{1,5})?\s*$/u;
/** ○○로 12 · ○○길 3-1 */
const KR_ROAD_RE =
  /[가-힣A-Za-z0-9]+(?:대로|로|길)\s+\d{1,5}(?:-\d{1,5})?\s*$/u;
/** 계양구 계산동 */
const KR_GU_DONG_RE = /[가-힣]{1,10}구\s+[가-힣A-Za-z0-9]{1,12}동\b/u;

/** 恵美須東1丁目 · 1丁目2番3号 · 大阪市浪速区… */
const JP_CHOME_RE =
  /(?:丁目|番地|番地目|\d+[-－]\d+(?:[-－]\d+)?号?|[都道府県市区町村郡].{0,24}\d)/u;

/** 中关村大街1号 · 浦东新区…路… */
const CN_ROAD_RE =
  /(?:路|街|巷|大道|弄).{0,12}\d+号?|\d+号|(?:省|市|区|县).{2,40}\d/u;

/** 123 Main Street · 500 5th Ave New York */
const US_STREET_RE =
  /\b\d{1,6}\s+[A-Za-z0-9.'\-]+(?:\s+[A-Za-z0-9.'\-]+){0,6}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?|Place|Pl\.?|Highway|Hwy\.?)\b/iu;

/** Generic: has house-ish number + place token (Latin / CJK), length gated */
const GENERIC_NUMBERED_RE =
  /(?:^|\s)\d{1,6}(?:[-－/]\d{1,4})?(?:\s|,).{2,60}$|(?:^|\s).{2,40}\s\d{1,6}(?:[-－/]\d{1,4})?\s*$/u;

export type AddressCountryHint =
  | "kr"
  | "jp"
  | "cn"
  | "us"
  | "gb"
  | "world";

/**
 * Hint ISO countrycodes for Nominatim (comma-separated) or null = worldwide.
 */
export function inferAddressCountryCodes(text: string): string | null {
  const t = text.trim();
  if (
    /한국|서울|부산|인천|대구|대전|광주|경기도|계양|계산동|테헤란|korea|seoul|busan/iu.test(
      t,
    ) ||
    KR_JIBUN_RE.test(t) ||
    KR_ROAD_RE.test(t) ||
    KR_GU_DONG_RE.test(t)
  ) {
    return "kr";
  }
  if (
    /일본|도쿄|오사카|교토|나고야|후쿠오카|東京|大阪|京都|japan|tokyo|osaka|kyoto/iu.test(
      t,
    ) ||
    /[一-龯ぁ-んァ-ン]/.test(t) && JP_CHOME_RE.test(t)
  ) {
    return "jp";
  }
  if (
    /중국|베이징|상하이|광저우|심천|北京|上海|广州|深圳|china|beijing|shanghai/iu.test(
      t,
    ) ||
    CN_ROAD_RE.test(t)
  ) {
    return "cn";
  }
  if (
    /\b(?:USA|United States|New York|Los Angeles|Chicago|San Francisco|California|NYC|TX|CA)\b/iu.test(
      t,
    ) ||
    US_STREET_RE.test(t)
  ) {
    return "us";
  }
  if (
    /\b(?:UK|United Kingdom|London|England|Manchester)\b/iu.test(t)
  ) {
    return "gb";
  }
  return null;
}

/** Backward-compatible KR-only check. */
export function isKoreanAddressQuery(text: string): boolean {
  const t = text.trim().replace(/\s+/gu, " ");
  if (!t || t.length < 4) return false;
  if (SEARCH_STEAL_RE.test(t)) return false;
  return (
    KR_JIBUN_RE.test(t) || KR_ROAD_RE.test(t) || KR_GU_DONG_RE.test(t)
  );
}

/**
 * True when text looks like a street / parcel address anywhere in the world.
 */
export function isStreetAddressQuery(text: string): boolean {
  const t = text.trim().replace(/\s+/gu, " ");
  if (!t || t.length < 4) return false;
  if (SEARCH_STEAL_RE.test(t)) return false;
  if (isKoreanAddressQuery(t)) return true;
  if (JP_CHOME_RE.test(t) && /\d/u.test(t)) return true;
  if (CN_ROAD_RE.test(t)) return true;
  if (US_STREET_RE.test(t)) return true;
  // Numbered line that is not a pure toponym question
  if (
    GENERIC_NUMBERED_RE.test(t) &&
    /\d/u.test(t) &&
    t.length >= 6 &&
    t.length <= 120 &&
    !/^(어디|where|what|how)\b/iu.test(t)
  ) {
    // Require at least one letter / CJK besides digits
    if (/[A-Za-z가-힣一-龯ぁ-んァ-ン]/u.test(t)) return true;
  }
  return false;
}

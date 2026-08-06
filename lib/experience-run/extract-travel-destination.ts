/**
 * Travel destination noun extract — shared by experience-run + Globe prep.
 * Open-world: hardcoded hubs + overseas registry + particle/phrase capture.
 * Coord resolve (incl. Nominatim) lives in resolveTripContextAnchor / Location Engine.
 */

import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { resolveRunPlaceFromText } from "@/lib/experience-run/resolve-run-place-from-text";

/** Frequent hubs — fast path; not the full world. */
const TRAVEL_DEST_HUBS =
  /(?:오사카|제주(?:도)?|도쿄|후쿠오카|삿포로|교토|나고야|오키나와|상하이|상해|베이징|타이베이|타이페이|홍콩|마카오|대만|방콕|싱가포르|파리|런던|뉴욕|LA|로스앤젤레스|하와이|다낭|발리|괌|사이판|인천공항|김포공항)/iu;

const TRIP_ANNOUNCE =
  /(?:여행(?:간|감|가|을|을\s*)?|출장|해외(?:여행)?|놀러(?:감|가|갈)?|trip|abroad|vacation|holiday)/iu;

const TIMED =
  /(?:\d{1,3}\s*시간\s*(?:뒤|후|뒤에|후에)|\d{1,3}\s*분\s*(?:뒤|후|뒤에|후에)|내일|모레)/iu;

/** 「하와이로 간다」「오사카 가요」「제주 갈게」— dest go without naming 여행. */
const LIGHT_TRIP_GO =
  /(?:로|으로)\s*(?:갈(?:게|래|까|자|거야|거예요)?|간(?:다|다요|다구요|다고)?|가(?:요|자|서|ㅂ니다)?|갑니다)|(?:^|[\s,·])(?:갈(?:게|래|까|자)|가요|간다|갑니다)(?:\s|$|[!?.,])/iu;

/** Noise particles / verbs that should not become place labels. */
const PLACE_NOISE =
  /^(?:여기|저기|그곳|어디|근처|주변|맥락|위치|앵커|여행|출장|숙소|호텔|맛집|일정|please|here|there|somewhere)$/iu;

function cleanPlaceLabel(raw: string): string | null {
  let cleaned = raw
    // Demonstratives only when followed by space ("그 오사카") — not "그리스"
    .replace(/^(?:저|그|이)\s+/u, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length > 48) return null;
  if (PLACE_NOISE.test(cleaned)) return null;
  // 「괌」is 1 code unit — allow known hubs / overseas; reject random single letters.
  if (cleaned.length < 2) {
    if (
      !TRAVEL_DEST_HUBS.test(cleaned) &&
      classifyOverseasManualPlace(cleaned) == null
    ) {
      return null;
    }
  }
  // Normalize common Korean destination suffixes used in speech
  if (/^제주도$/u.test(cleaned)) cleaned = "제주";
  return cleaned;
}

/** Dest + go verb — light trip Intent (overseas registry or hubs). */
export function isLightTripGoUtterance(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  return LIGHT_TRIP_GO.test(trimmed);
}

export function isTravelTripAnnouncement(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  const hasTrip =
    TRIP_ANNOUNCE.test(trimmed) ||
    TRAVEL_DEST_HUBS.test(trimmed) ||
    classifyOverseasManualPlace(trimmed) != null;
  if (!hasTrip) {
    return false;
  }
  if (TIMED.test(trimmed) || TRIP_ANNOUNCE.test(trimmed)) {
    return true;
  }
  // 「하와이로 간다」— registry/hub dest + go verb (no need to say 여행).
  if (isLightTripGoUtterance(trimmed) && extractTravelDestination(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Extract destination label from NL — any overseas/domestic place name when possible.
 * Returns label only; call resolveTripContextAnchor(Async) for coords.
 */
export function extractTravelDestination(message: string): string | null {
  const text = message.trim();
  if (!text) return null;

  const hasMoveOrTripVerb =
    isLightTripGoUtterance(text) ||
    /(?:로|으로)\s*(?:여행|출장|놀러|감|간|가|이동|옮겨|변경|바꿔|가자|갈래|출발)|(?:에도|에)\s*(?:만들|열어|복제|복사)|(?:여행|출장)(?:\s|$|[!?.,])|(?:to|for)\s+[A-Za-z]|go(?:ing)?\s+to|trip|vacation/iu.test(
      text,
    );

  // 1) Particle / phrase capture first when user is naming a destination action
  //    (avoids picking incidental KR places like "둔산동 … 제주도로 옮겨")
  if (hasMoveOrTripVerb) {
    const particlePatterns: RegExp[] = [
      // Destination immediately before particle — not the whole preceding phrase
      /(?:^|[\s,·])([가-힣A-Za-z]{1,24})(?:도)?(?:로|으로)\s*(?:여행|출장|놀러|감|간|가|이동|옮겨|변경|바꿔|가자|갈래|출발)/iu,
      /(?:^|[\s,·])([가-힣A-Za-z]{1,24})(?:도)?(?:에도|에)\s*(?:만들|열어|복제|복사)/iu,
      /(?:^|[\s,·])([가-힣A-Za-z]{1,24})\s+(?:여행|출장)(?:\s|$|[!?.,])/iu,
      // 「괌 가요」「하와이 간다」— go without 로/으로
      /(?:^|[\s,·])([가-힣A-Za-z]{1,24})\s*(?:가요|간다|갑니다|갈게|갈래|가자)(?:\s|$|[!?.,])/iu,
      /(?:to|for|in|at)\s+([A-Za-z][A-Za-z\s'.-]{1,40}?)(?:\s+(?:trip|travel|vacation|holiday|please)|[.!?,]|$)/iu,
      /(?:go(?:ing)?\s+to|visit(?:ing)?|fly(?:ing)?\s+to)\s+([A-Za-z][A-Za-z\s'.-]{1,40})/iu,
    ];
    for (const pat of particlePatterns) {
      const m = text.match(pat);
      const label = m?.[1] ? cleanPlaceLabel(m[1]) : null;
      if (label) {
        const overseas = classifyOverseasManualPlace(label);
        if (overseas) return overseas.label;
        const domestic = resolveRunPlaceFromText(label);
        if (domestic) return domestic.placeLabel;
        return label;
      }
    }
  }

  // 2) Overseas registry (~100 cities + countries)
  const overseas = classifyOverseasManualPlace(text);
  if (overseas) {
    return overseas.label;
  }

  // 3) Domestic / KR known places
  const domestic = resolveRunPlaceFromText(text);
  if (domestic) {
    return domestic.placeLabel;
  }

  // 4) Frequent hub regex
  const hub = text.match(TRAVEL_DEST_HUBS);
  if (hub?.[0]) {
    return cleanPlaceLabel(hub[0]);
  }

  // 5) Bare Latin city when message is mostly the place name
  if (/^[A-Za-z][A-Za-z\s'.-]{1,40}$/.test(text)) {
    return cleanPlaceLabel(text);
  }

  // 6) Bare Hangul place when short and trip-ish context
  if (TRIP_ANNOUNCE.test(text)) {
    const bare = text.match(
      /(?:^|[\s,·])([가-힣]{2,12})(?:[\s,·]|$)/u,
    );
    const label = bare?.[1] ? cleanPlaceLabel(bare[1]) : null;
    if (label && !PLACE_NOISE.test(label)) return label;
  }

  return null;
}

export function isTravelDestinationAmbiguous(message: string): boolean {
  if (!isTravelTripAnnouncement(message)) {
    return false;
  }
  return extractTravelDestination(message) == null;
}

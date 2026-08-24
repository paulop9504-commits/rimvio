/**
 * NL → in-app booking intent (specific lodging + prepare).
 */

export type InAppBookingIntent = {
  readonly placeQuery: string;
  readonly rawUtterance: string;
};

const BOOKING_CUE =
  /(?:예약|booking|book|reserve|결재함|앱\s*에서\s*예약|in-app\s*booking)/iu;

const SEARCH_ONLY =
  /(?:찾아|찾기|추천|검색|보여|주변|근처|nearby|search)/iu;

const PLACE_PATTERNS: readonly RegExp[] = [
  /^(.+?)\s*(?:호텔|숙소|hotel|lodging)\s*(?:예약|booking|book|reserve)(?:해)?(?:줘|주세요|할게)?\s*$/iu,
  /^(.+?)\s*(?:예약|booking|book|reserve)(?:해)?(?:줘|주세요|할게)?\s*$/iu,
  /^(?:in-app\s*booking|앱\s*에서)\s*(.+?)\s*(?:예약)?(?:해)?(?:줘|주세요)?\s*$/iu,
];

function cleanPlaceQuery(raw: string): string {
  return raw
    .trim()
    .replace(/\s*(?:예약|booking|book|reserve|결재함|해|줘|주세요|할게)\s*$/giu, "")
    .replace(/\s*(?:호텔|숙소|hotel|lodging)\s*$/giu, "")
    .trim();
}

export function parseInAppBookingIntent(
  utterance: string,
): InAppBookingIntent | null {
  const raw = utterance.trim();
  if (!raw || raw.startsWith("@")) {
    return null;
  }
  if (!BOOKING_CUE.test(raw)) {
    return null;
  }
  // Generic scout — let orchestrator / workspace handle discovery.
  if (SEARCH_ONLY.test(raw) && !/(?:APA|노보텔|그란벨|Novotel|Granbell)/iu.test(raw)) {
    return null;
  }

  for (const pattern of PLACE_PATTERNS) {
    const match = raw.match(pattern);
    if (!match?.[1]) {
      continue;
    }
    const placeQuery = cleanPlaceQuery(match[1]);
    if (!placeQuery || placeQuery.length < 2) {
      continue;
    }
    return { placeQuery, rawUtterance: raw };
  }

  return null;
}

export function isInAppBookingIntent(text: string): boolean {
  return parseInAppBookingIntent(text) !== null;
}

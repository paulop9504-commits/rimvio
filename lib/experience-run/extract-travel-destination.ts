/**
 * Travel destination noun extract — shared by experience-run + Globe prep.
 * Kept out of action-chat so Globe L1 boundary stays clean.
 */

const TRAVEL_DEST =
  /(?:오사카|제주|도쿄|후쿠오카|삿포로|교토|상하이|상해|베이징|타이pei|타이베이|방콕|싱가포르|파리|런던|뉴욕|LA|인천공항|김포공항|공항)/iu;

const TRIP_ANNOUNCE =
  /(?:여행(?:간|감|가|을|을\s*)?|출장|해외(?:여행)?|trip|abroad)/iu;

const TIMED =
  /(?:\d{1,3}\s*시간\s*(?:뒤|후|뒤에|후에)|\d{1,3}\s*분\s*(?:뒤|후|뒤에|후에)|내일|모레)/iu;

export function isTravelTripAnnouncement(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  const hasTrip = TRIP_ANNOUNCE.test(trimmed) || TRAVEL_DEST.test(trimmed);
  if (!hasTrip) {
    return false;
  }
  return TIMED.test(trimmed) || TRIP_ANNOUNCE.test(trimmed);
}

export function extractTravelDestination(message: string): string | null {
  const destMatch = message.match(
    /(?:오사카|제주|도쿄|후쿠오카|삿포로|교토|상하이|상해|베이징|타이pei|타이베이|방콕|싱가포르|파리|런던|뉴욕|인천공항|김포공항)/iu,
  );
  if (destMatch?.[0]) {
    return destMatch[0].trim();
  }

  const toMatch = message.match(
    /([가-힣A-Za-z]{2,12})(?:로|으로)\s*(?:여행|출장|감|간|가)/iu,
  );
  if (toMatch?.[1]) {
    return toMatch[1].trim();
  }

  if (TRAVEL_DEST.test(message)) {
    return message.match(TRAVEL_DEST)?.[0] ?? null;
  }

  return null;
}

export function isTravelDestinationAmbiguous(message: string): boolean {
  if (!isTravelTripAnnouncement(message)) {
    return false;
  }
  return extractTravelDestination(message) == null;
}

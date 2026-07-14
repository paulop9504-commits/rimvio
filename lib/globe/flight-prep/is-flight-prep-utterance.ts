import { isLodgingPrepUtterance } from "@/lib/globe/lodging-prep/is-lodging-prep-utterance";

const FLIGHT_PREP_PATTERN =
  /(?:항공|비행|flight|airline|항공권).{0,32}(?:예약|찾|검색|준비|티켓|볼)/iu;

/** Utterances for one-shot flight booking prep — excludes lodging prep. */
export function isFlightPrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isLodgingPrepUtterance(trimmed)) {
    return false;
  }
  return FLIGHT_PREP_PATTERN.test(trimmed);
}

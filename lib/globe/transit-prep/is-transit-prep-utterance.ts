import { isFlightPrepUtterance } from "@/lib/globe/flight-prep/is-flight-prep-utterance";
import { isLodgingPrepUtterance } from "@/lib/globe/lodging-prep/is-lodging-prep-utterance";

const TRANSIT_PREP_PATTERN =
  /(?:공항|이동|픽업|교통|택시|지하철|KTX|기차|셔틀|환승|uber|우버).{0,24}(?:가|이동|찾|타|예약|길)/iu;

/** Utterances for one-shot transit navigate prep — excludes flight/lodging prep. */
export function isTransitPrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isFlightPrepUtterance(trimmed) || isLodgingPrepUtterance(trimmed)) {
    return false;
  }
  return TRANSIT_PREP_PATTERN.test(trimmed);
}

export { TRANSIT_PREP_PATTERN };

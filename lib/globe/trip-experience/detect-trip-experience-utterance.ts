import { hasNarrowCategorySignal } from "@/lib/container-ai/classify-travel-request-scope";
import { isLodgingPrepUtterance } from "@/lib/globe/lodging-prep/is-lodging-prep-utterance";

const FUN_AFFECT =
  /(?:재미|특별|신나|즐거|힐링|힐링|감성|로맨|fun|interesting|memorable|special)/iu;

const TRIP_FRAME =
  /(?:여행|나들이|주말|휴가|trip|getaway|weekend|vacation)/iu;

/** Exploratory trip intent — not lodging checkout, not single-category narrow. */
export function isTripExperienceUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isLodgingPrepUtterance(trimmed)) {
    return false;
  }
  if (hasNarrowCategorySignal(trimmed)) {
    return false;
  }
  if (FUN_AFFECT.test(trimmed) && TRIP_FRAME.test(trimmed)) {
    return true;
  }
  if (/재미\s*있(?:는|게)?\s*여행/iu.test(trimmed)) {
    return true;
  }
  if (/특별한\s*(?:주말|휴가|여행)/iu.test(trimmed)) {
    return true;
  }
  return false;
}

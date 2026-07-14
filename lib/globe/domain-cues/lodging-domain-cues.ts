/**
 * Lodging domain cue SSOT — every gate imports this.
 * Do not duplicate hostel/guesthouse lists in Container / prep / booking / ambiguity.
 */

import type { LocalDiscoveryLodgingKind } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

/** Entity nouns only (no “find/nearby” verbs). */
export const LODGING_ENTITY_SOURCE =
  String.raw`호텔|숙소|숙박|게스트\s*하우스|게스트하우스|호스텔|료칸|민박|펜션|캡슐\s*호텔|motel|hostel|ryokan|hotel|lodging|guesthouse|guest\s*house|inn\b|stay\b|accommodation|宿|ホテル`;

export const LODGING_ENTITY_RE = new RegExp(`(?:${LODGING_ENTITY_SOURCE})`, "iu");

const HOSTEL_KIND_RE =
  /게스트\s*하우스|게스트하우스|호스텔|hostel|guesthouse|guest\s*house|캡슐\s*호텔|capsule/iu;
const AIRBNB_KIND_RE = /에어비|bnb|airbnb|민박/iu;
const HOTEL_KIND_RE = /호텔|hotel|료칸|ryokan|펜션/iu;

/** True when the utterance mentions a lodging entity (any kind). */
export function hasLodgingDomainCue(text: string): boolean {
  return LODGING_ENTITY_RE.test(text.trim());
}

/** Kind for scout / inventory bias — hostel before hotel so 「게스트하우스호텔」 stays hostel. */
export function parseLodgingKindFromText(
  text: string,
): LocalDiscoveryLodgingKind | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (AIRBNB_KIND_RE.test(trimmed)) {
    return "airbnb";
  }
  if (HOSTEL_KIND_RE.test(trimmed)) {
    return "hostel";
  }
  if (HOTEL_KIND_RE.test(trimmed)) {
    return "hotel";
  }
  if (LODGING_ENTITY_RE.test(trimmed)) {
    return "any";
  }
  return null;
}

/** Neutral widen seed — never hardcode Hilton-tier “호텔” when kind is unknown. */
export function defaultLodgingWidenSeed(
  lodgingKind?: LocalDiscoveryLodgingKind | null,
): string {
  switch (lodgingKind) {
    case "hostel":
      return "게스트하우스 더 넓게 찾아줘";
    case "airbnb":
      return "민박 더 넓게 찾아줘";
    case "hotel":
      return "호텔 더 넓게 찾아줘";
    default:
      return "주변 숙소 더 넓게 찾아줘";
  }
}

/** Keep prior intent words; append widen only when missing. */
export function widenPriorLodgingUtterance(prior: string): string {
  const trimmed = prior.trim();
  if (!trimmed) {
    return defaultLodgingWidenSeed(null);
  }
  if (/더\s*넓|다시\s*찾|더\s*찾|넓게\s*찾/iu.test(trimmed)) {
    return trimmed;
  }
  const base =
    trimmed
      .replace(/\s*(?:찾아\s*줘|찾아줘|해\s*줘|해줘|좀)$/iu, "")
      .trim() || trimmed;
  return `${base} 더 넓게 찾아줘`;
}

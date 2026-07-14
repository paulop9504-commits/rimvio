import {
  isInstantLodgingSearch,
  requiresLodgingBookingSlots,
} from "@/lib/globe/context-condition-ai/instant-lodging-search";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";

/** Utterances that should use one-shot lodging prep (not legacy intake sheet). */
export function isLodgingPrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (/(?:항공|비행|flight|airline|항공권)/iu.test(trimmed)) {
    return false;
  }
  return (
    requiresLodgingBookingSlots(trimmed) ||
    isInstantLodgingSearch(trimmed) ||
    (hasLodgingDomainCue(trimmed) &&
      /(?:준비|예약|잡|찾)/iu.test(trimmed))
  );
}

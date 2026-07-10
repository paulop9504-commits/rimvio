import {
  isInstantLodgingSearch,
  requiresLodgingBookingSlots,
} from "@/lib/globe/context-condition-ai/instant-lodging-search";

/** Utterances that should use one-shot lodging prep (not legacy intake sheet). */
export function isLodgingPrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return (
    requiresLodgingBookingSlots(trimmed) ||
    isInstantLodgingSearch(trimmed) ||
    /(?:숙소|호텔|lodging|hotel).{0,24}(?:준비|예약|잡|찾)/iu.test(trimmed)
  );
}

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
  if (/(?:항공|비행|flight|airline|항공권)/iu.test(trimmed)) {
    return false;
  }
  return (
    requiresLodgingBookingSlots(trimmed) ||
    isInstantLodgingSearch(trimmed) ||
    /(?:숙소|호텔|게스트\s*하우스|게스트하우스|호스텔|lodging|hotel|hostel).{0,24}(?:준비|예약|잡|찾)/iu.test(
      trimmed,
    )
  );
}

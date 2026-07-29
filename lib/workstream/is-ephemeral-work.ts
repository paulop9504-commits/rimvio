/**
 * Ephemeral work — must NOT append workstream history.
 * Search / scout / candidate refresh only grow draft Objects.
 */

import { isInstantEaterySearch } from "@/lib/globe/context-condition-ai/instant-eatery-search";
import {
  isInstantLodgingSearch,
  requiresLodgingBookingSlots,
} from "@/lib/globe/context-condition-ai/instant-lodging-search";
import { detectLodgingSearchIntent } from "@/lib/globe/lodging/detect-lodging-search-intent";

/** True when utterance is discovery-only (no HotelSelected / etc.). */
export function isEphemeralWorkUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  if (requiresLodgingBookingSlots(text)) return false;
  if (
    isInstantLodgingSearch(text) ||
    detectLodgingSearchIntent(text) ||
    isInstantEaterySearch(text) ||
    /렌터\s*카|렌트\s*카|rental\s*car/iu.test(text)
  ) {
    return true;
  }
  // Soft continue chips on an open workstream — still inventory, not residue.
  return /^(?:숙소|호텔|맛집|식당|렌터\s*카|렌트\s*카)(?:\s*도)?$/iu.test(text);
}

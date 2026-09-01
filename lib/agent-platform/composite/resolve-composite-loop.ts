/**
 * Composite loop auto-selection from NL — Main Agent / Workspace ingress.
 */

import { OSAKA_COMPOSITE_LOOPS } from "./osaka-loops";

const RESUME_KEYWORDS = ["계속", "진행", "이어", "resume", "continue"];

export function wantsCompositeResume(utterance: string): boolean {
  const lower = utterance.toLowerCase();
  return RESUME_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Pick a published composite loop for trip-scale utterances.
 * Returns null when single-capability routing is preferred.
 */
export function resolveCompositeLoopFromUtterance(utterance: string): string | null {
  const text = utterance.trim();
  if (!text || wantsCompositeResume(text)) return null;

  if (
    (/3박|4일|일정\s*프레임|trip\s*frame/iu.test(text) || /오사카\s*3박/iu.test(text)) &&
    /오사카|osaka|大阪/iu.test(text)
  ) {
    return "osaka.trip.frame";
  }

  if (/조용/iu.test(text) && /숙소|호텔|lodging|hotel/iu.test(text)) {
    return "osaka.lodging.quiet";
  }

  if (
    (/맛집|식당|이자카야|restaurant|eatery/iu.test(text) &&
      /근처|주변|near|기준/iu.test(text)) ||
    /숙소\s*근처\s*맛집/iu.test(text)
  ) {
    return "osaka.eatery.near";
  }

  if (/예약\s*준비|prepare/iu.test(text) && /호텔|숙소|hotel|lodging/iu.test(text)) {
    return "osaka.lodging.prepare";
  }

  if (
    /오사카.*(호텔|숙소)|(호텔|숙소).*오사카/iu.test(text) ||
    (/오사카|osaka/iu.test(text) && /호텔\s*검색|숙소\s*찾/iu.test(text))
  ) {
    return "osaka.lodging.basic";
  }

  return null;
}

export function listCompositeLoopIds(): readonly string[] {
  return OSAKA_COMPOSITE_LOOPS.map((loop) => loop.loopId);
}

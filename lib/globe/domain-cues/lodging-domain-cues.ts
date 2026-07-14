/**
 * Lodging domain cue SSOT — every gate imports this.
 * Fine stay types: `lodging-stay-types.ts`. Do not duplicate cue lists.
 */

import type { LocalDiscoveryLodgingKind } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  LODGING_STAY_ENTITY_RE,
  defaultWidenSeedForStayType,
  lodgingStayTypeToBand,
  parseLodgingStayTypeFromText,
  type LodgingStayType,
} from "@/lib/globe/lodging/lodging-stay-types";

/** @deprecated Prefer LODGING_STAY_ENTITY_RE — kept for import stability. */
export const LODGING_ENTITY_SOURCE = LODGING_STAY_ENTITY_RE.source;
export const LODGING_ENTITY_RE = LODGING_STAY_ENTITY_RE;

/** True when the utterance mentions a lodging entity (any kind). */
export function hasLodgingDomainCue(text: string): boolean {
  return LODGING_STAY_ENTITY_RE.test(text.trim());
}

export function parseLodgingStayType(text: string): LodgingStayType | null {
  return parseLodgingStayTypeFromText(text);
}

/** Kind for scout / inventory bias (coarse band). */
export function parseLodgingKindFromText(
  text: string,
): LocalDiscoveryLodgingKind | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const stay = parseLodgingStayTypeFromText(trimmed);
  if (stay) {
    return lodgingStayTypeToBand(stay);
  }
  if (/숙소|숙박|lodging|accommodation|stay/iu.test(trimmed)) {
    return "any";
  }
  return null;
}

/** Neutral widen seed — preserve fine stay type wording when possible. */
export function defaultLodgingWidenSeed(
  lodgingKind?: LocalDiscoveryLodgingKind | null,
  stayType?: LodgingStayType | null,
): string {
  if (stayType) {
    return defaultWidenSeedForStayType(stayType);
  }
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

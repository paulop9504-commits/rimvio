/**
 * Google Maps–like nearby POI (amenity) — skip classify/convergence, wide radius, more pins.
 * @see resolve-local-discovery-domain.ts — amenity focus patterns
 */
import { parseAmenityFocus } from "@/lib/globe/context-condition-ai/resolve-local-discovery-domain";

export const INSTANT_POI_RADIUS_M = 2500;
export const INSTANT_POI_MAX_RESULTS = 12;
export const INSTANT_POI_PIN_CAP = 8;
export const INSTANT_POI_DEBOUNCE_MS = 350;

const PREFIX_FOCUS: readonly { re: RegExp; focus: string }[] = [
  { re: /^편의점?$/iu, focus: "편의점" },
  { re: /^약국/iu, focus: "약국" },
  { re: /^(?:atm|은행|현금)/iu, focus: "ATM·은행" },
  { re: /^병원|^의원|^응급/iu, focus: "병원" },
  { re: /^주유|^충전/iu, focus: "주유소" },
  { re: /^마트|^슈퍼/iu, focus: "마트" },
  { re: /^세탁/iu, focus: "세탁소" },
  { re: /^우체국/iu, focus: "우체국" },
];

/** Resolved amenity focus for instant POI search (full phrase or typing prefix). */
export function resolveInstantPoiFocus(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = parseAmenityFocus(trimmed);
  if (parsed) {
    return parsed;
  }
  for (const entry of PREFIX_FOCUS) {
    if (entry.re.test(trimmed)) {
      return entry.focus;
    }
  }
  return null;
}

export function isInstantPoiSearch(text: string): boolean {
  return resolveInstantPoiFocus(text) !== null;
}

/** While typing — debounced auto-search when prefix is unambiguous. */
export function matchesInstantPoiTyping(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (resolveInstantPoiFocus(trimmed)) {
    return true;
  }
  return /^(?:편의|약국|atm|은행|병원|의원|주유|마트|슈퍼|세탁|우체)/iu.test(trimmed);
}

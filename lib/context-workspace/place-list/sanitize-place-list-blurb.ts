/**
 * GPT Maps–style card lines — meta ≠ blurb.
 * Strips rating / price / category echoes so the third line stays judgment-only.
 */

const RATING_RE = /★\s*[\d.]+|평점\s*[\d.]+/gu;
/** Require currency cue — never eat bare numbers like 「2분」. */
const PRICE_RE =
  /(?:US\s*\$|USD\s*|\$|₩|￦)\s*\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s*(?:원|만원|KRW)/giu;
const META_SEP_RE = /\s*[·•|]\s*/gu;

const CATEGORY_ONLY_RE =
  /^(?:호텔|숙소|게스트하우스|캡슐|료칸|맛집|카페|식당|관광|명소|편의|약국|hotel|lodging|restaurant|cafe|poi)$/iu;

export function isPlaceListMetaEcho(text: string): boolean {
  return sanitizePlaceListBlurb(text) == null;
}

/**
 * Keep traveler judgment; drop lines that only restate ★ / price / category.
 */
export function sanitizePlaceListBlurb(
  raw: string | null | undefined,
  extrasToStrip: readonly string[] = [],
): string | null {
  if (!raw?.trim()) return null;
  let t = raw.trim();
  for (const extra of extrasToStrip) {
    const e = extra.trim();
    if (!e || e.length < 2) continue;
    // Only strip whole-string extras that look like titles/prices — not 1-char noise
    if (e.length >= 24) {
      // long title: only strip if blurb is mostly title
      if (t === e || t.startsWith(e)) t = t.slice(e.length);
      continue;
    }
    if (/원$|\$|₩/u.test(e) || /^\d/.test(e)) {
      t = t.split(e).join(" ");
    }
  }
  t = t.replace(RATING_RE, " ");
  t = t.replace(PRICE_RE, " ");
  t = t.replace(META_SEP_RE, " ");
  t = t.replace(/\s{2,}/gu, " ").trim();
  t = t.replace(/^[\s·•|,/-]+|[\s·•|,/-]+$/gu, "").trim();

  if (t.length < 4) return null;
  if (CATEGORY_ONLY_RE.test(t)) return null;

  // Remaining tokens are only category words → meta echo
  const tokens = t.split(/\s+/u).filter(Boolean);
  if (tokens.length > 0 && tokens.every((tok) => CATEGORY_ONLY_RE.test(tok))) {
    return null;
  }

  return t;
}

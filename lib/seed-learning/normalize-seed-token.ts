/** Normalize mention tokens for seed learning keys. */
export function normalizeSeedLearningToken(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .replace(/["""'']/gu, "")
    .slice(0, 48);
}

/** Drop noise that should never become a seed key. */
export function isSeedLearningTokenWorthy(token: string): boolean {
  const t = normalizeSeedLearningToken(token);
  if (t.length < 2) {
    return false;
  }
  if (/^(근처|주변|찾아|줘|좀|추천|검색|호텔|숙소|맛집|카페|near|around)$/iu.test(t)) {
    return false;
  }
  if (/^\d+$/u.test(t)) {
    return false;
  }
  return true;
}

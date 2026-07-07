/** Follow-up: exclude prior batch and scout next-tier candidates (cicada SEARCHING). */

export function isAlternatePlaceSearch(message: string): boolean {
  const text = message.trim();
  if (!text) {
    return false;
  }
  return /다른\s*곳|다른\s*데|다른\s*식당|더\s*보여|차순위|또\s*보여|alternative|more\s*options|next\s*tier/iu.test(
    text,
  );
}

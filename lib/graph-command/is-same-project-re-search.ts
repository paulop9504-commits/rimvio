/**
 * 「다시 찾아」— same-project Tool Search (hotel.lookup), not Field scout steal.
 */

export function isSameProjectReSearchUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return /다시\s*(?:찾|보여|검색|골라)|re-?\s*search|다시\s*찾아/iu.test(trimmed);
}

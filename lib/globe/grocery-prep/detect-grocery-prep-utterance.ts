/** Dish / grocery shopping prep utterances. */
export function isGroceryPrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return (
    /(?:장\s*보|장보|식자재|재료|장\s*봐|grocery|ingredients)/iu.test(trimmed) &&
    /(?:만들|요리| cook|recipe|찜닭|라면|달걀|계란)/iu.test(trimmed)
  );
}

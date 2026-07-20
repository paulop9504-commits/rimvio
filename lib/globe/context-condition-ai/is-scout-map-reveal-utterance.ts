/** User asked to see scout results on the map (same intent as [확인하기]). */
export function isScoutMapRevealUtterance(text: string): boolean {
  const line = text.trim();
  if (!line) {
    return false;
  }
  return (
    /지도\s*(에서|에)?\s*(보여|보여\s*줘|보여줘|표시|찍어|꽂아|열어)/iu.test(line) ||
    /맵\s*(에서|에)?\s*(보여|보여\s*줘|보여줘|표시)/iu.test(line) ||
    /(?:show|pin|open).{0,24}(?:on\s+)?(?:the\s+)?map/iu.test(line) ||
    /(?:on\s+)?(?:the\s+)?map.{0,16}(?:show|pin|please)/iu.test(line)
  );
}

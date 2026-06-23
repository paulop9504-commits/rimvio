/** System seed lines replaced by the handshake product hero card. */
export function isMarketHandshakeSeedMessage(body: string): boolean {
  const text = body.trim();
  if (!text) {
    return false;
  }
  if (text.startsWith("[맞는 흔적]")) {
    return true;
  }
  if (text.startsWith("[Aligned trace]")) {
    return true;
  }
  if (text.startsWith("맞는 흔적으로 연결됐어요")) {
    return true;
  }
  if (text.startsWith("Aligned ·")) {
    return true;
  }
  if (/^대화를 시작했어요\s*·/u.test(text)) {
    return true;
  }
  if (/^Chat started\s*·/u.test(text)) {
    return true;
  }
  return false;
}

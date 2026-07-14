/**
 * Detect trip-revise utterances → Intent Execution Timeline profile.
 * Intention cues only — does not mutate Reality.
 */
export function isTripReviseUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return (
    /(?:여행|일정|계획|트립|trip).{0,16}(?:수정|바꿔|변경|고쳐|업데이트)/iu.test(trimmed) ||
    /(?:수정|바꿔|변경|고쳐|업데이트).{0,16}(?:여행|일정|계획|트립|trip)/iu.test(trimmed) ||
    /(?:일본|도쿄|오사카|교토).{0,12}(?:여행).{0,12}(?:수정|바꿔|변경)/iu.test(trimmed)
  );
}

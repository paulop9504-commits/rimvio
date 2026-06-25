const PLACE_TOKENS = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "수원",
  "성남",
  "고양",
  "용인",
  "창원",
  "청주",
  "전주",
  "천안",
  "포항",
  "제주",
  "강남",
  "역삼",
  "홍대",
  "판교",
  "분당",
  "일산",
  "성수",
  "건대",
  "신촌",
  "잠실",
  "송파",
  "마포",
] as const;

export const PLACE_TOKENS_FOR_PARSE = PLACE_TOKENS;

export function parseMarketPlaceFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  for (const token of PLACE_TOKENS) {
    if (trimmed.includes(token)) {
      return token;
    }
  }
  return null;
}

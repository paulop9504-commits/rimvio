/**
 * Rimvio Command Router registry — source of truth for @ command tokens.
 * Aliases must stay aligned with `mention-feature-registry` where applicable.
 */
export const RIMVIO_COMMAND_REGISTRY = [
  "길찾기",
  "네비",
  "역",
  "주유",
  "택시",
  "알림",
  "일정정리",
  "점심",
  "출근",
  "캘린더",
  "퇴근",
  "할일",
  "가격",
  "더치",
  "송금",
  "영수증",
  "쿠폰",
  "팁",
  "환율",
  "식사",
  "배달",
  "픽업",
  "날씨",
  "다시",
  "대화끝",
  "링크",
  "링크시트",
  "메모",
  "물",
  "방해금지",
  "번역",
  "복붙",
  "우산",
  "운동",
  "전화",
  "주차",
  "지금",
  "집중",
  "친추",
  "캡처",
  "타이머",
  "택배",
  "톡",
  "검색",
] as const;

export type RimvioCommandToken = (typeof RIMVIO_COMMAND_REGISTRY)[number];

const TOKEN_SET = new Set<string>(RIMVIO_COMMAND_REGISTRY);

export function isRimvioCommandToken(token: string): boolean {
  return TOKEN_SET.has(token.trim().toLowerCase());
}

export const FALLBACK_COMMAND: RimvioCommandToken = "검색";

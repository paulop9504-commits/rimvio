/**
 * Stage 0 — collapse noise before intent extraction.
 * Profanity is stripped for parsing only; original is preserved upstream.
 */

const FILLER_PATTERN =
  /(?:\b(?:um|uh|like|you know)\b|(?:음|어|그|아+|흠|뭐|좀|그냥|일단|진짜|literally)+)/giu;

const AFFIRM_SLANG = /\b(?:ㅇㅇ|ㅇㅋ|ㄱㄱ|ㄱㄴ|ok+|okay|yep|yeah)\b/giu;

const WHITESPACE = /\s+/g;

/** Common mobile typo / slang normalizations (Korean + dev shorthand). */
const REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/(?:안대|안댐|안됨|안돼)/giu, "안됨"],
  [/(?:개같|개판|개빡|개빡침)/giu, "매우"],
  [/(?:비싼거|비쌈|비쌈)/giu, "비싼 것"],
  [/(?:맛집|맛집도|밥집)/giu, "맛집"],
  [/(?:숙소|호텔|잠잘곳)/giu, "숙소"],
  [/(?:체크인|체크인)/giu, "체크인"],
  [/(?:늦을듯|늦음|지각)/giu, "늦을 것 같음"],
  [/(?:길찾|내비|네비)/giu, "길찾기"],
  [/(?:미팅|미팅|회의)/giu, "미팅"],
  [/(?:리스크|위험|리스키)/giu, "리스크"],
  [/(?:짐|캐리어|가방)/giu, "짐"],
  [/(?:코드|코딩|개발)/giu, "코드"],
  [/(?:버그|에러|오류)/giu, "버그"],
  [/(?:스크롤|스크롤링)/giu, "스크롤"],
  [/(?:리액트|react)/giu, "React"],
  [/(?:ㅠ+|ㅜ+|T_T|OTL)/giu, " "],
  [/[…]+/gu, " "],
];

const PROFANITY_FOR_PARSE = /(?:씨발|시발|ㅅㅂ|ㅂㅅ|병신|개새|fuck|shit|damn)/giu;

export type NormalizeMessyInputResult = {
  original: string;
  normalized: string;
  collapsed: string;
};

export function normalizeMessyInput(raw: string): NormalizeMessyInputResult {
  const original = raw.trim();
  if (!original) {
    return { original: "", normalized: "", collapsed: "" };
  }

  let text = original.normalize("NFKC");
  text = text.replace(PROFANITY_FOR_PARSE, " ");
  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(AFFIRM_SLANG, " ");
  text = text.replace(FILLER_PATTERN, " ");
  text = text.replace(WHITESPACE, " ").trim();

  const collapsed = text
    .replace(/[,.!?~]+/g, " ")
    .replace(WHITESPACE, " ")
    .trim()
    .toLowerCase();

  return {
    original,
    normalized: text,
    collapsed,
  };
}

/**
 * Action Ontology — 14 ActionVerbs (ADR-035).
 * Upper layer above IntentFamily; classifies the verb/intent shape
 * before domain-specific IntentFamily resolution.
 */

export const ACTION_VERBS = [
  "create",
  "search",
  "move",
  "book",
  "prepare",
  "edit",
  "decision",
  "analyze",
  "memory",
  "resume",
  "share",
  "action",
  "cancel",
  "auto",
] as const;

export type ActionVerb = (typeof ACTION_VERBS)[number];

type VerbPattern = readonly [ActionVerb, RegExp];

const VERB_PATTERNS: readonly VerbPattern[] = [
  [
    "resume",
    /(?:이어(?:줘|서|가|주세요)|계속(?:해|해\s*줘|진행)|다시\s*(?:열어|시작|해)|불러(?:와|와\s*줘|줘)|resume|돌아가)/iu,
  ],
  [
    "cancel",
    /(?:취소(?:해|해\s*줘)?|되돌려|되돌려\s*줘|빼\s*줘|빼줘|빼\s*버려|원래\s*대로|undo|cancel|rollback)/iu,
  ],
  [
    "auto",
    /(?:알아서\s*해|맡길게|다\s*해\s*줘|자동으로|알아서|맡겨|auto|delegate)/iu,
  ],
  [
    "share",
    /(?:공유(?:해|해\s*줘|하자)?|보내(?:줘|줄래)?|초대(?:해|해\s*줘)?|카톡으로|링크로\s*(?:보내|공유)|share)/iu,
  ],
  [
    "book",
    /(?:예약(?:해|해\s*줘|할게|할래)?|예매|잡아(?:줘|요|주세요)?|부킹|reserve|book|구매(?:해|해\s*줘)?|결제|purchase|pay)/iu,
  ],
  [
    "action",
    /(?:실행(?:해|해\s*줘)?|진행(?:해|해\s*줘)?|적용(?:해|해\s*줘)?|확정|commit|execute|apply)/iu,
  ],
  [
    "move",
    /(?:이동(?:해|해\s*줘)?|옮겨(?:줘|요|주세요)?|안내(?:해|해\s*줘)?|길\s*찾|내비|navigate|가는\s*길|가는\s*방법)/iu,
  ],
  [
    "decision",
    /(?:비교(?:해|해\s*줘)?|골라(?:줘)?|어느\s*게|뭐가\s*더|vs\b|compare|pick|choose)/iu,
  ],
  [
    "analyze",
    /(?:분석(?:해|해\s*줘)?|예상(?:해|해\s*줘)?|계산(?:해|해\s*줘)?|시뮬레이션|predict|analyze|calculate|만약|이라면)/iu,
  ],
  [
    "memory",
    /(?:저장(?:해|해\s*줘)?|기억(?:해|해\s*줘)?|기록(?:해|해\s*줘)?|메모(?:해|해\s*줘)?|적어(?:줘)?|핀\s*(?:해|찍|고정)|pin\b)/iu,
  ],
  [
    "edit",
    /(?:바꿔(?:줘)?|수정(?:해|해\s*줘)?|추가(?:해|해\s*줘)?|변경(?:해|해\s*줘)?|삭제|지워|없애|제거|edit|modify|update|add|remove)/iu,
  ],
  [
    "prepare",
    /(?:준비(?:해|해\s*줘)?|챙겨(?:줘)?|세팅(?:해|해\s*줘)?|셋업|setup|정리(?:해|해\s*줘)?)/iu,
  ],
  [
    "search",
    /(?:찾아(?:줘|봐)?|추천(?:해|해\s*줘)?|보여(?:줘)?|알려(?:줘)?|검색|주변|근처|어디|search|find|recommend|show)/iu,
  ],
  [
    "create",
    /(?:만들(?:어|어\s*줘)?|짜\s*줘|계획(?:해|해\s*줘)?|생성|create|plan|새로)/iu,
  ],
] as const;

/**
 * Classify an utterance into one of 14 ActionVerbs.
 * Returns `null` when no verb pattern matches.
 */
export function classifyActionVerb(utterance: string): ActionVerb | null {
  const text = utterance.trim();
  if (!text) return null;

  for (const [verb, pattern] of VERB_PATTERNS) {
    if (pattern.test(text)) return verb;
  }

  return null;
}

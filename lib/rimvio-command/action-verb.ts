/**
 * Action Ontology — 14 ActionVerbs (ADR-035 · ADR-053 Phase 2).
 * Upper layer above IntentFamily; classifies the verb/intent shape
 * before domain-specific IntentFamily resolution.
 *
 * Product taxonomy (CREATE · DISCOVER · …) is UX alias only — not a new enum.
 * First-match order matters; see ADR-053 pattern-order hazards.
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
    /(?:이어(?:줘|서|가|주세요)|계속(?:해|해\s*줘|진행)|다시\s*(?:열어|시작|해)|불러(?:와|와\s*줘|줘)|resume|돌아가|(?:작업장|워크스페이스|workspace)\s*(?:띄워|열어|펼쳐))/iu,
  ],
  [
    "cancel",
    /(?:취소(?:해|해\s*줘)?|되돌려|되돌려\s*줘|빼\s*줘|빼줘|빼\s*버려|삭제(?:해|해\s*줘)?|제거(?:해|해\s*줘)?|원래\s*대로|undo|cancel|rollback)/iu,
  ],
  [
    "auto",
    /(?:알아서\s*해|맡길게|다\s*해\s*줘|자동으로|알아서|맡겨|처리(?:해|해\s*줘)?|auto|delegate)|^(?:그냥\s*)?해줘$/iu,
  ],
  [
    "share",
    /(?:공유(?:해|해\s*줘|하자)?|보내(?:줘|줄래)?|초대(?:해|해\s*줘)?|카톡으로|링크로\s*(?:보내|공유)|share)/iu,
  ],
  [
    "book",
    /(?:예약(?:해|해\s*줘|할게|할래)?|예매|잡아(?:줘|요|주세요)?|부킹|reserve|book|구매(?:해|해\s*줘)?|결제(?:해|해\s*줘)?|신청(?:해|해\s*줘)?|등록(?:해|해\s*줘)?|purchase|pay)/iu,
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
    /(?:분석(?:해|해\s*줘)?|평가(?:해|해\s*줘)?|검토(?:해|해\s*줘)?|파악(?:해|해\s*줘)?|판단(?:해|해\s*줘)?|살펴(?:봐|봐\s*줘)?|정리(?:해|해\s*줘)?|예상(?:해|해\s*줘)?|계산(?:해|해\s*줘)?|시뮬레이션(?:해|해\s*줘)?|가정(?:해|해\s*줘)?|테스트(?:해|해\s*줘)?|predict|analyze|calculate|만약|이라면)/iu,
  ],
  [
    "memory",
    /(?:저장(?:해|해\s*줘)?|기억(?:해|해\s*줘)?|기록(?:해|해\s*줘)?|남겨(?:줘)?|메모(?:해|해\s*줘)?|적어(?:줘)?|핀\s*(?:해|찍|고정)|pin\b)/iu,
  ],
  [
    "edit",
    /(?:바꿔(?:줘)?|수정(?:해|해\s*줘)?|추가(?:해|해\s*줘)?|넣어(?:줘)?|변경(?:해|해\s*줘)?|최적화(?:해|해\s*줘)?|줄여(?:줘)?|늘려(?:줘)?|맞춰(?:줘)?|개선(?:해|해\s*줘)?|효율화(?:해|해\s*줘)?|가볍게\s*(?:해(?:줘)?|만들)|지워|없애|edit|modify|update|add|remove|optimize)/iu,
  ],
  [
    "prepare",
    /(?:준비(?:해|해\s*줘)?|챙겨(?:줘)?|세팅(?:해|해\s*줘)?|셋업|setup|묶어(?:줘)?|나눠(?:줘)?|이름\s*붙여(?:줘)?)/iu,
  ],
  [
    "search",
    /(?:찾아(?:줘|봐)?|추천(?:해|해\s*줘)?|보여(?:줘)?|알려(?:줘)?|탐색(?:해|해\s*줘)?|확인(?:해|해\s*줘)?|알아봐|검색(?:해|해\s*줘)?|깔아(?:줘|놔)?|띄워(?:줘)?|올려(?:줘)?|켜(?:줘)?|표시(?:해|해\s*줘)?|주변|근처|어디|search|find|recommend|show|display)/iu,
  ],
  [
    "create",
    /(?:만들(?:어|어\s*줘)?|짜\s*줘|구성(?:해|해\s*줘)?|설계(?:해|해\s*줘)?|계획(?:해|해\s*줘)?|생성(?:해|해\s*줘)?|create|plan|새로)/iu,
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

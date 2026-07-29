/**
 * Turn Intent Classifier
 *
 * Every user utterance is classified into one of 5 intents:
 *   patch   — modify current context (location, duration, budget, etc.)
 *   execute — run a task within current context (search, reserve, etc.)
 *   query   — ask a question (no state mutation)
 *   create  — explicitly start a new context
 *   switch  — switch to a different existing context
 *
 * Default is PATCH — "keep working in current context".
 * CREATE only triggers on explicit signals.
 */

export const TURN_INTENTS = ["patch", "execute", "query", "create", "switch"] as const;
export type TurnIntent = (typeof TURN_INTENTS)[number];

const CREATE_SIGNALS = [
  /새\s*(여행|맥락|프로젝트|작업|계획|문서|Context)/i,
  /다른\s*(여행|프로젝트)/i,
  /new\s+(trip|project|context|plan)/i,
  /만들자/,
  /시작하자/,
  /처음부터/,
];

const SWITCH_SIGNALS = [
  /(.+)(으로|로)\s*전환/,
  /(.+)\s*(열어|열기|이어서)/,
  /switch\s+to/i,
  /resume\s+/i,
];

const QUERY_SIGNALS = [
  /\?$/,
  /뭐야|뭔가요|알려줘|설명해|어때|어떤가/,
  /what\s+is|how\s+(do|does|can)|explain/i,
  /비교해\s*줘/,
];

const EXECUTE_SIGNALS = [
  /찾아줘|검색|예약|결제|취소/,
  /search|book|reserve|cancel|pay/i,
  /해줘$|해\s*줘$|실행/,
  /추가해|넣어|등록/,
];

export type TurnIntentResult = {
  readonly intent: TurnIntent;
  readonly confidence: number;
  readonly reason: string;
};

export function classifyTurnIntent(
  utterance: string,
  hasActiveContext: boolean,
): TurnIntentResult {
  const text = utterance.trim();

  // CREATE — explicit new context signal
  for (const pat of CREATE_SIGNALS) {
    if (pat.test(text)) {
      return { intent: "create", confidence: 0.95, reason: "새 맥락 생성 신호" };
    }
  }

  // SWITCH — explicit context switch
  for (const pat of SWITCH_SIGNALS) {
    if (pat.test(text)) {
      return { intent: "switch", confidence: 0.9, reason: "맥락 전환 신호" };
    }
  }

  // No active context → must create
  if (!hasActiveContext) {
    return { intent: "create", confidence: 0.8, reason: "활성 맥락 없음 — 새로 생성" };
  }

  // QUERY — questions don't mutate
  for (const pat of QUERY_SIGNALS) {
    if (pat.test(text)) {
      return { intent: "query", confidence: 0.85, reason: "질문 — 상태 변경 없음" };
    }
  }

  // EXECUTE — action commands within context
  for (const pat of EXECUTE_SIGNALS) {
    if (pat.test(text)) {
      return { intent: "execute", confidence: 0.85, reason: "현재 맥락 내 작업 실행" };
    }
  }

  // Default: PATCH — modify current context
  return { intent: "patch", confidence: 0.7, reason: "현재 맥락 수정 (기본)" };
}

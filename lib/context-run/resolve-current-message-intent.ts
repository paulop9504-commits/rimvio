/**
 * Intent Switch Gate — Current User Message wins over Conversation History.
 *
 * Current Message → Intent
 *   NEW / Direct → pause travel context, answer now (no Planner)
 *   SAME → merge constraints / continue Planner
 */

export type CurrentMessageIntentKind =
  | "math_direct"
  | "offtopic_direct"
  | "continue";

export type CurrentMessageIntent = {
  readonly kind: CurrentMessageIntentKind;
  /** When set, reply immediately without LLM / Planner / travel history. */
  readonly directAnswerKo: string | null;
  /** Strip chat history for this turn (Travel Context Pause). */
  readonly pauseTravelContext: boolean;
};

const MATH_EQ_RE =
  /^\s*(?:(?:몇\s*[은는이가]?\s*)?|what\s+is\s+)?(\d{1,6})\s*([\+\-\*\/×÷xX])\s*(\d{1,6})\s*(?:=\s*\??|\s*\?|？)?\s*$/u;

const MATH_ASK_RE =
  /^(?:간단한\s*)?(?:산수|계산|더하기|빼기|곱하기|나누기)/iu;

/** Trivia / jokes / school Q that must not stay locked in Travel. */
const OFFTOPIC_DIRECT_RE =
  /^(?:왜\s*하늘|하늘은\s*왜|지구는|태양은|피타고라스|수도가\s*어디|농담|웃긴\s*얘기|깜짝|퀴즈)/iu;

function evalMath(
  a: number,
  op: string,
  b: number,
): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
    case "×":
    case "x":
    case "X":
      return a * b;
    case "/":
    case "÷":
      return b === 0 ? null : a / b;
    default:
      return null;
  }
}

function formatMathAnswer(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

/**
 * Classify current utterance before any Planner / travel follow-up.
 * Prefer this over Conversation History.
 */
export function resolveCurrentMessageIntent(
  utterance: string,
): CurrentMessageIntent {
  const text = utterance.trim();
  if (!text) {
    return {
      kind: "continue",
      directAnswerKo: null,
      pauseTravelContext: false,
    };
  }

  const math = text.match(MATH_EQ_RE);
  if (math?.[1] && math[2] && math[3]) {
    const a = Number(math[1]);
    const b = Number(math[3]);
    const value = evalMath(a, math[2], b);
    if (value != null && Number.isFinite(value)) {
      return {
        kind: "math_direct",
        directAnswerKo: `${formatMathAnswer(value)}`,
        pauseTravelContext: true,
      };
    }
  }

  if (MATH_ASK_RE.test(text) && /\d/.test(text)) {
    return {
      kind: "math_direct",
      directAnswerKo: "식을 `1+1=?`처럼 보내주면 바로 계산할게요.",
      pauseTravelContext: true,
    };
  }

  if (OFFTOPIC_DIRECT_RE.test(text)) {
    return {
      kind: "offtopic_direct",
      directAnswerKo: null,
      pauseTravelContext: true,
    };
  }

  // Short Q that is clearly not travel/workspace and ends with ?
  // e.g. 「수도가 어디야?」 already covered; bare school-style.
  if (
    text.length <= 40 &&
    /[?？]$/u.test(text) &&
    !/(?:여행|일정|호텔|숙소|맛집|오사카|도쿄|계획|액티비티|찾아|예약)/iu.test(
      text,
    ) &&
    /^(?:\d|몇|왜|언제|누가|무엇|뭐가|어디가|how|what|why|who|where)/iu.test(
      text,
    )
  ) {
    return {
      kind: "offtopic_direct",
      directAnswerKo: null,
      pauseTravelContext: true,
    };
  }

  return {
    kind: "continue",
    directAnswerKo: null,
    pauseTravelContext: false,
  };
}

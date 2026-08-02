/**
 * Parse Object-scoped user intent — never a free-form ChatGPT prompt.
 */

import type {
  ObjectScopedIntent,
  ObjectScopedIntentKind,
} from "@/lib/callout/scoped-prompt/types";

const GENERAL_CHAT_ESCAPE =
  /^(안녕|헬로|hello|hi\b|너는\s*누구|뭐\s*할\s*수|일반\s*질문|세상의|날씨\s*어때|농담)/iu;

export function looksLikeGeneralChatEscape(utterance: string): boolean {
  const t = utterance.trim();
  if (!t) return false;
  // Object-relative asks always stay in scope even if short.
  if (
    /바꿔|바꾸|조식|예약|비교|근처|비슷|싸게|비싸|뷰|위치|동선|준비|만약|가정/u.test(
      t,
    )
  ) {
    return false;
  }
  return GENERAL_CHAT_ESCAPE.test(t) && t.length < 40;
}

function inferAxes(utterance: string): string[] {
  const axes: string[] = [];
  if (/조식|아침|breakfast/iu.test(utterance)) axes.push("breakfast");
  if (/뷰|전망|오션|바다/iu.test(utterance)) axes.push("view");
  if (/싸|저렴|가성비|예산|가격/iu.test(utterance)) axes.push("price");
  if (/위치|역|가깝|동선|중심/iu.test(utterance)) axes.push("location");
  if (/후기|평점|리뷰/iu.test(utterance)) axes.push("review");
  if (/조용|한적/iu.test(utterance)) axes.push("quiet");
  return axes;
}

function intentLabelKo(kind: ObjectScopedIntentKind, axes: readonly string[]): string {
  if (kind === "change") {
    if (axes.includes("breakfast")) return "조식 기준으로 바꾸기";
    if (axes.includes("price")) return "가격 기준으로 바꾸기";
    if (axes.includes("view")) return "뷰 기준으로 바꾸기";
    return "이 객체 기준으로 바꾸기";
  }
  if (kind === "simulate") return "What-if 시험";
  if (kind === "prepare") return "예약 준비";
  if (kind === "compare") return "비교";
  if (kind === "explore") return "주변 탐색";
  return "이 객체에 묻기";
}

/**
 * Classify utterance relative to the focused object.
 * Rejects general-chat escapes.
 */
export function parseObjectScopedIntent(
  utterance: string,
): ObjectScopedIntent | { reject: true; reasonKo: string } {
  const text = utterance.trim();
  if (!text) {
    return { reject: true, reasonKo: "이 객체에게 할 말을 입력해 주세요" };
  }
  if (looksLikeGeneralChatEscape(text)) {
    return {
      reject: true,
      reasonKo: "일반 채팅이 아니라 이 객체에게만 물어볼 수 있어요",
    };
  }

  const axes = inferAxes(text);
  let kind: ObjectScopedIntentKind = "clarify";

  if (/예약\s*준비|준비\s*해|prepare|draft/iu.test(text)) {
    kind = "prepare";
  } else if (/만약|가정|바꾸면|바꾸면\s*어떻게|what\s*-?\s*if|시뮬레이션/iu.test(text)) {
    kind = "simulate";
  } else if (/비교|compare|vs/iu.test(text)) {
    kind = "compare";
  } else if (/주변|근처|nearby|연결|explore/iu.test(text)) {
    kind = "explore";
  } else if (
    /바꿔|바꾸|다른\s*곳|다시\s*찾|찾아|좋아|좋은\s*곳|추천/iu.test(text) ||
    axes.length > 0
  ) {
    kind = "change";
  }

  return {
    kind,
    utterance: text,
    axes,
    labelKo: intentLabelKo(kind, axes),
  };
}

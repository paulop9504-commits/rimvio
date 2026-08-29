/**
 * Goal Resolution — separate user Goal from currentPlatform context (P1).
 */

import type { GoalResolution, UserIntent } from "@/lib/agent/conversation/intent-types";

const SPECIFIC_PLATFORM_SIGNAL =
  /호텔|hotel|booking|예약|여행|travel|marketplace|커머스|commerce|결제|payment|회원|auth|검색|search|부터.*까지/i;

const VAGUE_CREATE =
  /새로\s*(플랫폼|프로젝트)|플랫폼을?\s*(개발|만들)|새\s*플랫폼|new\s*platform|platform\s*from\s*scratch/i;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Resolves whether an executable intent has enough goal detail to start Agent Loop.
 * currentPlatform must never substitute for a missing user goal.
 */
export function resolveGoal(intent: UserIntent, utterance: string): GoalResolution {
  const text = normalize(utterance);

  if (intent === "create") {
    const vague = VAGUE_CREATE.test(text);
    const specific = SPECIFIC_PLATFORM_SIGNAL.test(text) || text.length > 28;
    if (vague && !specific) {
      return {
        ready: false,
        goal: null,
        clarificationKo:
          "좋아요. 어떤 플랫폼을 만들고 싶으신가요? 예: 일본 여행자를 위한 호텔 예약 플랫폼",
      };
    }
  }

  if (intent === "modify" && text.length < 6) {
    return {
      ready: false,
      goal: null,
      clarificationKo: "어떤 기능을 수정할지 조금 더 구체적으로 알려주세요.",
    };
  }

  return { ready: true, goal: text, clarificationKo: null };
}

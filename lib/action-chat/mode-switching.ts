import { isConversationalOnlyMessage } from "@/lib/action-chat/conversation-turns";
import type { WittyButtonWire } from "@/lib/action-chat/confirmation-types";

export type OrchestratorMode = "action" | "conversation";

export type ResponseTone = "WITTY" | "DEFAULT";

export type IntentRouterDecision = {
  mode: OrchestratorMode;
  /** Router "thought" — logged / debuggable, not shown to user raw */
  reason: string;
  tone: ResponseTone;
};

export type WittyConversationWire = {
  thought?: string;
  persona_message: string;
  witty_buttons: WittyButtonWire[];
};

const WITTY_CUE =
  /(?:몇\s*살|나이\s*(?:가\s*)?(?:몇|어떻)|(?:니|너|네)\s*이름|누구(?:야|니|세요)|이름\s*(?:이\s*)?뭐|심심|놀자|놀아|바보|멍청|재미\s*없|ㅋㅋ|ㅎㅎ|장난)/i;

/** Sentiment / playfulness detector for humor mode injection */
export function detectTone(message: string): ResponseTone {
  const trimmed = message.trim();
  if (!trimmed) {
    return "DEFAULT";
  }
  return WITTY_CUE.test(trimmed) ? "WITTY" : "DEFAULT";
}

export function buildToneInstructionLine(tone: ResponseTone): string {
  return tone === "WITTY"
    ? "유머러스하고 위트 있게 대응하라. 버튼·확인 문구도 대화의 연장선으로."
    : "효율적이고 간결하게 대응하라.";
}

/** Small talk — never action mode even if date words appear */
const CHITCHAT =
  /(?:날씨|기분|좋다|좋네|그치|ㅋㅋ|ㅎㅎ|힘들|우울|심심|뭐\s*해|잘\s*지내|고마워|감사|안녕|ㅎㅇ|하이|hello|how\s*are)/i;

const ACTION_VERB =
  /(?:가야|갈\s*거|할\s*거|만날|볼\s*거|저장|등록|예약|일정|약속|길찾|네비|지도|맛집|쇼핑|검색|찾아|알려|열어|추천|캡처|티켓|주소|연락|전화|일정\s*잡)/i;

const ACTION_ENTITY =
  /https?:\/\/|010[-\s]?\d{4}[-\s]?\d{4}|갤러리아|스타벅스|둔산|역삼|맛집|카페/i;

const SCHEDULE_CUE =
  /(?:내일|모레|오늘\s*(?:오전|오후)?\s*\d{1,2}\s*시|\d{1,2}:\d{2}|일정|약속|미팅|회의)/i;

function isChitchatOnly(message: string) {
  if (!CHITCHAT.test(message)) {
    return false;
  }
  return !ACTION_VERB.test(message) && !ACTION_ENTITY.test(message) && !SCHEDULE_CUE.test(message);
}

/**
 * Intent Router — classifies action vs conversation before OpenAI call.
 * Rule-based (~instant); no extra LLM round-trip.
 */
export function classifyIntentRouter(message: string): IntentRouterDecision {
  const trimmed = message.trim();
  const tone = detectTone(trimmed);

  if (!trimmed) {
    return { mode: "conversation", reason: "빈 입력 → 대화 모드", tone };
  }

  if (isConversationalOnlyMessage(trimmed)) {
    return { mode: "conversation", reason: "인사·잡담·감정 표현 → 대화 모드", tone };
  }

  if (isChitchatOnly(trimmed)) {
    return { mode: "conversation", reason: "행동 없는 일상 대화(날씨·감탄 등) → 대화 모드", tone };
  }

  const hasAction =
    ACTION_VERB.test(trimmed) ||
    ACTION_ENTITY.test(trimmed) ||
    SCHEDULE_CUE.test(trimmed) ||
    /https?:\/\//.test(trimmed) ||
    /010[-\s]?\d{4}[-\s]?\d{4}/.test(trimmed);

  if (hasAction) {
    return { mode: "action", reason: "저장·일정·장소·실행 의도 감지 → JSON 액션 모드", tone };
  }

  return { mode: "conversation", reason: "명확한 작업 신호 없음 → 대화 모드", tone };
}

function normalizeWittyButtons(raw: unknown): WittyButtonWire[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const buttons = raw
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const item = row as Record<string, unknown>;
      if (typeof item.label !== "string" || typeof item.action !== "string") {
        return null;
      }
      return { label: item.label.trim(), action: item.action.trim() };
    })
    .filter((row): row is WittyButtonWire => Boolean(row?.label && row?.action));

  return buttons.length > 0 ? buttons.slice(0, 4) : undefined;
}

export function parseWittyConversationJson(raw: string): WittyConversationWire | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const persona_message =
      typeof parsed.persona_message === "string" ? parsed.persona_message.trim() : "";
    const witty_buttons = normalizeWittyButtons(parsed.witty_buttons);

    if (!persona_message || !witty_buttons?.length) {
      return null;
    }

    const thought = typeof parsed.thought === "string" ? parsed.thought.trim() : undefined;

    return { thought, persona_message, witty_buttons };
  } catch {
    return null;
  }
}

/** @deprecated use classifyIntentRouter */
export function detectActionIntent(message: string): boolean {
  return classifyIntentRouter(message).mode === "action";
}

export function resolveOrchestratorMode(message: string): OrchestratorMode {
  return classifyIntentRouter(message).mode;
}

export function parseConversationalAssistantText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { summary?: string; text?: string };
      if (typeof parsed.summary === "string") {
        return parsed.summary.trim();
      }
      if (typeof parsed.text === "string") {
        return parsed.text.trim();
      }
    } catch {
      // fall through — treat as plain text
    }
  }

  return trimmed.replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/, "").trim();
}

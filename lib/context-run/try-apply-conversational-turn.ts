/**
 * Conversational turn — greetings · free-talk · knowledge Q&A.
 * Never Patch / Scout / Commit. LLM when available; short fallback otherwise.
 *
 * Intent Switch: Current message wins. Math / offtopic pause Travel history.
 */

import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { looksLikeAgentFreeTalk } from "@/lib/context-run/looks-like-agent-free-talk";
import { resolveCurrentMessageIntent } from "@/lib/context-run/resolve-current-message-intent";
import {
  looksLikeWeatherFactAsk,
  tryFetchWeatherFactReply,
} from "@/lib/context-run/try-fetch-weather-fact-reply";
import { resolveSmallTalk } from "@/lib/globe/context-condition-ai/resolve-small-talk";
import { generateSmallTalkReply } from "@/lib/globe/context-condition-ai/small-talk/generate-small-talk-reply";
import type { SmallTalkTurn } from "@/lib/globe/context-condition-ai/small-talk/small-talk-context";

export type ConversationalTurnResult = {
  readonly handled: true;
  readonly replyKo: string;
  readonly mode: "free_talk" | "knowledge" | "chat" | "direct";
  readonly source: "llm" | "deterministic" | "learned";
  /** Travel Context paused for this turn */
  readonly pausedTravelContext?: boolean;
};

/** Soft knowledge / open chat — not hotel scout / schedule Patch. */
export function looksLikeConversationalAsk(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  if (isWorkspaceAgentWorkUtterance(text)) return false;
  if (resolveCurrentMessageIntent(text).kind !== "continue") return true;
  if (looksLikeStrictConversationalAsk(text)) return true;
  // Broad chat while Workspace open — anything that isn’t work.
  return text.length <= 280;
}

/**
 * Globe planner gate — greetings · free-talk · knowledge Q only.
 * Memos / marketplace / trip frames must fall through other plan kinds.
 */
export function looksLikeStrictConversationalAsk(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  if (isWorkspaceAgentWorkUtterance(text)) return false;
  if (resolveCurrentMessageIntent(text).kind !== "continue") return true;
  if (looksLikeWeatherFactAsk(text)) return true;
  if (looksLikeAgentFreeTalk(text) || resolveSmallTalk({ text })) return true;

  // Knowledge / casual Q — allow LLM essay (user OK with longer).
  if (
    /^(?:뭐|왜|어떻게|언제|누구|몇|알려|설명|의미|뜻|차이|생각해|추천\s*만|뭐야|뭐예요|뭐지|뭔데)/iu.test(
      text,
    )
  ) {
    return true;
  }
  if (
    /\?|？|인가요|일까요|거예요|거야|죠\s*\?|지\s*\?|뭐야|뭐예요|뭔데|뭔가요|알려\s*줘|설명해|무슨\s*뜻|what\s+is|why\s+|how\s+|tell\s+me/iu.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

async function generateKnowledgeReply(input: {
  readonly text: string;
  readonly history?: readonly SmallTalkTurn[];
  readonly scopeId?: string | null;
  readonly prioritizeCurrent?: boolean;
}): Promise<{ replyKo: string; source: "llm" | "deterministic" }> {
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/globe/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text,
          history: input.prioritizeCurrent
            ? []
            : (input.history ?? []).slice(-8),
          prioritizeCurrent: input.prioritizeCurrent === true,
          scopeId: input.scopeId ?? null,
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { replyKo?: unknown };
        if (
          typeof payload.replyKo === "string" &&
          payload.replyKo.trim().length > 0
        ) {
          return { replyKo: payload.replyKo.trim(), source: "llm" };
        }
      }
    } catch {
      /* fall through */
    }
  }
  return {
    replyKo:
      "좋은 질문이에요. 지금은 짧게만 답할 수 있어요 — 한 번 더 구체적으로 물어봐 주실래요?",
    source: "deterministic",
  };
}

/**
 * Non-work utterance → conversational reply (free-talk or knowledge LLM).
 * Null when caller should run Workspace Agent Loop instead.
 */
export async function tryApplyConversationalTurn(input: {
  readonly utterance: string;
  readonly scopeId?: string | null;
  readonly regionKo?: string | null;
  readonly history?: readonly SmallTalkTurn[];
}): Promise<ConversationalTurnResult | null> {
  const utterance = input.utterance.trim();
  if (!utterance || isWorkspaceAgentWorkUtterance(utterance)) {
    return null;
  }

  const intent = resolveCurrentMessageIntent(utterance);
  if (intent.kind === "math_direct" && intent.directAnswerKo) {
    return {
      handled: true,
      replyKo: intent.directAnswerKo,
      mode: "direct",
      source: "deterministic",
      pausedTravelContext: true,
    };
  }

  // Fact: temperature / weather must answer with live data — never travel follow-up.
  if (looksLikeWeatherFactAsk(utterance)) {
    const weatherReply = await tryFetchWeatherFactReply({
      utterance,
      fallbackLocationKo: input.regionKo,
    });
    if (weatherReply) {
      return {
        handled: true,
        replyKo: weatherReply,
        mode: "direct",
        source: "deterministic",
        pausedTravelContext: true,
      };
    }
  }

  if (!looksLikeConversationalAsk(utterance)) {
    return null;
  }

  const history = intent.pauseTravelContext ? [] : input.history;

  const isFree =
    looksLikeAgentFreeTalk(utterance) ||
    Boolean(resolveSmallTalk({ text: utterance }));

  if (isFree && intent.kind === "continue") {
    const gen = await generateSmallTalkReply({
      text: utterance,
      region: input.regionKo ?? null,
      scopeId: input.scopeId ?? null,
      history,
    });
    const replyKo = gen.replyKo.trim();
    if (!replyKo) return null;
    return {
      handled: true,
      replyKo,
      mode: "free_talk",
      source: gen.source,
    };
  }

  const knowledge = await generateKnowledgeReply({
    text: utterance,
    history,
    scopeId: input.scopeId ?? null,
    prioritizeCurrent: intent.pauseTravelContext,
  });
  return {
    handled: true,
    replyKo: knowledge.replyKo,
    mode: intent.pauseTravelContext ? "direct" : "knowledge",
    source: knowledge.source,
    pausedTravelContext: intent.pauseTravelContext,
  };
}

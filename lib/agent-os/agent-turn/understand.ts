/**
 * Understand — NL request → structured intent. Uses conversation gate + memory.
 */

import { classifyIntent } from "@/lib/agent/conversation/classify-intent";
import { isExecutableIntent } from "@/lib/agent/conversation/classify-intent";
import type { ConversationContext, UserIntent } from "@/lib/agent/conversation/intent-types";
import type { OperatorConversationMemory } from "@/lib/hub/dev/conversation-memory";
import type { AgentTurnUnderstand } from "@/lib/agent-os/agent-turn/types";

const DOMAIN_HINTS: readonly { readonly re: RegExp; readonly domain: string }[] = [
  { re: /배달|delivery|restaurant|음식점|메뉴/, domain: "delivery_marketplace" },
  { re: /호텔|lodging|숙소|예약/, domain: "lodging" },
  { re: /결제|payment|stripe/, domain: "commerce_payment" },
  { re: /주문|order/, domain: "commerce_order" },
  { re: /github|깃허브|vercel|supabase/, domain: "platform_connection" },
];

const ENTITY_HINTS: readonly { readonly re: RegExp; readonly entity: string }[] = [
  { re: /주문/, entity: "order" },
  { re: /메뉴/, entity: "menu" },
  { re: /음식점|식당|레스토랑/, entity: "restaurant" },
  { re: /결제/, entity: "payment" },
  { re: /사용자|회원/, entity: "user" },
];

function firstMatch(
  text: string,
  hints: ReadonlyArray<{ re: RegExp; domain?: string; entity?: string }>,
  key: "domain" | "entity",
): string | null {
  for (const h of hints) {
    if (h.re.test(text)) return String(h[key]);
  }
  return null;
}

function requestedState(text: string): string | null {
  if (/배달중|delivering/.test(text)) return "delivering";
  if (/완료|delivered|done/.test(text)) return "completed";
  if (/준비|preparing/.test(text)) return "preparing";
  return null;
}

function requestedOutcome(intent: UserIntent, text: string, domain: string | null): string {
  if (intent === "inspect") return "current_state_report";
  if (intent === "test") return "verified_existing_work";
  if (intent === "connect") return "connected_provider";
  if (intent === "publish") return "publish_ready";
  if (intent === "create" && domain === "delivery_marketplace") return "working_delivery_platform";
  if (intent === "create") return "working_application";
  if (intent === "modify" && /상태/.test(text)) return "updated_entity_state";
  if (intent === "modify") return "updated_application";
  return text.slice(0, 80);
}

function actionFromIntent(intent: UserIntent, text: string): string | null {
  if (intent === "inspect") return "inspect";
  if (intent === "test") return "run_tests";
  if (intent === "connect") return "connect_provider";
  if (intent === "publish") return "publish";
  if (/상태/.test(text) && /바꿔|변경|업데이트/.test(text)) return "update_status";
  if (intent === "create") return "create_application";
  if (intent === "modify") return "modify_application";
  return null;
}

export function understandRequest(input: {
  readonly utterance: string;
  readonly memory?: OperatorConversationMemory | null;
  readonly context?: ConversationContext;
}): AgentTurnUnderstand {
  const classified = classifyIntent(input.utterance, {
    ...input.context,
    currentGoal: input.context?.currentGoal ?? input.memory?.currentGoal ?? null,
    currentTask: input.context?.currentTask ?? input.memory?.currentTask ?? null,
    history: input.context?.history ?? input.memory?.history,
  });
  const domain = firstMatch(input.utterance, DOMAIN_HINTS, "domain");
  const entity = firstMatch(input.utterance, ENTITY_HINTS, "entity");
  const executable = isExecutableIntent(classified.intent);

  return {
    intent: classified.intent,
    domain,
    entity,
    action: actionFromIntent(classified.intent, input.utterance),
    requestedOutcome: requestedOutcome(classified.intent, input.utterance, domain),
    requestedState: requestedState(input.utterance),
    conversational: !executable,
    executable,
    confidence: classified.confidence,
    reason: classified.reason,
  };
}

export function isPauseUtterance(utterance: string): boolean {
  return /^(잠깐|멈춰|중지|스톱|stop|pause|기다려)$/i.test(utterance.trim());
}

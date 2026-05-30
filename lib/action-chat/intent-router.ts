import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type {
  IntentRouteMeta,
  OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";

export type IntentType = IntentRouteMeta["intent_type"];

export type IntentRoute = IntentRouteMeta & {
  current_topic: string | null;
  relevance_score: number;
};

const FOLLOW_UP_CUES =
  /(?:그럼|그거|그곳|거기|다른\s*날|가격|얼마|영업|전화|네비|또|더|이\s*가게|아까|방금|거기서|주차|메뉴|쿠폰|예약\s*가능|몇\s*시|영업시간)/i;

const NEW_TASK_CUES =
  /(?:일정\s*(?:잡|등록|추가|만들|넣)|예약\s*해|새로\s*(?:찾|잡|등록)|다른\s*(?:곳|장소|맛집)|(?:경기장|월드컵|체육관|운동장).*일정)/i;

const DOMAIN_CUES: Array<{ domain: string; pattern: RegExp }> = [
  { domain: "dining", pattern: /맛집|식당|카페|뷔페|쿠우쿠우|레스토랑|술집|치킨|피자/ },
  { domain: "venue", pattern: /월드컵|경기장|운동장|체육관|구장|스타디움/ },
  { domain: "weather", pattern: /태풍|날씨|기상|폭우|미세먼지|강수/ },
  { domain: "travel", pattern: /여행|호텔|항공|제주|오사카|숙소|펜션/ },
  { domain: "shopping", pattern: /쇼핑|구매|최저가|쿠팡|마켓/ },
];

function priorHistory(
  history: OrchestrateHistoryTurn[] | undefined,
  currentMessage: string
): OrchestrateHistoryTurn[] {
  const turns = history ?? [];
  if (turns.length === 0) {
    return [];
  }

  const last = turns[turns.length - 1];
  if (last?.role === "user" && last.content.trim() === currentMessage.trim()) {
    return turns.slice(0, -1);
  }

  return turns;
}

export function topicTokens(text: string): string[] {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 2);
}

export function extractCurrentTopic(input: {
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
  currentMessage: string;
}): string | null {
  const prior = priorHistory(input.history, input.currentMessage);

  for (let index = prior.length - 1; index >= 0; index -= 1) {
    const turn = prior[index]!;
    if (turn.role === "assistant" && turn.content.trim().length >= 4) {
      const cleaned = turn.content
        .replace(/컨테이너.*$/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length >= 4) {
        return cleaned.slice(0, 60);
      }
    }
  }

  for (let index = prior.length - 1; index >= 0; index -= 1) {
    const turn = prior[index]!;
    if (turn.role === "user" && turn.content.trim().length >= 4) {
      return turn.content.trim().slice(0, 60);
    }
  }

  if (input.linkTitle?.trim()) {
    return input.linkTitle.trim().slice(0, 60);
  }

  return null;
}

function detectDomain(text: string): string | null {
  for (const cue of DOMAIN_CUES) {
    if (cue.pattern.test(text)) {
      return cue.domain;
    }
  }
  return null;
}

export function scoreTopicRelevance(currentTopic: string | null, newInput: string): number {
  if (!currentTopic?.trim()) {
    return 0;
  }

  const topicSet = new Set(topicTokens(currentTopic));
  const inputTokens = topicTokens(newInput);
  if (inputTokens.length === 0) {
    return 0;
  }

  let hits = 0;
  for (const token of inputTokens) {
    if (topicSet.has(token)) {
      hits += 1;
    }
  }

  return hits / inputTokens.length;
}

export function resolveIntentRoute(input: {
  message: string;
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
}): IntentRoute {
  const message = input.message.trim();
  const currentTopic = extractCurrentTopic({
    history: input.history,
    linkTitle: input.linkTitle,
    currentMessage: message,
  });
  const relevanceScore = scoreTopicRelevance(currentTopic, message);
  const prior = priorHistory(input.history, message);
  const hasPriorContext = Boolean(currentTopic) || prior.length > 0;

  if (!hasPriorContext) {
    return {
      intent_type: "NEW_TASK",
      requires_context_switch: false,
      current_topic: null,
      relevance_score: relevanceScore,
    };
  }

  if (FOLLOW_UP_CUES.test(message)) {
    return {
      intent_type: "FOLLOW_UP",
      requires_context_switch: false,
      current_topic: currentTopic,
      relevance_score: Math.max(relevanceScore, 0.5),
    };
  }

  const messageDomain = detectDomain(message);
  const topicDomain = currentTopic ? detectDomain(currentTopic) : null;
  const domainShift =
    messageDomain && topicDomain && messageDomain !== topicDomain;

  if (NEW_TASK_CUES.test(message) && relevanceScore < 0.25) {
    return {
      intent_type: "NEW_TASK",
      requires_context_switch: true,
      current_topic: currentTopic,
      relevance_score: relevanceScore,
    };
  }

  if (domainShift && relevanceScore < 0.35) {
    return {
      intent_type: "NEW_TASK",
      requires_context_switch: true,
      current_topic: currentTopic,
      relevance_score: relevanceScore,
    };
  }

  if (relevanceScore >= 0.2) {
    return {
      intent_type: "FOLLOW_UP",
      requires_context_switch: false,
      current_topic: currentTopic,
      relevance_score: relevanceScore,
    };
  }

  return {
    intent_type: "NEW_TASK",
    requires_context_switch: true,
    current_topic: currentTopic,
    relevance_score: relevanceScore,
  };
}

export function applyContextIsolation<T extends {
  message: string;
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
  linkUrl?: string | null;
  linkCategory?: string | null;
}>(input: T, route: IntentRoute): T {
  if (!route.requires_context_switch) {
    return input;
  }

  const mentionsLink =
    Boolean(input.linkTitle?.trim()) &&
    topicTokens(input.linkTitle ?? "").some((token) => input.message.toLowerCase().includes(token));

  return {
    ...input,
    history: [],
    linkTitle: mentionsLink ? input.linkTitle : null,
    linkUrl: mentionsLink ? input.linkUrl : null,
    linkCategory: mentionsLink ? input.linkCategory : null,
  };
}

export function stripPriorTopicReferences(summary: string, priorTopic: string): string {
  let cleaned = summary;

  for (const token of topicTokens(priorTopic)) {
    if (token.length < 2) {
      continue;
    }
    cleaned = cleaned.replace(new RegExp(token, "gi"), "");
  }

  cleaned = cleaned
    .replace(/(?:아까|이전|그\s*맛집|그\s*가게|방금\s*말한)\S*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 80) || summary;
}

export function buildIntentRouteUserBlock(route: IntentRoute): string | null {
  if (route.intent_type === "NEW_TASK" && route.requires_context_switch) {
    const prior = route.current_topic ? ` (ignore prior topic: "${route.current_topic}")` : "";
    return `[Intent_Route]: NEW_TASK — treat as a fresh request${prior}. Do NOT mention earlier conversation topics. Respond only to the new user message.`;
  }

  if (route.intent_type === "FOLLOW_UP" && route.current_topic) {
    return `[Intent_Route]: FOLLOW_UP — continue current topic: "${route.current_topic}".`;
  }

  return null;
}

export function applyIntentRouteToResult(
  result: OrchestratorResult,
  route: IntentRoute
): OrchestratorResult {
  let summary = result.summary;

  if (route.requires_context_switch && route.current_topic) {
    summary = stripPriorTopicReferences(summary, route.current_topic);
  }

  return {
    ...result,
    summary,
    meta: {
      intent_type: route.intent_type,
      requires_context_switch: route.requires_context_switch,
      current_topic: route.current_topic,
      relevance_score: route.relevance_score,
    },
  };
}

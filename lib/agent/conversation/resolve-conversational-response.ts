/**
 * Conversational responses — user language, registry-backed, context-aware.
 */

import type {
  ConversationContext,
  UserIntent,
} from "@/lib/agent/conversation/intent-types";
import {
  describeCategoryAvailability,
  domainInfrastructureHint,
  findCategoryByTopic,
  inferServiceDomain,
  infrastructureActionCards,
  isGlobalRimvioQuestion,
  isInfrastructureExploreQuestion,
  summarizeInfrastructureCatalog,
  type ConversationalAction,
} from "@/lib/agent/conversation/user-facing-capability-catalog";

export type ConversationalResponse = {
  readonly responseKo: string;
  readonly suggestedActions?: readonly ConversationalAction[];
};

function platformLabel(context?: ConversationContext): string | null {
  const name = context?.platformName?.trim() || context?.currentPlatform?.trim();
  if (!name || name === "Platform") return null;
  return name;
}

function greetingResponse(context?: ConversationContext): ConversationalResponse {
  const app = platformLabel(context);
  if (app && !isGenericDefaultPlatformName(app)) {
    return {
      responseKo: `안녕하세요 👋\n${app}에서 무엇을 만들거나 실행해볼까요?\n\n예:\n• 필요한 환경 구성\n• 외부 서비스 연결\n• 현재 상태 확인\n• 테스트 실행`,
      suggestedActions: [
        { id: "greet-infra", label: "어떤 인프라를 만들 수 있어?", utterance: "어떤 인프라를 만들 수 있어?" },
        { id: "greet-status", label: "현재 상태 확인", utterance: "현재 상태 확인해줘" },
      ],
    };
  }
  return {
    responseKo:
      "안녕하세요 👋\n무엇을 만들어보거나 실행해볼까요?\n\n예:\n• 서비스 만들기\n• 인프라 구성하기\n• 외부 서비스 연결하기\n• 현재 상태 확인하기",
    suggestedActions: [
      { id: "greet-infra", label: "어떤 인프라를 만들 수 있어?", utterance: "어떤 인프라를 만들 수 있어?" },
      { id: "greet-create", label: "서비스 만들기", utterance: "배달 플랫폼 만들어줘" },
    ],
  };
}

function isGenericDefaultPlatformName(name: string): boolean {
  return /used\s*market|platform\s*builder|default/i.test(name);
}

function capabilityAvailabilityResponse(utterance: string): ConversationalResponse | null {
  const cat = findCategoryByTopic(utterance);
  if (!cat) return null;

  const base = describeCategoryAvailability(cat);
  const follow =
    cat.id === "connect"
      ? "\n\nGitHub · Vercel · Supabase · Stripe 중 어떤 것을 연결할지 말씀해 주세요."
      : "\n\n지금 바로 구성해드릴까요?";

  return {
    responseKo: `${base}${follow}`,
    suggestedActions: [
      {
        id: `do-${cat.id}`,
        label: `${cat.emoji} ${cat.labelKo} 구성하기`,
        utterance: cat.exampleSeed,
      },
    ],
  };
}

function infrastructureExploreResponse(detailed: boolean): ConversationalResponse {
  return {
    responseKo: summarizeInfrastructureCatalog(!detailed),
    suggestedActions: infrastructureActionCards(),
  };
}

function connectExploreResponse(utterance: string): ConversationalResponse {
  void utterance;
  return {
    responseKo:
      "GitHub, Vercel, Supabase, Stripe를 연결할 수 있어요.\n\n• GitHub — 코드 저장소\n• Vercel — 배포\n• Supabase — 데이터베이스\n• Stripe — 결제\n\n어떤 서비스를 연결할까요?",
    suggestedActions: [
      { id: "connect-github", label: "GitHub 연결", utterance: "GitHub 연결해줘" },
      { id: "connect-vercel", label: "Vercel 연결", utterance: "Vercel 연결해줘" },
      { id: "connect-supabase", label: "Supabase 연결", utterance: "Supabase 연결해줘" },
      { id: "connect-stripe", label: "Stripe 연결", utterance: "Stripe 연결해줘" },
    ],
  };
}

function servicePlanningResponse(utterance: string, context?: ConversationContext): ConversationalResponse {
  const domain = inferServiceDomain(utterance);
  const app = platformLabel(context);
  if (domain) {
    const hint = domainInfrastructureHint(domain);
    return {
      responseKo: `좋아요. ${domain} 플랫폼이라면 보통 ${hint} 등이 필요해요.\n\n현재 Rimvio에서 지원되는 항목을 확인해서 구성 가능한 것부터 준비할게요.\n\n"필요한 인프라 구성해줘"라고 말씀해 주시면 바로 시작할 수 있어요.`,
      suggestedActions: [
        { id: "plan-infra", label: "필요한 인프라 구성", utterance: "필요한 인프라 구성해줘" },
        { id: "plan-explore", label: "무엇을 만들 수 있는지", utterance: "어떤 인프라를 만들 수 있어?" },
      ],
    };
  }
  if (app && !isGlobalRimvioQuestion(utterance)) {
    return {
      responseKo: `${app}에 필요한 환경을 함께 구성할 수 있어요.\n\n어떤 기능이 필요한지 알려주시면 — 회원, 데이터, 파일, 외부 연결, 테스트 — 필요한 것만 골라서 진행할게요.`,
      suggestedActions: infrastructureActionCards().slice(0, 4),
    };
  }
  return infrastructureExploreResponse(false);
}

function vagueInfraRequestResponse(): ConversationalResponse {
  return {
    responseKo:
      "좋아요. 어떤 서비스를 만들고 계신가요?\n\n예:\n• 쇼핑몰\n• 예약 서비스\n• 배달 플랫폼\n• 중고거래\n• 커뮤니티\n\n서비스를 알려주시면 필요한 인프라를 제가 구성해볼게요.",
    suggestedActions: [
      { id: "vague-delivery", label: "배달 플랫폼", utterance: "배달 플랫폼 만들어줘" },
      { id: "vague-market", label: "중고거래", utterance: "중고거래 플랫폼 만들어줘" },
      { id: "vague-shop", label: "쇼핑몰", utterance: "쇼핑몰 만들어줘" },
    ],
  };
}

function defaultQuestionResponse(context?: ConversationContext): ConversationalResponse {
  const app = platformLabel(context);
  if (app && !isGenericDefaultPlatformName(app)) {
    return {
      responseKo: `${summarizeInfrastructureCatalog(true)}\n\n${app}에서 지금 필요한 작업을 말씀해 주세요.`,
      suggestedActions: [
        { id: "q-status", label: "현재 상태 확인", utterance: "현재 상태 확인해줘" },
        { id: "q-test", label: "테스트 실행", utterance: "테스트 돌려줘" },
        ...infrastructureActionCards().slice(0, 3),
      ],
    };
  }
  return infrastructureExploreResponse(false);
}

/**
 * Resolve user-facing copy for chat/question intents.
 * Never exposes internal terms (capability, deploy pipeline, tool gateway).
 */
export function resolveConversationalResponse(input: {
  readonly utterance: string;
  readonly intent: UserIntent;
  readonly context?: ConversationContext;
}): ConversationalResponse {
  const { utterance, intent, context } = input;
  const text = utterance.trim();

  if (intent === "chat") {
    return greetingResponse(context);
  }

  if (intent !== "question") {
    return { responseKo: "" };
  }

  if (/^인프라\s*(만들|구성)/.test(text) && !inferServiceDomain(text)) {
    return vagueInfraRequestResponse();
  }

  if (isInfrastructureExploreQuestion(text)) {
    const detailed = /구체|자세|상세|목록|전부/.test(text);
    return infrastructureExploreResponse(detailed);
  }

  if (/연결/i.test(text) && /뭐|무엇|어떤|할\s*수|가능/.test(text)) {
    return connectExploreResponse(text);
  }

  const availability = capabilityAvailabilityResponse(text);
  if (availability) {
    return availability;
  }

  if (inferServiceDomain(text) || /플랫폼|서비스|만들/.test(text)) {
    return servicePlanningResponse(text, context);
  }

  if (/구체|자세|상세/.test(text)) {
    return infrastructureExploreResponse(true);
  }

  return defaultQuestionResponse(context);
}

export type { ConversationalAction };

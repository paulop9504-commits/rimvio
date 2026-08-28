/**
 * Hub 배포 개발 전문 AI 에이전트 — deterministic MVP planner.
 * Rimvio Agent spine와 동일 Intent vocabulary (`lib/rimvio-protocol/intent.ts`).
 */

import type { CapabilityDraft } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { compileIntentFromUtterance } from "@/lib/rimvio-protocol/intent";
import { createDefaultMarketsDeclaration, createDefaultMarketDeployment } from "@/lib/platform-sdk/markets";

export type DeployAgentMessage = {
  readonly id: string;
  readonly role: "user" | "agent";
  readonly content: string;
  readonly structured?: DeployAgentProposal | null;
};

export type DeployAgentProposal = {
  readonly title: string;
  readonly summaryKo: string;
  readonly bullets: readonly string[];
  readonly suggestedStep?: number;
};

function msg(id: string, role: "user" | "agent", content: string, structured?: DeployAgentProposal): DeployAgentMessage {
  return { id, role, content, structured: structured ?? null };
}

export function planCapabilityFromUtterance(
  utterance: string,
  draft: CapabilityDraft,
): { messages: DeployAgentMessage[]; patch: Partial<CapabilityDraft> | null } {
  const text = utterance.trim();
  const intent = compileIntentFromUtterance(text);
  const userMsg = msg(`u_${Date.now()}`, "user", text);

  if (/오사카|osaka|여행|travel|일정|itinerary/i.test(text)) {
    const patch: Partial<CapabilityDraft> = {
      name: "오사카 여행 일정 추천",
      id: "travel.osaka.itinerary",
      description: "사용자의 여행 조건에 맞는 오사카 일정과 장소를 추천합니다.",
      category: "travel",
      tags: ["travel", "osaka", "itinerary", "ai"],
      runtime: { type: "cloud-agent", entry: "capability/index.ts" },
      actions: [
        {
          id: "a1",
          name: "travel.plan_itinerary",
          description: "Generate itinerary",
          inputSchema: "travel.plan_itinerary.v1",
          outputSchema: "travel.itinerary.v1",
          approvalRequired: false,
        },
        {
          id: "a2",
          name: "travel.search_places",
          description: "Search places",
          inputSchema: "travel.search_places.v1",
          outputSchema: "travel.search_result.v1",
          approvalRequired: false,
        },
      ],
    };
    const proposal: DeployAgentProposal = {
      title: "추천 Capability 구조",
      summaryKo: "오사카 여행 일정 추천 Capability",
      bullets: [
        "입력: 여행지, 일정, 예산, 선호",
        "출력: 추천 일정, 장소 정보, 지도 데이터",
        "주요 액션: 일정 생성, 장소 검색, 지도 연동",
        "필요 권한: 외부 네트워크, 위치(선택)",
        "실행 환경: Sandbox Runtime (보안 강화)",
      ],
      suggestedStep: 2,
    };
    return {
      messages: [
        userMsg,
        msg(`a_${Date.now()}`, "agent", "요청을 분석했어요. 아래 구조로 Capability를 제안합니다.", proposal),
      ],
      patch,
    };
  }

  if (/중고|market|거래|자전거|bike|판매|sell/i.test(text) || intent?.action === "sell") {
    const patch: Partial<CapabilityDraft> = {
      name: draft.name || "Used Market Listing",
      id: draft.id || "used.market",
      description: "중고 물품 등록·검색 Capability",
      category: "e-commerce",
      tags: ["marketplace", "resale"],
      actions: [
        {
          id: "a1",
          name: "market.create_listing",
          description: "Create listing",
          inputSchema: "market.create_listing.v1",
          outputSchema: "market.listing.v1",
          approvalRequired: true,
        },
      ],
    };
    const proposal: DeployAgentProposal = {
      title: "추천 Capability 구조",
      summaryKo: "중고거래 등록 Capability",
      bullets: [
        "입력: 제목, 가격, 사진, 상태",
        "출력: Listing 객체",
        "승인: 등록 전 사용자 확인",
        "Market: KR 기본",
      ],
      suggestedStep: 2,
    };
    return {
      messages: [userMsg, msg(`a_${Date.now()}`, "agent", "중고거래 Capability 구조를 제안합니다.", proposal)],
      patch,
    };
  }

  return {
    messages: [
      userMsg,
      msg(
        `a_${Date.now()}`,
        "agent",
        "어떤 Capability를 만들고 싶으신가요? 예: 오사카 여행 일정 추천, 중고 물품 등록, 사진 맛집 추천",
      ),
    ],
    patch: null,
  };
}

export function planPlatformFromUtterance(
  utterance: string,
): { messages: DeployAgentMessage[]; patch: Partial<PlatformDraft> | null } {
  const text = utterance.trim();
  const userMsg = msg(`u_${Date.now()}`, "user", text);

  if (/중고|market|거래|marketplace|플랫폼/i.test(text)) {
    const patch: Partial<PlatformDraft> = {
      name: "Used Market",
      id: "used.market",
      description: "동네 사람들이 안 쓰는 물건을 사고팔 수 있는 플랫폼",
      category: "e-commerce",
      tags: ["marketplace", "resale", "local"],
      operator: { name: "A Studio Inc.", headquartersCountry: "KR" },
      markets: createDefaultMarketsDeclaration("KR"),
      architectureNotes: "L1 Native · tenant_strict data · capability-first discovery",
      workflowDescription: "Listing → Chat → Offer → Order → Review",
      commerceNotes: "KRW settlement · seller onboarding KR",
    };
    const proposal: DeployAgentProposal = {
      title: "Platform Blueprint",
      summaryKo: "Used Market — KR Market",
      bullets: [
        "역할: 구매자 · 판매자",
        "Core: Listings · Search · Chat · Orders",
        "Market: 🇰🇷 Korea (primary)",
        "다음: Markets 단계에서 JP 추가 가능",
      ],
      suggestedStep: 3,
    };
    return {
      messages: [userMsg, msg(`a_${Date.now()}`, "agent", "중고거래 Platform Blueprint를 제안합니다.", proposal)],
      patch,
    };
  }

  if (/일본|japan|jp/.test(text)) {
    const markets = createDefaultMarketsDeclaration("KR");
    const patch: Partial<PlatformDraft> = {
      markets: {
        ...markets,
        deployments: [
          ...markets.deployments,
          createDefaultMarketDeployment("JP"),
        ],
      },
    };
    return {
      messages: [
        userMsg,
        msg(`a_${Date.now()}`, "agent", "Japan Market Deployment를 추가했습니다. Markets 단계에서 readiness를 완료하세요."),
      ],
      patch,
    };
  }

  return {
    messages: [
      userMsg,
      msg(`a_${Date.now()}`, "agent", "어떤 Platform을 만들고 싶으신가요? 예: 중고거래, 음식 나눔, 가구 마켓"),
    ],
    patch: null,
  };
}

export const DEPLOY_AGENT_TEMPLATES = [
  { label: "오사카 여행 일정 추천", utterance: "오사카 여행 일정을 추천해주는 능력을 만들고 싶어" },
  { label: "사진으로 맛집 추천", utterance: "사진을 올리면 맛집을 추천하는 Capability를 만들고 싶어" },
  { label: "중고거래 플랫폼", utterance: "동네 중고거래 플랫폼을 만들고 싶어" },
  { label: "가구 마켓", utterance: "서울에서 가구를 사고팔 수 있는 플랫폼을 만들고 싶어" },
] as const;

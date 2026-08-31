/**
 * MVP planner — deterministic utterance → RIR / clarify / patch.
 * LLM planner replaces this stage later; RIR contract stays stable.
 */

import type {
  BuilderClarification,
  CapabilityRir,
  PlatformRir,
  PlannerResult,
} from "@/lib/platform-builder/rir";
import { RIMVIO_BUILDER_RIR_VERSION } from "@/lib/platform-builder/rir";
import {
  createDefaultMarketDeployment,
  createDefaultMarketsDeclaration,
} from "@/lib/platform-sdk/markets";

function marketsForUtterance(utterance: string) {
  const markets = createDefaultMarketsDeclaration("KR");
  if (/일본|japan|jp|도쿄/.test(utterance)) {
    return {
      primary: "JP" as const,
      contextPolicy: markets.contextPolicy,
      deployments: [
        createDefaultMarketDeployment("JP", { primary: true }),
        createDefaultMarketDeployment("KR"),
      ],
    };
  }
  if (/미국|usa|us|america/.test(utterance)) {
    return {
      primary: "US" as const,
      contextPolicy: markets.contextPolicy,
      deployments: [
        createDefaultMarketDeployment("US", { primary: true }),
        createDefaultMarketDeployment("KR"),
      ],
    };
  }
  return markets;
}

const USED_MARKET_RIR = (utterance: string): PlatformRir => ({
  specVersion: RIMVIO_BUILDER_RIR_VERSION,
  kind: "platform",
  source: { utterance, locale: "ko" },
  product: {
    name: "Used Market",
    slug: "used-market",
    summary: "동네 사람들이 안 쓰는 물건을 사고팔 수 있는 서비스",
    category: "e-commerce",
  },
  operator: { name: "A Studio Inc.", headquartersCountry: "KR" },
  markets: marketsForUtterance(utterance),
  roles: [
    { id: "buyer", label: "구매자" },
    { id: "seller", label: "판매자" },
  ],
  objects: [
    {
      id: "listing",
      label: "상품",
      collection: "listings",
      fields: ["title", "price", "images", "location", "sellerId", "status"],
    },
    {
      id: "order",
      label: "주문",
      collection: "orders",
      fields: ["status", "buyerId", "sellerId", "listingId"],
    },
    {
      id: "message",
      label: "메시지",
      collection: "messages",
      fields: ["body", "threadId", "senderId"],
    },
    {
      id: "review",
      label: "리뷰",
      collection: "reviews",
      fields: ["rating", "body", "orderId"],
    },
  ],
  actions: [
    { id: "search", label: "상품 검색", capabilityId: "market.search" },
    {
      id: "sell",
      label: "상품 등록",
      capabilityId: "market.create_listing",
      approvalRequired: true,
    },
    {
      id: "offer",
      label: "가격 제안",
      capabilityId: "market.make_offer",
      markets: ["KR", "US"],
    },
    {
      id: "purchase",
      label: "구매",
      capabilityId: "market.purchase",
      approvalRequired: true,
    },
  ],
  pages: [
    { id: "home", path: "/", label: "Home", component: "MarketHome" },
    { id: "sell", path: "/sell", label: "Sell", component: "SellForm" },
    { id: "product", path: "/product/:id", label: "Product", component: "ProductDetail" },
    { id: "messages", path: "/messages", label: "Messages", component: "MessageInbox" },
    { id: "profile", path: "/profile", label: "Profile", component: "UserProfile" },
  ],
  features: ["chat", "offers", "reviews", "location_search", "seller_profiles"],
  permissions: {
    required: ["data.listings.read", "data.listings.write", "location.read", "storage.upload"],
    optional: ["compose.platform.payments"],
    denied: ["credential.extract", "auto_reality_commit"],
  },
  context: { read: ["user.id", "location.coords", "device.locale"] },
  clarifications: [],
  updatedAtIso: new Date().toISOString(),
});

const FOOD_SHARE_PENDING: BuilderClarification = {
  question: "좋아요. 먼저 거래 방식을 정할게요. 무료 나눔인가요, 판매인가요?",
  answer: null,
  options: ["무료 나눔", "판매", "직접 설명하기"],
};

function buildFoodShareRir(utterance: string, free: boolean, pickup: boolean): PlatformRir {
  return {
    specVersion: RIMVIO_BUILDER_RIR_VERSION,
    kind: "platform",
    source: { utterance, locale: "ko" },
    product: {
      name: free ? "Neighborhood Food Share" : "Neighborhood Food Market",
      slug: free ? "food-share" : "food-market",
      summary: free
        ? "동네 무료 음식 나눔"
        : "동네 음식 거래",
      category: "e-commerce",
    },
    operator: { name: "A Studio Inc.", headquartersCountry: "KR" },
    markets: createDefaultMarketsDeclaration("KR"),
    roles: [
      { id: "giver", label: "나눔자" },
      { id: "receiver", label: "수령자" },
    ],
    objects: [
      {
        id: "listing",
        label: "나눔 글",
        collection: "listings",
        fields: ["title", "quantity", "location", "pickupMethod"],
      },
      {
        id: "reservation",
        label: "예약",
        collection: "reservations",
        fields: ["status", "listingId", "receiverId"],
      },
      {
        id: "message",
        label: "채팅",
        collection: "messages",
        fields: ["body", "threadId"],
      },
    ],
    actions: [
      { id: "search", label: "나눔 검색", capabilityId: "food.search" },
      {
        id: "post",
        label: "나눔 등록",
        capabilityId: "food.create_listing",
        approvalRequired: true,
      },
      { id: "reserve", label: "수령 예약", capabilityId: "food.reserve" },
    ],
    pages: [
      { id: "home", path: "/", label: "Home", component: "ShareHome" },
      { id: "post", path: "/post", label: "Post", component: "ShareForm" },
      { id: "messages", path: "/messages", label: "Messages", component: "MessageInbox" },
    ],
    features: pickup
      ? ["chat", "location_search", "pickup", "reservation"]
      : ["chat", "location_search", "delivery"],
    permissions: {
      required: ["data.listings.read", "data.listings.write", "location.read"],
      optional: [],
      denied: ["credential.extract"],
    },
    context: { read: ["user.id", "location.coords"] },
    clarifications: [],
    updatedAtIso: new Date().toISOString(),
  };
}

export function planFromUtterance(
  utterance: string,
  context?: {
    readonly pendingClarification?: BuilderClarification | null;
    readonly existingRir?: PlatformRir | null;
  },
): PlannerResult {
  const text = utterance.trim().toLowerCase();
  if (!text) {
    return {
      type: "clarify",
      question: "무엇을 만들고 싶으신가요? 예: 동네 중고거래, 음식 나눔",
      options: ["중고거래 플랫폼", "음식 나눔", "직접 설명하기"],
    };
  }

  if (context?.pendingClarification) {
    const q = context.pendingClarification.question;
    const isFoodPricing = q.includes("거래 방식") || q.includes("무료 나눔");
    const isFoodPickup = q.includes("만나서") || q.includes("배송");

    if (isFoodPricing) {
      const free = text.includes("무료") || text.includes("나눔");
      const paid = text.includes("판매");
      if (!free && !paid && text.includes("설명")) {
        return {
          type: "clarify",
          question: "조금 더 설명해 주세요. 무료 나눔인가요, 판매인가요?",
          options: ["무료 나눔", "판매"],
        };
      }
      return {
        type: "clarify",
        question: "직접 만나서 받나요, 배송도 지원할까요?",
        options: ["직접 만나서", "배송 지원", "둘 다"],
      };
    }

    if (isFoodPickup) {
      const pickup = text.includes("직접") || text.includes("만나") || text.includes("둘");
      const rir = buildFoodShareRir(utterance, true, pickup);
      return {
        type: "blueprint",
        rir,
        summaryKo: "무료 지역 나눔 플랫폼으로 설계했어요.",
      };
    }
  }

  if (context?.existingRir) {
    return applyModifyToRir(context.existingRir, utterance);
  }

  if (/음식|나눔|food/.test(text)) {
    return {
      type: "clarify",
      question: FOOD_SHARE_PENDING.question,
      options: FOOD_SHARE_PENDING.options ?? [],
    };
  }

  if (
    /중고|거래|market|사고팔|물건|자전거|책/.test(text) ||
    text.includes("플랫폼") ||
    text.includes("서비스")
  ) {
    const rir = USED_MARKET_RIR(utterance);
    return {
      type: "blueprint",
      rir,
      summaryKo: "중고거래 플랫폼 구조를 잡았어요.",
    };
  }

  if (/가격|예상|estimate|ai/.test(text) && /사진|이미지|image/.test(text)) {
    const cap: CapabilityRir = {
      specVersion: RIMVIO_BUILDER_RIR_VERSION,
      kind: "capability",
      source: { utterance, locale: "ko" },
      capability: {
        name: "AI Price Estimator",
        id: "ai.estimate_price",
        description: "사진을 분석해 예상 가격을 제안합니다.",
        input: ["image"],
        output: ["estimated_price"],
        requires: ["storage.upload", "context.ai"],
        action: "estimate_price",
      },
      hostPlatformId: "platform.used-market",
      updatedAtIso: new Date().toISOString(),
    };
    return {
      type: "capability",
      rir: cap,
      summaryKo: "AI 가격 추정 Capability를 만들었어요.",
    };
  }

  return {
    type: "clarify",
    question: "어떤 종류의 서비스인가요?",
    options: ["중고거래", "음식 나눔", "예약·예약", "직접 설명하기"],
  };
}

function applyModifyToRir(rir: PlatformRir, utterance: string): PlannerResult {
  const text = utterance.toLowerCase();
  let next = { ...rir, updatedAtIso: new Date().toISOString() };

  if (/사진|이미지|image/.test(text) && /10|열/.test(text)) {
    next = {
      ...next,
      objects: next.objects.map((obj) =>
        obj.id === "listing"
          ? { ...obj, fields: [...new Set([...obj.fields, "images_max_10"])] }
          : obj,
      ),
    };
    return {
      type: "patch",
      rir: next,
      summaryKo: "상품 이미지 제한을 10장으로 변경했습니다.",
    };
  }

  if (/위치|location|근처/.test(text) && /카드|card|보여/.test(text)) {
    if (!next.features.includes("location_on_cards")) {
      next = { ...next, features: [...next.features, "location_on_cards"] };
    }
    return {
      type: "patch",
      rir: next,
      summaryKo: "상품 카드에 판매자 위치를 표시하도록 변경했습니다.",
    };
  }

  if (/깔끔|애플|simple|minimal/.test(text)) {
    return {
      type: "patch",
      rir: next,
      summaryKo: "네비게이션을 줄이고 여백을 늘려 더 깔끔하게 정리했습니다.",
    };
  }

  if (/결제|payment/.test(text)) {
    next = {
      ...next,
      features: [...new Set([...next.features, "payments"])],
      permissions: {
        ...next.permissions,
        optional: [...new Set([...next.permissions.optional, "compose.platform.payments"])],
      },
    };
    return {
      type: "patch",
      rir: next,
      summaryKo: "결제 기능을 추가했습니다.",
    };
  }

  if (/배송|shipping/.test(text)) {
    next = {
      ...next,
      features: [...new Set([...next.features, "shipping"])],
      actions: next.actions.map((a) =>
        a.id === "sell" ? { ...a, markets: [...(a.markets ?? ["KR"]), "JP", "US"] } : a,
      ),
    };
    return {
      type: "patch",
      rir: next,
      summaryKo: "배송 지원을 추가했습니다.",
    };
  }

  if (/리뷰|review|평점/.test(text)) {
    if (!next.objects.some((o) => o.id === "review")) {
      next = {
        ...next,
        objects: [
          ...next.objects,
          {
            id: "review",
            label: "리뷰",
            collection: "reviews",
            fields: ["rating", "body", "orderId"],
          },
        ],
        features: [...new Set([...next.features, "reviews"])],
      };
    }
    return {
      type: "patch",
      rir: next,
      summaryKo: "거래 완료 후 리뷰를 받을 수 있게 했습니다.",
    };
  }

  if (/일본|japan|jp/.test(text)) {
    const hasJp = next.markets.deployments.some((d) => d.country === "JP");
    if (!hasJp) {
      next = {
        ...next,
        markets: {
          ...next.markets,
          deployments: [
            ...next.markets.deployments,
            createDefaultMarketDeployment("JP"),
          ],
        },
      };
    }
    return {
      type: "patch",
      rir: next,
      summaryKo: "Japan Market Deployment를 추가했습니다.",
    };
  }

  return {
    type: "patch",
    rir: next,
    summaryKo: "요청을 반영해 플랫폼을 업데이트했습니다.",
  };
}

import type { CapabilityDraft, CapabilityPermission } from "@/lib/hub/capability/types";
import { createDefaultMarketsDeclaration } from "@/lib/platform-sdk/markets";

export const HUB_CAPABILITY_DRAFT_STORAGE_KEY = "rimvio.hub.capability-draft.v1";

export const DEFAULT_MANIFEST_JSON = `{
  "name": "Coupang Purchase Agent",
  "version": "1.0.0",
  "runtime": {
    "type": "pc-agent",
    "entry": "agent/index.ts"
  },
  "input": {
    "type": "purchase_intent.v1"
  },
  "permissions": [
    "browser.read",
    "browser.write",
    "coupang.account"
  ],
  "actions": [
    "search_product",
    "add_to_cart",
    "purchase"
  ],
  "approval": {
    "before": ["payment"]
  },
  "output": [
    "product",
    "cart",
    "purchase_event"
  ]
}`;

export const DEFAULT_INPUT_SCHEMA = `{
  "intent": "purchase",
  "product": "아이폰 케이스",
  "budget": 30000,
  "quantity": 1
}`;

export const DEFAULT_OUTPUT_SCHEMA = `{
  "product": {
    "id": "string",
    "name": "string",
    "price": "number"
  },
  "cart": {
    "id": "string",
    "status": "string"
  }
}`;

export const DEFAULT_TEST_INPUT = `{
  "query": "아이폰 케이스",
  "max_results": 5
}`;

export const DEFAULT_TEST_OUTPUT = `{
  "product": {
    "id": "PROD-98765",
    "name": "아이폰 케이스",
    "price": 12900
  },
  "cart": {
    "id": "CART-123456",
    "status": "success"
  }
}`;

export const DEFAULT_PERMISSIONS: CapabilityPermission[] = [
  {
    id: "browser.read",
    label: "browser.read",
    scope: "Read",
    whyNeeded: "상품 검색",
    risk: "low",
    enabled: true,
  },
  {
    id: "browser.write",
    label: "browser.write",
    scope: "Write",
    whyNeeded: "장바구니 조작",
    risk: "medium",
    enabled: true,
  },
  {
    id: "coupang.account",
    label: "coupang.account",
    scope: "Read / Write",
    whyNeeded: "사용자 계정 및 주문 정보",
    risk: "high",
    enabled: true,
  },
  {
    id: "filesystem.read",
    label: "filesystem.read",
    scope: "Read",
    whyNeeded: "Not required",
    risk: "low",
    enabled: false,
  },
  {
    id: "network",
    label: "network",
    scope: "Outbound",
    whyNeeded: "External API",
    risk: "medium",
    enabled: false,
  },
];

export function createDefaultCapabilityDraft(): CapabilityDraft {
  return {
    id: "used.market",
    name: "Used Market",
    version: "1.0.0",
    description: "동네 사람들이 안 쓰는 물건을 사고팔 수 있는 중고거래 플랫폼입니다.",
    category: "e-commerce",
    tags: ["marketplace", "resale", "local"],
    iconDataUrl: null,
    pricing: "free",
    operator: {
      name: "A Studio Inc.",
      headquartersCountry: "KR",
    },
    markets: createDefaultMarketsDeclaration("KR"),
    wantsGlobal: false,
    manifestJson: DEFAULT_MANIFEST_JSON,
    runtime: { type: "cloud-agent", entry: "platform/index.ts" },
    inputType: "market.intent.v1",
    actions: [
      {
        id: "search",
        name: "market.search",
        description: "Search listings",
        inputSchema: "market.search.v1",
        outputSchema: "market.search_result.v1",
        approvalRequired: false,
      },
      {
        id: "create_listing",
        name: "market.create_listing",
        description: "Create listing",
        inputSchema: "market.create_listing.v1",
        outputSchema: "market.listing.v1",
        approvalRequired: true,
      },
      {
        id: "make_offer",
        name: "market.make_offer",
        description: "Make price offer",
        inputSchema: "market.make_offer.v1",
        outputSchema: "market.offer.v1",
        approvalRequired: true,
        markets: ["KR", "US"],
      },
      {
        id: "purchase",
        name: "market.purchase",
        description: "Purchase listing",
        inputSchema: "market.purchase.v1",
        outputSchema: "market.order.v1",
        approvalRequired: true,
      },
    ],
    outputEvents: ["product", "cart", "purchase_event"],
    approval: { before: ["payment"] },
    permissions: [
      {
        id: "data.listings.read",
        label: "data.listings.read",
        scope: "Read",
        whyNeeded: "상품 검색",
        risk: "low",
        enabled: true,
      },
      {
        id: "data.listings.write",
        label: "data.listings.write",
        scope: "Write",
        whyNeeded: "상품 등록",
        risk: "medium",
        enabled: true,
      },
      {
        id: "location.read",
        label: "location.read",
        scope: "Read",
        whyNeeded: "근처 거래",
        risk: "low",
        enabled: true,
      },
      {
        id: "storage.upload",
        label: "storage.upload",
        scope: "Write",
        whyNeeded: "상품 사진",
        risk: "medium",
        enabled: true,
      },
      ...DEFAULT_PERMISSIONS.filter((p) => !p.enabled).map((p) => ({ ...p })),
    ],
    selectedContext: [
      { id: "user.id", label: "user.id", type: "string", path: "user.id" },
      { id: "user.country", label: "user.country", type: "string", path: "user.country" },
      { id: "user.residence_country", label: "user.residence_country", type: "string", path: "user.residence_country" },
      { id: "market.country", label: "market.country", type: "string", path: "market.country" },
      { id: "locale.currency", label: "locale.currency", type: "string", path: "locale.currency" },
      { id: "device.locale", label: "device.locale", type: "string", path: "device.locale" },
      { id: "location.coords", label: "location.coords", type: "object", path: "location.coords" },
    ],
    inputSchemaJson: DEFAULT_INPUT_SCHEMA,
    outputSchemaJson: DEFAULT_OUTPUT_SCHEMA,
    events: [
      {
        id: "product_found",
        name: "product_found",
        description: "Emitted when a product match is found",
        payloadSchema: "{ productId: string }",
        trigger: "search_product success",
      },
      {
        id: "cart_updated",
        name: "cart_updated",
        description: "Cart state changed",
        payloadSchema: "{ cartId: string, status: string }",
        trigger: "add_to_cart success",
      },
      {
        id: "purchase_completed",
        name: "purchase_completed",
        description: "Purchase finished",
        payloadSchema: "{ orderId: string }",
        trigger: "purchase success",
      },
    ],
    changelog: "Initial release",
    publishConsents: {
      rights: false,
      permissions: false,
      policy: false,
      tested: false,
    },
  };
}

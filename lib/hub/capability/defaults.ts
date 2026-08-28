import type { CapabilityDraft, CapabilityPermission } from "@/lib/hub/capability/types";

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
    id: "commerce.coupang.purchase",
    name: "Coupang Purchase Agent",
    version: "1.0.0",
    description:
      "검색부터 장바구니 추가, 결제까지 지원하는 쿠팡 구매 자동화 Agent입니다.",
    category: "e-commerce",
    tags: ["coupang", "purchase", "automation"],
    iconDataUrl: null,
    pricing: "free",
    manifestJson: DEFAULT_MANIFEST_JSON,
    runtime: { type: "pc-agent", entry: "agent/index.ts" },
    inputType: "purchase_intent.v1",
    actions: [
      {
        id: "search_product",
        name: "search_product",
        description: "Search products on Coupang",
        inputSchema: "search_query",
        outputSchema: "product_list",
        approvalRequired: false,
      },
      {
        id: "add_to_cart",
        name: "add_to_cart",
        description: "Add selected product to cart",
        inputSchema: "product_id",
        outputSchema: "cart_state",
        approvalRequired: false,
      },
      {
        id: "purchase",
        name: "purchase",
        description: "Complete purchase flow",
        inputSchema: "cart_id",
        outputSchema: "purchase_receipt",
        approvalRequired: true,
      },
    ],
    outputEvents: ["product", "cart", "purchase_event"],
    approval: { before: ["payment"] },
    permissions: DEFAULT_PERMISSIONS.map((p) => ({ ...p })),
    selectedContext: [
      { id: "user.id", label: "user.id", type: "string", path: "user.id" },
      {
        id: "user.preferences",
        label: "user.preferences",
        type: "object",
        path: "user.preferences",
      },
      { id: "device.type", label: "device.type", type: "string", path: "device.type" },
      {
        id: "device.locale",
        label: "device.locale",
        type: "string",
        path: "device.locale",
      },
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

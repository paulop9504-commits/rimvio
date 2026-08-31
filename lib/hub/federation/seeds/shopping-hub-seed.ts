/**
 * Demo seed — Shopping Hub partner (tests + dev preview).
 */

import type {
  ConnectedHub,
  FederatedCapabilityRef,
  RemoteHubScanResult,
  RemotePermissionGrant,
} from "@/lib/hub/federation/types";
import { RIMVIO_FEDERATION_PROTOCOL_VERSION, RIMVIO_FEDERATION_STANDARD_VERSION } from "@/lib/hub/federation/types";

export const SHOPPING_HUB_ID = "hub.shopping-partner";

export const SHOPPING_HUB: ConnectedHub = {
  hubId: SHOPPING_HUB_ID,
  label: "Shopping Hub",
  baseUrl: "https://shopping-hub.demo.rimvio.app",
  trustLevel: "partner",
  status: "healthy",
  authKind: "oauth",
  credentialRef: "cred-shopping-demo",
  protocolVersion: RIMVIO_FEDERATION_PROTOCOL_VERSION,
  rimvioStandardVersion: RIMVIO_FEDERATION_STANDARD_VERSION,
  connectedAtIso: "2026-01-01T00:00:00.000Z",
  lastScanAtIso: "2026-01-15T00:00:00.000Z",
  lastHealthAtIso: "2026-01-15T00:00:00.000Z",
  detailKo: "Shopping Hub 연결됨",
};

export const SHOPPING_CAPABILITIES: readonly FederatedCapabilityRef[] = [
  cap("product.search", "e-commerce", ["검색", "search", "이어폰", "무선", "product"], "healthy", 120),
  cap("product.detail", "e-commerce", ["detail", "상품"], "healthy", 95),
  cap("cart.create", "e-commerce", ["cart", "장바구니"], "healthy", 80),
  cap("order.create", "e-commerce", ["order", "주문"], "healthy", 150),
  cap("payment.prepare", "payment", ["payment", "결제"], "degraded", 200),
  cap("delivery.track", "logistics", ["delivery", "배송", "track"], "offline", 0),
];

function cap(
  capabilityId: string,
  category: string,
  keywords: string[],
  health: FederatedCapabilityRef["health"],
  latencyMsP50: number,
): FederatedCapabilityRef {
  const slug = capabilityId.replace(/\./g, "_");
  return {
    capabilityId,
    hubId: SHOPPING_HUB_ID,
    hubLabel: SHOPPING_HUB.label,
    platformId: "platform.shopping",
    platformName: "Shopping Platform",
    category,
    inputSchema: `${slug}.input.v1`,
    outputSchema: `${slug}.response.v1`,
    inputSchemaVersion: 1,
    outputSchemaVersion: 1,
    approvalRequired: capabilityId.startsWith("payment") || capabilityId.startsWith("order"),
    keywords,
    health,
    latencyMsP50,
    origin: "remote",
    executionEndpoint: `${SHOPPING_HUB.baseUrl}/capabilities/${capabilityId}/invoke`,
  };
}

export const SHOPPING_PERMISSIONS: readonly RemotePermissionGrant[] = [
  { capabilityId: "product.search", action: "invoke", allowed: true },
  { capabilityId: "product.detail", action: "invoke", allowed: true },
  { capabilityId: "cart.create", action: "invoke", allowed: true },
  { capabilityId: "order.create", action: "read", allowed: true },
  { capabilityId: "order.create", action: "write", allowed: false, reasonKo: "주문 생성은 사용자 승인 필요" },
  { capabilityId: "payment.prepare", action: "prepare", allowed: true },
  { capabilityId: "payment.prepare", action: "commit", allowed: false, reasonKo: "결제 commit은 Denied" },
  { capabilityId: "delivery.track", action: "invoke", allowed: true },
];

export function buildShoppingHubScan(hub: ConnectedHub = SHOPPING_HUB): RemoteHubScanResult {
  const healthMap = Object.fromEntries(SHOPPING_CAPABILITIES.map((c) => [c.capabilityId, c.health]));
  return {
    hub,
    platforms: [
      {
        platformId: "platform.shopping",
        platformName: "Shopping Platform",
        capabilityCount: SHOPPING_CAPABILITIES.length,
        workflowCount: 2,
        schemaCount: SHOPPING_CAPABILITIES.length,
      },
    ],
    capabilities: SHOPPING_CAPABILITIES,
    workflows: [
      { id: "wf.checkout", label: "product.search → cart.create → order.create → payment.prepare" },
      { id: "wf.track", label: "order.create → delivery.track" },
    ],
    schemas: SHOPPING_CAPABILITIES.map((c) => ({
      id: c.outputSchema,
      version: `v${c.outputSchemaVersion ?? 1}`,
    })),
    permissions: SHOPPING_PERMISSIONS,
    versions: SHOPPING_CAPABILITIES.map((c) => ({
      capabilityId: c.capabilityId,
      schemaVersion: `v${c.outputSchemaVersion ?? 1}`,
    })),
    healthSummary: {
      overall: "degraded",
      healthyCount: SHOPPING_CAPABILITIES.filter((c) => c.health === "healthy").length,
      degradedCount: SHOPPING_CAPABILITIES.filter((c) => c.health === "degraded").length,
      offlineCount: SHOPPING_CAPABILITIES.filter((c) => c.health === "offline").length,
      capabilityHealth: healthMap,
    },
    scannedAtIso: new Date().toISOString(),
  };
}

export const HOTEL_PARTNER_HUB_ID = "hub.hotel-partner";
export const RESTAURANT_PARTNER_HUB_ID = "hub.restaurant-partner";
export const TRANSPORT_PARTNER_HUB_ID = "hub.transport-partner";

export const TRAVEL_PARTNER_HUBS: readonly ConnectedHub[] = [
  {
    ...SHOPPING_HUB,
    hubId: HOTEL_PARTNER_HUB_ID,
    label: "Hotel Hub",
    baseUrl: "https://hotel-hub.demo.rimvio.app",
    detailKo: "Hotel Platform",
  },
  {
    ...SHOPPING_HUB,
    hubId: RESTAURANT_PARTNER_HUB_ID,
    label: "Restaurant Hub",
    baseUrl: "https://restaurant-hub.demo.rimvio.app",
    detailKo: "Restaurant Platform",
  },
  {
    ...SHOPPING_HUB,
    hubId: TRANSPORT_PARTNER_HUB_ID,
    label: "Transportation Hub",
    baseUrl: "https://transport-hub.demo.rimvio.app",
    detailKo: "Transportation Platform",
  },
];

export function buildTravelCompositionCapabilities(): readonly FederatedCapabilityRef[] {
  return [
    { ...cap("hotel.search", "lodging", ["hotel", "호텔", "osaka", "오사카"], "healthy", 110), hubId: HOTEL_PARTNER_HUB_ID, hubLabel: "Hotel Hub", platformId: "platform.hotel", platformName: "Hotel Platform" },
    { ...cap("restaurant.search", "dining", ["restaurant", "맛집", "food"], "healthy", 90), hubId: RESTAURANT_PARTNER_HUB_ID, hubLabel: "Restaurant Hub", platformId: "platform.restaurant", platformName: "Restaurant Platform" },
    { ...cap("train.route", "transport", ["train", "기차", "route"], "healthy", 130), hubId: TRANSPORT_PARTNER_HUB_ID, hubLabel: "Transportation Hub", platformId: "platform.transport", platformName: "Transport Platform" },
    { ...cap("booking.prepare", "booking", ["booking", "예약"], "healthy", 140), hubId: HOTEL_PARTNER_HUB_ID, hubLabel: "Hotel Hub", platformId: "platform.hotel", platformName: "Hotel Platform" },
    { ...cap("payment.prepare", "payment", ["payment", "결제"], "healthy", 100), hubId: TRANSPORT_PARTNER_HUB_ID, hubLabel: "Transportation Hub", platformId: "platform.transport", platformName: "Transport Platform" },
  ];
}

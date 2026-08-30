/**
 * Dynamic Surface Stack — Agent Chat 위에 쌓이는 앱 UI 레이어.
 */

import type { ExperienceAppRole, MenuItem, OrderRecord, StoreRecord } from "@/lib/experience-app/types";

export type ExperienceSurfaceId =
  | "map"
  | "restaurant"
  | "menu"
  | "cart"
  | "checkout"
  | "order-complete"
  | "order-tracking"
  | "delivery-route"
  | "merchant-home"
  | "merchant-orders"
  | "merchant-menu"
  | "merchant-store"
  | "merchant-customers"
  | "merchant-delivery"
  | "merchant-settlement";

export type CartLine = {
  readonly itemId: string;
  readonly name: string;
  readonly priceKrw: number;
  readonly qty: number;
};

export type SurfaceFrame = {
  readonly surface: ExperienceSurfaceId;
  readonly context: Readonly<Record<string, unknown>>;
  readonly previousSurface?: ExperienceSurfaceId;
};

export type ApplicationSessionContext = {
  readonly sessionId: string;
  readonly appId: string;
  readonly role: ExperienceAppRole;
  readonly restaurantId?: string;
  readonly restaurantName?: string;
  readonly stores: readonly StoreRecord[];
  readonly cartItems: readonly CartLine[];
  readonly activeOrderId?: string;
  readonly lastIntent?: string;
};

export type AgentActionCardKind =
  | "open_surface"
  | "store_card"
  | "order_card"
  | "merchant_surface";

export type AgentActionCard = {
  readonly kind: AgentActionCardKind;
  readonly label: string;
  readonly surface?: ExperienceSurfaceId;
  readonly payload?: Readonly<Record<string, unknown>>;
};

export type AgentChatTurn = {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly cards?: readonly AgentActionCard[];
  readonly at: string;
};

export type ActionMetadataRecord = {
  readonly actionId: string;
  readonly sessionId: string;
  readonly appId: string;
  readonly actorId: string;
  readonly actorRole: ExperienceAppRole;
  readonly intent: string;
  readonly capability: string;
  readonly tool: string;
  readonly surface?: ExperienceSurfaceId;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly status: "success" | "error";
  readonly timestamp: string;
};

export type ActivityRecord = {
  readonly id: string;
  readonly kind: "order" | "reservation" | "purchase" | "travel";
  readonly title: string;
  readonly subtitle: string;
  readonly amountKrw?: number;
  readonly statusLabel: string;
  readonly orderId?: string;
  readonly restaurantId?: string;
  readonly createdAt: string;
};

export const DELIVERY_FEE_KRW = 3000;

export function cartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.priceKrw * line.qty, 0);
}

export function cartTotal(lines: readonly CartLine[]): number {
  return cartSubtotal(lines) + (lines.length > 0 ? DELIVERY_FEE_KRW : 0);
}

export function menuToCartLine(item: MenuItem, qty = 1): CartLine {
  return { itemId: item.id, name: item.name, priceKrw: item.priceKrw, qty };
}

export function orderToActivity(order: OrderRecord, statusLabel: string): ActivityRecord {
  return {
    id: `act-${order.id}`,
    kind: "order",
    title: order.storeName,
    subtitle: order.lines.map((l) => l.name).join(" · "),
    amountKrw: order.totalKrw,
    statusLabel,
    orderId: order.id,
    restaurantId: order.storeId,
    createdAt: order.createdAt,
  };
}

/**
 * Role + Order ownership — Agent and UI share this gate.
 */

import type { ExperienceActor, OrderRecord, OrderStatus } from "@/lib/experience-app/types";

const CONSUMER_CANCELABLE: readonly OrderStatus[] = ["received", "preparing"];
const MERCHANT_CANCELABLE: readonly OrderStatus[] = ["received", "preparing", "ready"];

export function canViewOrder(actor: ExperienceActor, order: OrderRecord): boolean {
  if (actor.role === "consumer") return order.consumerId === actor.userId;
  if (actor.role === "merchant") return Boolean(actor.storeId) && order.storeId === actor.storeId;
  if (actor.role === "courier") {
    return Boolean(actor.courierId) && order.courierId === actor.courierId;
  }
  return false;
}

export function canCancelOrder(actor: ExperienceActor, order: OrderRecord): boolean {
  if (!canViewOrder(actor, order)) return false;
  if (actor.role === "consumer") return CONSUMER_CANCELABLE.includes(order.status);
  if (actor.role === "merchant") return MERCHANT_CANCELABLE.includes(order.status);
  return false;
}

export function canAdvanceOrder(actor: ExperienceActor, order: OrderRecord): boolean {
  if (!canViewOrder(actor, order)) return false;
  if (order.status === "cancelled" || order.status === "delivered") return false;
  if (actor.role === "merchant") return true;
  if (actor.role === "courier") {
    return order.status === "ready" || order.status === "delivering";
  }
  return false;
}

export function denyReasonKo(kind: "view" | "cancel" | "advance"): string {
  if (kind === "view") return "이 주문에 접근할 권한이 없어요.";
  if (kind === "cancel") return "이 역할로는 주문을 취소할 수 없어요.";
  return "이 역할로는 주문 상태를 바꿀 수 없어요.";
}

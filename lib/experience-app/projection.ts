/**
 * Same Order State → different UI copy. Consumer never sees metadata.
 */

import type { ExperienceAppRole, OrderRecord, OrderStatus } from "@/lib/experience-app/types";

const CONSUMER_STATUS: Record<OrderStatus, string> = {
  received: "주문을 받았어요.",
  preparing: "주문이 조리 중이에요.",
  ready: "조리가 끝났어요. 배달을 기다려 주세요.",
  delivering: "배달이 출발했어요.",
  delivered: "배달이 완료됐어요.",
  cancelled: "주문이 취소됐어요.",
};

const MERCHANT_STATUS: Record<OrderStatus, string> = {
  received: "접수",
  preparing: "조리중",
  ready: "배달준비",
  delivering: "배달중",
  delivered: "완료",
  cancelled: "취소",
};

const COURIER_STATUS: Record<OrderStatus, string> = {
  received: "대기",
  preparing: "조리 중 — 대기",
  ready: "픽업 가능",
  delivering: "배달 중",
  delivered: "전달 완료",
  cancelled: "취소됨",
};

export function projectOrderHeadline(role: ExperienceAppRole, order: OrderRecord): string {
  if (role === "consumer") return CONSUMER_STATUS[order.status];
  if (role === "courier") return `${order.storeName} · ${COURIER_STATUS[order.status]}`;
  return `주문 #${order.displayId}`;
}

export function projectOrderSubline(role: ExperienceAppRole, order: OrderRecord): string {
  if (role === "consumer") {
    return `${order.storeName} · ${order.lines.map((l) => l.name).join(", ")}`;
  }
  if (role === "courier") {
    return `₩${order.totalKrw.toLocaleString("ko-KR")}`;
  }
  const next =
    order.status === "received"
      ? "조리중"
      : order.status === "preparing"
        ? "배달준비"
        : order.status === "ready"
          ? "배달중"
          : null;
  return next
    ? `${MERCHANT_STATUS[order.status]} → ${next}`
    : MERCHANT_STATUS[order.status];
}

export function projectStatusLabel(role: ExperienceAppRole, status: OrderStatus): string {
  if (role === "consumer") return CONSUMER_STATUS[status];
  if (role === "courier") return COURIER_STATUS[status];
  return MERCHANT_STATUS[status];
}

export function formatOrderMoneyKrw(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

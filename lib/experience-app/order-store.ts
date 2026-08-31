/**
 * Shared Order SSOT — session overlay. Consumer and merchant read the same records.
 */

import type { OrderLine, OrderMetadata, OrderRecord, OrderStatus } from "@/lib/experience-app/types";

const ORDER_KEY = "rimvio.experience-app.orders.v1";
const META_KEY = "rimvio.experience-app.order-meta.v1";

let orderMemory: OrderRecord[] = [];
let metaMemory: OrderMetadata[] = [];
let orderSeq = 0;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function readOrdersRaw(): OrderRecord[] {
  if (!canUseStorage()) return orderMemory;
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    if (!raw) return orderMemory;
    orderMemory = JSON.parse(raw) as OrderRecord[];
    return orderMemory;
  } catch {
    return orderMemory;
  }
}

function readMetaRaw(): OrderMetadata[] {
  if (!canUseStorage()) return metaMemory;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return metaMemory;
    metaMemory = JSON.parse(raw) as OrderMetadata[];
    return metaMemory;
  } catch {
    return metaMemory;
  }
}

function persist(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(orderMemory));
    window.localStorage.setItem(META_KEY, JSON.stringify(metaMemory));
    window.dispatchEvent(new CustomEvent("rimvio:experience-orders"));
  } catch {
    /* quota */
  }
}

function nextDisplayId(existing: readonly OrderRecord[]): string {
  const year = new Date().getFullYear();
  const seq = existing.length + 1;
  return `${year}-${String(seq).padStart(4, "0")}`;
}

export function listExperienceOrders(): readonly OrderRecord[] {
  return [...readOrdersRaw()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getExperienceOrder(id: string): OrderRecord | null {
  return readOrdersRaw().find((o) => o.id === id || o.displayId === id) ?? null;
}

export function listOrderMetadata(orderId: string): readonly OrderMetadata[] {
  return readMetaRaw().filter((m) => m.orderId === orderId);
}

export function appendOrderMetadata(meta: OrderMetadata): void {
  metaMemory = [...readMetaRaw(), meta];
  persist();
}

export function createExperienceOrder(input: {
  readonly storeId: string;
  readonly storeName: string;
  readonly consumerId: string;
  readonly lines: readonly OrderLine[];
  readonly serviceId?: string;
}): OrderRecord {
  const now = new Date().toISOString();
  const existing = readOrdersRaw();
  const totalKrw = input.lines.reduce((sum, line) => sum + line.priceKrw * line.qty, 0);
  const order: OrderRecord = {
    id: `ord-${Date.now().toString(36)}-${++orderSeq}`,
    displayId: nextDisplayId(existing),
    serviceId: input.serviceId ?? "local-delivery",
    storeId: input.storeId,
    storeName: input.storeName,
    consumerId: input.consumerId,
    courierId: null,
    status: "received",
    lines: input.lines,
    totalKrw,
    createdAt: now,
    updatedAt: now,
  };
  orderMemory = [order, ...existing];
  appendOrderMetadata({
    orderId: order.id,
    consumerId: order.consumerId,
    storeId: order.storeId,
    action: "order.create → received",
    capabilityId: "order-management",
    infrastructure: ["database", "notification"],
    llmModel: "gpt-4o-mini",
    mapsProvider: "nearby-search",
    at: now,
  });
  persist();
  return order;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: "preparing",
  preparing: "ready",
  ready: "delivering",
  delivering: "delivered",
};

export function updateExperienceOrderStatus(
  id: string,
  status: OrderStatus,
  extra?: { readonly courierId?: string },
): OrderRecord | null {
  const existing = readOrdersRaw();
  const idx = existing.findIndex((o) => o.id === id || o.displayId === id);
  if (idx < 0) return null;
  const prev = existing[idx]!;
  const now = new Date().toISOString();
  const next: OrderRecord = {
    ...prev,
    status,
    courierId: extra?.courierId ?? prev.courierId,
    updatedAt: now,
  };
  const copy = [...existing];
  copy[idx] = next;
  orderMemory = copy;
  appendOrderMetadata({
    orderId: next.id,
    consumerId: next.consumerId,
    storeId: next.storeId,
    action: `order.status → ${status}`,
    capabilityId: "order-management",
    infrastructure: status === "cancelled" ? ["database", "notification", "payment"] : ["database", "notification"],
    llmModel: "gpt-4o-mini",
    at: now,
  });
  persist();
  return next;
}

export function advanceExperienceOrder(id: string): OrderRecord | null {
  const order = getExperienceOrder(id);
  if (!order) return null;
  const next = NEXT_STATUS[order.status];
  if (!next) return order;
  return updateExperienceOrderStatus(id, next, {
    courierId: next === "delivering" ? order.courierId ?? "courier_7" : undefined,
  });
}

export function resetExperienceOrders(): void {
  orderMemory = [];
  metaMemory = [];
  orderSeq = 0;
  if (canUseStorage()) {
    window.localStorage.removeItem(ORDER_KEY);
    window.localStorage.removeItem(META_KEY);
  }
}

export function subscribeExperienceOrders(listener: () => void): () => void {
  if (!canUseStorage()) return () => {};
  window.addEventListener("rimvio:experience-orders", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("rimvio:experience-orders", listener);
    window.removeEventListener("storage", listener);
  };
}

export function nextStatusFor(status: OrderStatus): OrderStatus | null {
  return NEXT_STATUS[status] ?? null;
}

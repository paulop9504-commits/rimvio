/**
 * Shared Experience App Graph — one Order, role-specific projections.
 * Consumer / merchant / courier share state; UI never shares screens.
 */

export type ExperienceAppRole = "consumer" | "merchant" | "courier";

export type OrderStatus =
  | "received"
  | "preparing"
  | "ready"
  | "delivering"
  | "delivered"
  | "cancelled";

export type ExperienceActor = {
  readonly userId: string;
  readonly role: ExperienceAppRole;
  readonly storeId?: string;
  readonly courierId?: string;
};

export type OrderLine = {
  readonly name: string;
  readonly qty: number;
  readonly priceKrw: number;
};

export type OrderRecord = {
  readonly id: string;
  readonly displayId: string;
  readonly serviceId: string;
  readonly storeId: string;
  readonly storeName: string;
  readonly consumerId: string;
  readonly courierId: string | null;
  readonly status: OrderStatus;
  readonly lines: readonly OrderLine[];
  readonly totalKrw: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type OrderMetadata = {
  readonly orderId: string;
  readonly consumerId: string;
  readonly storeId: string;
  readonly action: string;
  readonly capabilityId: string;
  readonly infrastructure: readonly string[];
  readonly llmModel?: string;
  readonly mapsProvider?: string;
  readonly at: string;
};

export type StoreRecord = {
  readonly id: string;
  readonly serviceId: string;
  readonly name: string;
  readonly categoryKo: string;
  readonly walkMinutes: number;
  readonly lat: number;
  readonly lng: number;
};

export type MenuItem = {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly categoryKo: string;
  readonly priceKrw: number;
  readonly recommended?: boolean;
};

export type ExperienceService = {
  readonly id: string;
  readonly name: string;
  readonly nameKo: string;
  readonly merchantNav: readonly { readonly id: string; readonly labelKo: string }[];
};

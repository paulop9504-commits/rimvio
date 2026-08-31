/**
 * Commerce layer contract (🟠 implement · 🔴 shape locked).
 * docs/RIMVIO_OS_CONSTITUTION.md §30
 */

import type { PlatformMarketCode } from "@/lib/platform-sdk/types";

export type RimvioCommerceProduct = {
  readonly id: string;
  readonly platformId: string;
  readonly title: string;
  readonly priceMinor: number;
  readonly currency: string;
  readonly marketCountry: PlatformMarketCode;
};

export type RimvioCommerceOrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type RimvioCommerceOrder = {
  readonly id: string;
  readonly platformId: string;
  readonly buyerUserId: string;
  readonly sellerUserId: string;
  readonly productId: string;
  readonly status: RimvioCommerceOrderStatus;
  readonly totalMinor: number;
  readonly currency: string;
  readonly marketCountry: PlatformMarketCode;
};

export type RimvioCommercePaymentRequest = {
  readonly platformId: string;
  readonly orderId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly marketCountry: PlatformMarketCode;
  readonly approvalPolicy: "user_required";
};

export type RimvioCommerceApi = {
  createPayment(input: RimvioCommercePaymentRequest): Promise<{ prepareOnly: true; paymentId: string }>;
  createOrder(input: Omit<RimvioCommerceOrder, "id" | "status">): Promise<RimvioCommerceOrder>;
};

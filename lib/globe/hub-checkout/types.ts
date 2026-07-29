import type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";
import type { IdentitySlotId } from "@/lib/identity-vault/types";

/** In-app checkout methods — partner handoff is optional follow-up, not the primary path. */
export type HubCheckoutPaymentMethod = "in_app_card" | "kakaopay" | "tosspay";

export type HubLodgingCheckoutProvider = "rimvio_pg" | "liteapi";

export type LodgingCheckoutOfferWire = {
  readonly id: string;
  readonly title: string;
  readonly occupancyLabelKo: string;
  readonly totalPriceKrw: number | null;
  readonly priceKrw: number | null;
  readonly guestCount: number;
  readonly refundable: boolean;
  readonly sourceLabelKo: string;
  readonly providerOfferId?: string | null;
};

/** Rate lock from Field Commit — Hub Pay reuses this (no second prebook). */
export type LiteApiLockedPrebook = {
  readonly prebookId: string;
  readonly transactionId: string;
  readonly secretKey: string;
  readonly publicKey?: "live" | "sandbox";
};

export type HubLodgingCheckoutSession = {
  readonly sessionId: string;
  readonly hubId: Extract<ContextHubServiceId, "lodging">;
  readonly contextEventId: string;
  readonly resourceId: string;
  readonly propertyName: string;
  readonly checkInIso: string;
  readonly checkOutIso: string;
  readonly offer: LodgingCheckoutOfferWire;
  readonly handoffHref: string;
  readonly amountKrw: number;
  readonly currency: "KRW";
  readonly checkoutProvider: HubLodgingCheckoutProvider;
  readonly liteapiOfferId?: string | null;
  readonly coverImageUrl?: string | null;
  readonly partnerLabel?: string | null;
  readonly refundable?: boolean;
  /** When set, Payment SDK skips /api/hub/checkout/liteapi/prebook. */
  readonly liteapiLockedPrebook?: LiteApiLockedPrebook | null;
};

export type ExecuteLodgingHubCheckoutResult =
  | {
      readonly ok: true;
      readonly reserveActionId: string;
      readonly purchaseActionId: string;
      readonly externalRef: string;
      readonly handoffHref: string;
      readonly maskedIdentityKo: string;
      readonly purchaseDeferred: boolean;
    }
  | {
      readonly ok: false;
      readonly reason:
        | "missing_identity"
        | "invalid_amount"
        | "emit_failed"
        | "pg_failed";
      readonly missingSlots?: readonly IdentitySlotId[];
      readonly emitReason?: string;
      readonly pgReason?: string;
      readonly pgMessage?: string;
    };

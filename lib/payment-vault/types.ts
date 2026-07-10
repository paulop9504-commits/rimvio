/**
 * Payment Vault — tokenized payment preference (user-scoped, not per-Context).
 * Stores PSP refs + display labels only — never raw card PAN/CVC.
 */

import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";
import type { VaultObjectKind } from "@/lib/vault/types";

export type PaymentVaultKind = Extract<VaultObjectKind, "payment_preference">;

export type PaymentPreferencePayload = {
  readonly version: 1;
  readonly method: HubCheckoutPaymentMethod;
  /** Masked label for UI — e.g. "카카오페이" or "•••• 4242". */
  readonly displayLabelKo: string;
  /** PSP token when available (Stripe pm_*, Toss billing key, etc.). */
  readonly providerRef?: string | null;
  readonly cardBrand?: string | null;
  readonly cardLast4?: string | null;
  readonly savedAtIso: string;
};

export type PaymentVaultBundle = {
  readonly preference?: PaymentPreferencePayload;
};

export type ExpressCheckoutReadiness = {
  readonly ready: boolean;
  readonly identityComplete: boolean;
  readonly paymentComplete: boolean;
  readonly missingIdentitySlots: readonly import("@/lib/identity-vault/types").IdentitySlotId[];
  readonly paymentMethod: HubCheckoutPaymentMethod | null;
  readonly paymentLabelKo: string | null;
  readonly identityLabelKo: string | null;
};

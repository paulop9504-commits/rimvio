"use client";

/**
 * Field Commit receipt (pending_payment) → Hub lodging checkout sheet.
 * Reuses locked LiteAPI prebook so Pay does not prebook twice.
 */

import { openLodgingHubCheckout } from "@/lib/globe/hub-checkout/open-lodging-hub-checkout-bridge";
import type { LiteApiLockedPrebook } from "@/lib/globe/hub-checkout/types";
import type { BookingCommitReceipt } from "@/lib/booking-runtime/types";

export function lockedPrebookFromBookingReceipt(
  receipt: BookingCommitReceipt,
): LiteApiLockedPrebook | null {
  const meta = receipt.meta;
  if (!meta) {
    return null;
  }
  const prebookId = String(meta.prebookId ?? "").trim();
  const transactionId = String(meta.transactionId ?? "").trim();
  const secretKey = String(meta.secretKey ?? "").trim();
  if (!prebookId || !transactionId || !secretKey) {
    return null;
  }
  const publicKeyRaw = String(meta.publicKey ?? "").trim();
  const publicKey =
    publicKeyRaw === "sandbox" || publicKeyRaw === "live"
      ? publicKeyRaw
      : undefined;
  return {
    prebookId,
    transactionId,
    secretKey,
    ...(publicKey ? { publicKey } : {}),
  };
}

export function openLodgingHubCheckoutFromPendingPayment(input: {
  readonly contextEventId: string;
  readonly receipt: BookingCommitReceipt;
}): boolean {
  if (input.receipt.status !== "pending_payment") {
    return false;
  }
  const placeId = input.receipt.placeId?.trim() ?? "";
  if (!placeId) {
    return false;
  }
  const locked = lockedPrebookFromBookingReceipt(input.receipt);
  if (!locked) {
    return false;
  }
  const offerId = String(input.receipt.meta?.offerId ?? "").trim() || null;
  return openLodgingHubCheckout({
    contextEventId: input.contextEventId,
    placeId,
    offerId,
    providerOfferId: offerId,
    liteapiLockedPrebook: locked,
  });
}

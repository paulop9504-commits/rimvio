"use client";

/**
 * payment_prep Commit — require payment vault preference, then open Field checkout.
 * Never charges; never invents a PSP. Demo booking stub must not run for finance ops.
 */

import { openFinancePaymentFieldClient } from "@/lib/globe/finance-prep/open-finance-payment-field-client";
import { openLodgingHubCheckout } from "@/lib/globe/hub-checkout/open-lodging-hub-checkout-bridge";
import { openPaymentVaultSettings } from "@/lib/payment-vault/open-payment-vault-settings-bridge";
import { readPaymentVaultBundleClient } from "@/lib/payment-vault/read-payment-vault-bundle-client";
import { resolvePaymentPrepMethodFromPreference } from "@/lib/payment-vault/resolve-payment-prep-method";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

export type ExecutePaymentPrepResult =
  | {
      readonly ok: true;
      readonly methodLabelKo: string;
      readonly openedCheckout: boolean;
    }
  | {
      readonly ok: false;
      readonly reasonKo: string;
      readonly needsVaultSettings: boolean;
    };

export async function executePaymentPrepAfterCommit(input: {
  readonly operations: readonly RealityOperationV1[];
}): Promise<ExecutePaymentPrepResult> {
  const ops = input.operations.filter((op) => op.type === "payment_prep");
  if (ops.length === 0) {
    return { ok: true, methodLabelKo: "", openedCheckout: false };
  }

  const bundle = await readPaymentVaultBundleClient();
  const resolved = resolvePaymentPrepMethodFromPreference(bundle.preference);
  if (!resolved) {
    openPaymentVaultSettings();
    return {
      ok: false,
      reasonKo: "결제 수단을 먼저 저장해 주세요",
      needsVaultSettings: true,
    };
  }

  let openedCheckout = false;
  for (const op of ops) {
    const contextEventId = op.contextEventId?.trim();
    if (!contextEventId) {
      continue;
    }
    const placeId = op.sourceRef?.trim() || null;
    if (placeId) {
      const opened = openLodgingHubCheckout({
        contextEventId,
        placeId,
      });
      if (opened) {
        openedCheckout = true;
        continue;
      }
    }
    const field = openFinancePaymentFieldClient({
      contextEventId,
      title: op.preview.placeLabelKo ?? op.labelKo,
      placeId,
    });
    if (field.opened) {
      openedCheckout = true;
    }
  }

  return {
    ok: true,
    methodLabelKo: resolved.labelKo,
    openedCheckout,
  };
}

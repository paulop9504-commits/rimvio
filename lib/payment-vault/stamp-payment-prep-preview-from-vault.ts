/**
 * Stamp payment_prep Field preview with vault method label (client).
 */

import { readPaymentVaultBundleClient } from "@/lib/payment-vault/read-payment-vault-bundle-client";
import { resolvePaymentPrepMethodFromPreference } from "@/lib/payment-vault/resolve-payment-prep-method";
import {
  readPreparedRealityOperation,
  upsertPreparedRealityOperation,
} from "@/lib/reality-queue/prepared-operations-store";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

export type StampPaymentPrepPreviewResult = {
  readonly stamped: boolean;
  readonly methodLabelKo: string | null;
  readonly needsVaultSettings: boolean;
  readonly operation: RealityOperationV1 | null;
};

/** Refresh payment_prep Diff preview with saved vault preference (or “없음”). */
export async function stampPaymentPrepPreviewFromVault(
  operationId: string,
): Promise<StampPaymentPrepPreviewResult> {
  const op = readPreparedRealityOperation(operationId);
  if (!op || op.type !== "payment_prep") {
    return {
      stamped: false,
      methodLabelKo: null,
      needsVaultSettings: false,
      operation: op,
    };
  }

  let preference:
    | import("@/lib/payment-vault/types").PaymentPreferencePayload
    | undefined;
  try {
    const bundle = await readPaymentVaultBundleClient();
    preference = bundle.preference;
  } catch {
    preference = undefined;
  }
  const resolved = resolvePaymentPrepMethodFromPreference(preference);
  const methodLabelKo = resolved?.labelKo ?? null;
  const providerLabelKo = methodLabelKo
    ? `결제 수단 · ${methodLabelKo}`
    : "결제 수단 · 없음 (설정에서 저장)";
  const summaryKo = methodLabelKo
    ? `${op.preview.placeLabelKo ?? op.labelKo} · ${methodLabelKo}`
    : op.preview.summaryKo;
  const detailKo = methodLabelKo
    ? `vault · ${methodLabelKo}`
    : "vault · 결제 수단 미저장";

  if (
    op.preview.providerLabelKo === providerLabelKo &&
    op.preview.summaryKo === summaryKo &&
    op.detailKo === detailKo
  ) {
    return {
      stamped: false,
      methodLabelKo,
      needsVaultSettings: !resolved,
      operation: op,
    };
  }

  const next: RealityOperationV1 = {
    ...op,
    preview: {
      ...op.preview,
      providerLabelKo,
      summaryKo,
    },
    detailKo,
  };
  upsertPreparedRealityOperation(next);
  return {
    stamped: true,
    methodLabelKo,
    needsVaultSettings: !resolved,
    operation: next,
  };
}

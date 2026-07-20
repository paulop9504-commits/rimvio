import type { PaymentVaultKind } from "@/lib/payment-vault/types";
import {
  resolveVaultWriteClientResult,
  type VaultWriteApiBody,
} from "@/lib/vault/vault-api-errors";

export async function upsertPaymentVaultObjectClient(input: {
  objectKey: string;
  kind: PaymentVaultKind;
  payload: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/vault/objects", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objectKey: input.objectKey,
      kind: input.kind,
      payload: input.payload,
    }),
  });

  let body: VaultWriteApiBody = {};
  try {
    body = (await response.json()) as VaultWriteApiBody;
  } catch {
    /* empty body */
  }

  return resolveVaultWriteClientResult(response.status, body);
}

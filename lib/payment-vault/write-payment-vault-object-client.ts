import type { PaymentVaultKind } from "@/lib/payment-vault/types";

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

  if (!response.ok) {
    let error = "vault_write_failed";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error?.trim()) {
        error = body.error.trim();
      }
    } catch {
      /* ignore */
    }
    return { ok: false, error };
  }

  return { ok: true };
}

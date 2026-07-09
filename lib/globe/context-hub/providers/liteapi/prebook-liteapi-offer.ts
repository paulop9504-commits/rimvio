import {
  liteApiBookUrl,
  resolveLiteApiPaymentPublicKey,
} from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";
import { liteApiFetch } from "@/lib/globe/context-hub/providers/liteapi/liteapi-http";
import type { LiteApiPrebookResponse } from "@/lib/globe/context-hub/providers/liteapi/liteapi-types";

export type LiteApiPrebookResult = {
  prebookId: string;
  transactionId: string | null;
  secretKey: string | null;
  publicKey: "live" | "sandbox";
};

/** Step 1 — lock rate + Payment SDK credentials. */
export async function prebookLiteApiOffer(input: {
  offerId: string;
  usePaymentSdk?: boolean;
}): Promise<LiteApiPrebookResult | null> {
  const offerId = input.offerId.trim();
  if (!offerId) {
    return null;
  }

  const response = await liteApiFetch<LiteApiPrebookResponse>({
    url: liteApiBookUrl("/rates/prebook"),
    method: "POST",
    body: {
      offerId,
      usePaymentSdk: input.usePaymentSdk ?? true,
    },
  });

  if (!response.ok) {
    return null;
  }

  const row = response.data.data;
  const prebookId = row?.prebookId?.trim();
  if (!prebookId) {
    return null;
  }

  return {
    prebookId,
    transactionId: row?.transactionId?.trim() ?? null,
    secretKey: row?.secretKey?.trim() ?? null,
    publicKey: resolveLiteApiPaymentPublicKey(),
  };
}

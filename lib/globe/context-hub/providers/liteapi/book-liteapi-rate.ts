import { liteApiBookUrl } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";
import { liteApiFetch } from "@/lib/globe/context-hub/providers/liteapi/liteapi-http";
import type { LiteApiGuestPayload } from "@/lib/globe/context-hub/providers/liteapi/build-liteapi-guest-payload";

export type LiteApiBookResult = {
  bookingId: string;
  hotelConfirmationCode: string | null;
  status: string | null;
};

type LiteApiBookResponse = {
  data?: {
    bookingId?: string;
    hotelConfirmationCode?: string;
    status?: string;
  };
};

export async function bookLiteApiRate(input: {
  prebookId: string;
  transactionId: string;
  guest: LiteApiGuestPayload;
}): Promise<LiteApiBookResult | null> {
  const prebookId = input.prebookId.trim();
  const transactionId = input.transactionId.trim();
  if (!prebookId || !transactionId) {
    return null;
  }

  const response = await liteApiFetch<LiteApiBookResponse>({
    url: liteApiBookUrl("/rates/book"),
    method: "POST",
    body: {
      prebookId,
      holder: input.guest.holder,
      guests: input.guest.guests,
      payment: {
        method: "TRANSACTION_ID",
        transactionId,
      },
    },
  });

  if (!response.ok) {
    return null;
  }

  const bookingId = response.data.data?.bookingId?.trim();
  if (!bookingId) {
    return null;
  }

  return {
    bookingId,
    hotelConfirmationCode: response.data.data?.hotelConfirmationCode?.trim() ?? null,
    status: response.data.data?.status?.trim() ?? null,
  };
}

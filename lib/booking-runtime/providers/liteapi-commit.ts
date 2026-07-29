/**
 * LiteAPI lodging — prebook on Commit (real rate lock); payment via Hub/SDK.
 */

import { buildLiteApiGuestPayload } from "@/lib/globe/context-hub/providers/liteapi/build-liteapi-guest-payload";
import { prebookLiteApiOffer } from "@/lib/globe/context-hub/providers/liteapi/prebook-liteapi-offer";
import { isLiteApiConfigured } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";
import type { IdentityVaultBundle } from "@/lib/identity-vault/types";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import type { BookingCommitReceipt } from "@/lib/booking-runtime/types";

export type LiteApiPrebookResult =
  | { readonly ok: true; readonly receipt: BookingCommitReceipt }
  | { readonly ok: false; readonly reasonKo: string };

export async function executeLiteApiBookingPrebook(input: {
  readonly operation: RealityOperationV1;
  readonly identityBundle?: IdentityVaultBundle | null;
  readonly nowIso?: string;
}): Promise<LiteApiPrebookResult> {
  if (!isLiteApiConfigured()) {
    return { ok: false, reasonKo: "LiteAPI 키가 없어요 · 설정 후 다시 결재해 주세요" };
  }

  const offerId = input.operation.preview.resourceId?.trim() ?? "";
  if (!offerId) {
    return {
      ok: false,
      reasonKo: "숙소 요금 상품이 없어요 · 다시 골라 결재함에 담아 주세요",
    };
  }

  if (!input.identityBundle) {
    return {
      ok: false,
      reasonKo: "여행자 정보가 없어요 · 신원 금고를 채운 뒤 다시 결재해 주세요",
    };
  }

  const guest = buildLiteApiGuestPayload(input.identityBundle);
  if (!guest) {
    return {
      ok: false,
      reasonKo: "연락처 이메일이 필요해요 · 신원 금고를 확인한 뒤 다시 결재해 주세요",
    };
  }

  const prebook = await prebookLiteApiOffer({ offerId, usePaymentSdk: true });
  if (!prebook?.prebookId) {
    return {
      ok: false,
      reasonKo: "요금 잠금에 실패했어요 · 잠시 후 다시 결재해 주세요",
    };
  }

  const secretKey = prebook.secretKey?.trim() ?? "";
  const transactionId = prebook.transactionId?.trim() ?? "";
  if (!secretKey || !transactionId) {
    return {
      ok: false,
      reasonKo: "결제 준비가 불완전해요 · 잠시 후 다시 결재해 주세요",
    };
  }

  return {
    ok: true,
    receipt: {
      operationId: input.operation.operationId,
      placeId: input.operation.sourceRef?.trim() || null,
      placeName: input.operation.labelKo,
      provider: "liteapi_booking",
      confirmationCode: prebook.prebookId,
      status: "pending_payment",
      handoffUrl: null,
      committedAtIso: input.nowIso ?? new Date().toISOString(),
      meta: {
        prebookId: prebook.prebookId,
        transactionId,
        offerId,
        secretKey,
        publicKey: prebook.publicKey,
      },
    },
  };
}

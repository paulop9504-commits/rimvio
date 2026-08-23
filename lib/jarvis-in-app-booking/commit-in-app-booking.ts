import { runBookingPrepareAgent } from "@/lib/agent-runtime";
import type { InlineChatBookingDraftWire } from "@/lib/jarvis-in-app-booking/inline-chat-booking-draft";
import { clearPendingInAppBooking } from "@/lib/jarvis-in-app-booking/pending-in-app-booking-store";

export type CommitInAppBookingResult =
  | { readonly ok: true; readonly operationId: string }
  | { readonly ok: false; readonly errorKo: string };

export function commitInAppBooking(
  wire: InlineChatBookingDraftWire,
): CommitInAppBookingResult {
  const ctx = wire.contextEventId.trim();
  const placeId = wire.placeId.trim();
  const placeName = wire.placeName.trim();

  if (!ctx) {
    return { ok: false, errorKo: "여행 맥락이 없어요. Globe에서 여행을 먼저 열어 주세요." };
  }
  if (!placeId || !placeName) {
    return { ok: false, errorKo: "예약할 숙소를 골라 주세요." };
  }

  const prepared = runBookingPrepareAgent({
    contextEventId: ctx,
    placeId,
    placeName,
    kind: "lodging",
    lat: wire.lat,
    lng: wire.lng,
    contextLabelKo: wire.contextLabelKo,
    amountLabel: wire.amountLabel ?? null,
    utterance: wire.placeQuery,
  });

  if (!prepared.ok) {
    return { ok: false, errorKo: prepared.reasonKo };
  }

  clearPendingInAppBooking();
  return { ok: true, operationId: prepared.operation.operationId };
}

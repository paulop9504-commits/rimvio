/**
 * Server-side booking execution after human Reality Commit.
 * Live providers fail closed — never silently fall back to demo_stub.
 */

import { assertHumanRealityCommit } from "@/lib/reality-commit";
import { executeGoogleMapsReserveBooking } from "@/lib/booking-runtime/providers/google-maps-reserve";
import { executeLiteApiBookingPrebook } from "@/lib/booking-runtime/providers/liteapi-commit";
import { resolveBookingProviderForOperation } from "@/lib/booking-runtime/resolve-booking-provider";
import type {
  BookingCommitReceipt,
  BookingExecuteInput,
  BookingExecuteResult,
} from "@/lib/booking-runtime/types";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

function demoReceipt(
  op: RealityOperationV1,
  index: number,
  nowIso: string,
): BookingCommitReceipt {
  const code = `RV-${op.operationId.slice(-6).toUpperCase()}-${index + 1}`;
  return {
    operationId: op.operationId,
    placeId: op.sourceRef?.trim() || null,
    placeName: op.labelKo,
    provider: "demo_stub",
    confirmationCode: code,
    status: "confirmed",
    committedAtIso: nowIso,
  };
}

function mapsFailureReason(op: RealityOperationV1): string {
  const ref = op.sourceRef?.trim() ?? "";
  if (!ref) {
    return `${op.labelKo} · 지도 장소 id가 없어요`;
  }
  return `${op.labelKo} · Google Maps 예약 연결에 실패했어요`;
}

export async function executeBookingOperationsServer(
  input: BookingExecuteInput,
): Promise<BookingExecuteResult> {
  const gate = assertHumanRealityCommit({
    contextEventId: input.contextEventId,
    operationIds: input.operations.map((op) => op.operationId),
    approvedByHuman: input.approvedByHuman,
  });
  if (!gate.allowed) {
    return { ok: false, reasonKo: gate.reasonKo };
  }

  const now = new Date().toISOString();
  const receipts: BookingCommitReceipt[] = [];

  for (const [index, op] of input.operations.entries()) {
    const provider = resolveBookingProviderForOperation(op);

    if (provider === "google_maps_reserve") {
      const receipt = executeGoogleMapsReserveBooking({
        operation: op,
        nowIso: now,
      });
      if (!receipt) {
        return { ok: false, reasonKo: mapsFailureReason(op) };
      }
      receipts.push(receipt);
      continue;
    }

    if (provider === "liteapi_booking") {
      const result = await executeLiteApiBookingPrebook({
        operation: op,
        identityBundle: input.identityBundle,
        nowIso: now,
      });
      if (!result.ok) {
        return { ok: false, reasonKo: result.reasonKo };
      }
      receipts.push(result.receipt);
      continue;
    }

    receipts.push(demoReceipt(op, index, now));
  }

  return { ok: true, receipts };
}

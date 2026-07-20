/**
 * Client-safe booking execute wrapper — calls server API when available.
 */

import type {
  BookingCommitReceipt,
  BookingExecuteResult,
} from "@/lib/booking-runtime/types";
import { assertHumanRealityCommit } from "@/lib/reality-commit";
import type { IdentityVaultBundle } from "@/lib/identity-vault/types";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import { resolveBookingProviderForOperation } from "@/lib/booking-runtime/resolve-booking-provider";

export type {
  BookingCommitReceipt,
  BookingProviderId,
  BookingCommitStatus,
} from "@/lib/booking-runtime/types";

function opsNeedLiveProvider(
  operations: readonly RealityOperationV1[],
): boolean {
  return operations.some((op) => {
    const provider = resolveBookingProviderForOperation(op);
    return (
      provider === "google_maps_reserve" || provider === "liteapi_booking"
    );
  });
}

/**
 * Sync fallback for scripts/tests without fetch.
 * Live-provider ops refuse silent demo_stub confirmation.
 */
export function executeBookingAfterHumanCommit(input: {
  readonly contextEventId: string;
  readonly operations: readonly RealityOperationV1[];
  readonly approvedByHuman: boolean;
  readonly identityBundle?: IdentityVaultBundle | null;
}):
  | { readonly ok: true; readonly receipts: readonly BookingCommitReceipt[] }
  | { readonly ok: false; readonly reasonKo: string } {
  const gate = assertHumanRealityCommit({
    contextEventId: input.contextEventId,
    operationIds: input.operations.map((op) => op.operationId),
    approvedByHuman: input.approvedByHuman,
  });
  if (!gate.allowed) {
    return { ok: false, reasonKo: gate.reasonKo };
  }

  if (opsNeedLiveProvider(input.operations)) {
    return {
      ok: false,
      reasonKo: "예약 실행은 서버 연결이 필요해요 · 잠시 후 다시 결재해 주세요",
    };
  }

  const now = new Date().toISOString();
  const receipts: BookingCommitReceipt[] = input.operations.map((op, index) => {
    const code = `RV-${op.operationId.slice(-6).toUpperCase()}-${index + 1}`;
    return {
      operationId: op.operationId,
      placeId: op.sourceRef?.trim() || null,
      placeName: op.labelKo,
      provider: "demo_stub",
      confirmationCode: code,
      status: "confirmed",
      committedAtIso: now,
    };
  });

  return { ok: true, receipts };
}

/** Field Commit — server providers (Maps Reserve / LiteAPI prebook). */
export async function executeBookingOperationsClient(input: {
  readonly contextEventId: string;
  readonly operations: readonly RealityOperationV1[];
  readonly approvedByHuman: boolean;
  readonly identityBundle?: IdentityVaultBundle | null;
}): Promise<BookingExecuteResult> {
  if (typeof fetch === "undefined") {
    return executeBookingAfterHumanCommit(input);
  }

  try {
    const response = await fetch("/api/reality/execute-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contextEventId: input.contextEventId,
        approvedByHuman: input.approvedByHuman,
        identityBundle: input.identityBundle ?? null,
        operations: input.operations.map((op) => ({
          operationId: op.operationId,
          labelKo: op.labelKo,
          kind: op.kind,
          sourceRef: op.sourceRef ?? null,
          engineId: op.engineId ?? null,
          preview: {
            resourceId: op.preview.resourceId ?? null,
            placeLabelKo: op.preview.placeLabelKo ?? null,
          },
        })),
      }),
    });
    const body = (await response.json()) as BookingExecuteResult;
    if (!response.ok) {
      return {
        ok: false,
        reasonKo:
          !body.ok && body.reasonKo
            ? body.reasonKo
            : "예약 실행에 실패했어요",
      };
    }
    return body;
  } catch {
    if (opsNeedLiveProvider(input.operations)) {
      return {
        ok: false,
        reasonKo: "예약 실행에 실패했어요 · 네트워크를 확인한 뒤 다시 결재해 주세요",
      };
    }
    return executeBookingAfterHumanCommit(input);
  }
}

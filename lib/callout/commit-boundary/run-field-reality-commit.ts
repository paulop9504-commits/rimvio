/**
 * Reality Commit Boundary guards + Field Action runner.
 */

import { createSaga, saveSaga } from "@/lib/reality-transaction";
import { appendCommitLedgerEntry } from "@/lib/callout/commit-boundary/commit-ledger-store";
import type {
  CalloutAllowedMode,
  FieldRealityCommitReject,
  FieldRealityCommitRequest,
  FieldRealityCommitResult,
  FieldRealityCommitStage,
} from "@/lib/callout/commit-boundary/types";
import { CALLOUT_ALLOWED_MODES } from "@/lib/callout/commit-boundary/types";

export function isCalloutAllowedMode(mode: string): mode is CalloutAllowedMode {
  return (CALLOUT_ALLOWED_MODES as readonly string[]).includes(mode);
}

/** Callout UI must never expose a Commit mode tab. */
export function assertCalloutCannotCommit(op: string): void {
  if (
    op === "commit" ||
    op === "reality_commit" ||
    op === "callout_commit" ||
    op === "confirm_pay"
  ) {
    throw new Error(
      "Reality Commit Boundary: Callout cannot Commit — use Field Action",
    );
  }
}

export function filterCalloutModes(
  modes: readonly string[],
): CalloutAllowedMode[] {
  return modes.filter((m): m is CalloutAllowedMode => isCalloutAllowedMode(m));
}

/**
 * Field Action: 예약 확정
 * → Reality Transaction
 * → User Approval (must be true)
 * → Commit Ledger
 */
export function runFieldRealityCommit(input: {
  readonly request: FieldRealityCommitRequest;
  /** Human approval — Article 0. Never auto-true from Callout. */
  readonly userApproved: boolean;
  /** Source surface — reject if callout */
  readonly source: "field" | "callout" | "workspace";
}): FieldRealityCommitResult | FieldRealityCommitReject {
  if (input.source === "callout") {
    return {
      ok: false,
      reasonKo: "Callout에서는 Commit할 수 없어요 · Field에서 예약 확정하세요",
      calloutAttemptedCommit: true,
    };
  }

  if (!input.userApproved) {
    return {
      ok: false,
      reasonKo: "사람 승인 후에만 Reality Commit 됩니다",
      calloutAttemptedCommit: false,
    };
  }

  const { request } = input;
  const stages: FieldRealityCommitStage[] = ["field_action"];

  const saga = createSaga({
    contextEventId: request.contextId,
    operations: [
      {
        operationId: `reserve:${request.objectId}`,
        labelKo: request.labelKo || "예약 확정",
        compensationAction: "cancel_reservation_prepare",
      },
    ],
  });
  saveSaga(saga);
  stages.push("reality_transaction");
  stages.push("user_approval");

  const approvedAtIso = new Date().toISOString();
  const ledgerEntry = appendCommitLedgerEntry({
    entryId: `ledger_${Date.now().toString(36)}_${request.objectId}`,
    contextId: request.contextId,
    objectId: request.objectId,
    sagaId: saga.sagaId,
    labelKo: request.labelKo || "예약 확정",
    title: request.title,
    approvedAtIso,
    status: "recorded",
  });
  stages.push("commit_ledger");

  return {
    ok: true,
    stagesCompleted: stages,
    sagaId: saga.sagaId,
    ledgerEntry,
    summaryKo: `Field · ${request.labelKo} · Ledger 기록됨`,
  };
}

/**
 * Callout → Field handoff payload (no Commit).
 * Host opens Field Action; Commit happens only after user approval there.
 */
export function buildFieldHandoffFromCallout(input: {
  readonly contextId: string;
  readonly objectId: string;
  readonly title: string;
}): {
  readonly fieldActionLabelKo: string;
  readonly blockedInCallout: true;
  readonly request: FieldRealityCommitRequest;
} {
  return {
    fieldActionLabelKo: "예약 확정",
    blockedInCallout: true,
    request: {
      contextId: input.contextId,
      objectId: input.objectId,
      title: input.title,
      labelKo: "예약 확정",
    },
  };
}

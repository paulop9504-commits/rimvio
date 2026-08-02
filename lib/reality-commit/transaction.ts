/**
 * Reality Transaction + Commit orchestrator.
 *
 * Workspace Prepare
 *       ↓
 * Commit Review (Gate)
 *       ↓
 * User Approval
 *       ↓
 * Reality Transaction  (actor: "user")
 *       ↓
 * External API
 *       ↓
 * Reality State Update + Ledger
 *
 * AI never Commits.
 */

import type { PrepareObject } from "@/lib/prepare-layer";
import { readPrepareObject, readLatestPrepare } from "@/lib/prepare-layer";
import {
  assertAiCannotCommit,
  runCommitGate,
} from "@/lib/reality-commit/commit-gate";
import { appendRealityCommitLedgerEntry } from "@/lib/reality-commit/ledger";
import type {
  RealityCommitResult,
  RealityCommitSource,
  RealityCommitTransaction,
  UserApprovalRecord,
} from "@/lib/reality-commit/types";
import { REALITY_COMMIT_ACTOR } from "@/lib/reality-commit/types";
import {
  getRealityEntity,
  updateRealityEntityState,
} from "@/lib/reality-graph";

const txById = new Map<string, RealityCommitTransaction>();

function newTxId(type: string): string {
  return `rtx_${Date.now().toString(36)}_${type.slice(0, 8)}`;
}

function mapPrepareActionToCommitType(action: string): string {
  if (action === "reservation_prepare") return "hotel_reservation";
  if (action === "flight_prepare") return "flight_booking";
  if (action === "purchase_candidate") return "purchase";
  if (action === "schedule_prepare") return "schedule_confirm";
  return action;
}

/**
 * Stub External API — records attempt; never invents silent success without Gate.
 * Real providers plug in here later.
 */
export function invokeExternalCommitApi(input: {
  readonly type: string;
  readonly entityId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}): RealityCommitTransaction["externalApi"] {
  const provider =
    input.type === "hotel_reservation"
      ? "reservation_provider"
      : input.type === "flight_booking"
        ? "flight_provider"
        : input.type === "purchase"
          ? "commerce_provider"
          : "schedule_provider";

  return {
    attempted: true,
    ok: true,
    provider,
    referenceId: `ext_${Date.now().toString(36)}_${input.entityId.slice(0, 8)}`,
    detailKo: `${provider} · 요청 접수 (Commit)`,
  };
}

export function createRealityCommitTransaction(input: {
  readonly type: string;
  readonly entityId: string;
  readonly beforeState: Readonly<Record<string, unknown>>;
  readonly afterState: Readonly<Record<string, unknown>>;
  readonly prepareId?: string | null;
  readonly workspaceId?: string | null;
  readonly externalApi: RealityCommitTransaction["externalApi"];
}): RealityCommitTransaction {
  const tx: RealityCommitTransaction = {
    id: newTxId(input.type),
    type: input.type,
    beforeState: input.beforeState,
    afterState: input.afterState,
    timestamp: new Date().toISOString(),
    actor: REALITY_COMMIT_ACTOR,
    entityId: input.entityId.trim(),
    prepareId: input.prepareId ?? null,
    workspaceId: input.workspaceId ?? null,
    externalApi: input.externalApi,
    status: "committed",
  };
  txById.set(tx.id, tx);
  return tx;
}

export function readRealityCommitTransaction(
  transactionId: string,
): RealityCommitTransaction | null {
  return txById.get(transactionId.trim()) ?? null;
}

export function clearRealityCommitTransactionsForTests(): void {
  txById.clear();
}

function buildBeforeAfter(input: {
  readonly prepare: PrepareObject;
  readonly entityLifecycle: string | null;
}): {
  beforeState: Readonly<Record<string, unknown>>;
  afterState: Readonly<Record<string, unknown>>;
} {
  const isReservation = input.prepare.action === "reservation_prepare";
  const beforeLifecycle =
    input.entityLifecycle === "prepared" ||
    input.entityLifecycle === "compared" ||
    input.entityLifecycle === "candidate"
      ? input.entityLifecycle
      : "candidate";

  const beforeState: Record<string, unknown> = {
    lifecycle: beforeLifecycle,
    reservationStatus: isReservation ? "candidate" : beforeLifecycle,
    prepareStatus: input.prepare.status,
    entityId: input.prepare.entityId,
    payload: input.prepare.payload,
  };

  const afterState: Record<string, unknown> = {
    lifecycle: "committed",
    reservationStatus: isReservation ? "confirmed" : "committed",
    prepareStatus: "committed",
    entityId: input.prepare.entityId,
    payload: input.prepare.payload,
  };

  return { beforeState, afterState };
}

/**
 * Commit Review → Approval → Transaction → External API → State → Ledger.
 * actor is always "user". AI sources are rejected.
 */
export function runRealityCommit(input: {
  readonly source: RealityCommitSource;
  readonly approval: UserApprovalRecord | null;
  readonly prepareId?: string | null;
  readonly workspaceId?: string | null;
  readonly entityId?: string | null;
  /** When prepareId omitted, use latest prepare in workspace */
  readonly prepare?: PrepareObject | null;
}): RealityCommitResult {
  const stages: string[] = ["commit_review"];

  try {
    assertAiCannotCommit(input.source);
  } catch {
    return {
      ok: false,
      reasonKo: "AI는 Commit할 수 없어요 · Human Approval Required",
      aiAttemptedCommit: true,
      gate: null,
    };
  }

  if (input.source === "ai" || input.source === "agent" || input.source === "callout") {
    return {
      ok: false,
      reasonKo: "AI는 Commit할 수 없어요 · Human Approval Required",
      aiAttemptedCommit: true,
      gate: null,
    };
  }

  const prepare =
    input.prepare ??
    (input.prepareId ? readPrepareObject(input.prepareId) : null) ??
    (input.workspaceId ? readLatestPrepare(input.workspaceId) : null);

  if (!prepare) {
    return {
      ok: false,
      reasonKo: "Commit할 Workspace Prepare가 없어요",
      aiAttemptedCommit: false,
      gate: null,
    };
  }

  const entityId = (input.entityId ?? prepare.entityId).trim();
  const gate = runCommitGate({
    source: input.source,
    approval: input.approval,
    prepare,
    entityId,
  });
  stages.push("commit_gate");

  if (!gate.ok) {
    return {
      ok: false,
      reasonKo: gate.reasonKo,
      aiAttemptedCommit: gate.aiAttemptedCommit,
      gate,
    };
  }
  stages.push("user_approval");

  const entity = getRealityEntity(entityId);
  const { beforeState, afterState } = buildBeforeAfter({
    prepare,
    entityLifecycle:
      typeof entity?.state.lifecycle === "string"
        ? entity.state.lifecycle
        : null,
  });

  const type = mapPrepareActionToCommitType(prepare.action);

  // External API
  const externalApi = invokeExternalCommitApi({
    type,
    entityId,
    payload: prepare.payload,
  });
  stages.push("external_api");

  if (!externalApi.ok) {
    return {
      ok: false,
      reasonKo: externalApi.detailKo ?? "External API 실패",
      aiAttemptedCommit: false,
      gate,
    };
  }

  const transaction = createRealityCommitTransaction({
    type,
    entityId,
    beforeState,
    afterState,
    prepareId: prepare.prepareId,
    workspaceId: input.workspaceId ?? prepare.workspaceId,
    externalApi,
  });
  stages.push("reality_transaction");

  // Reality State Update
  if (entity) {
    updateRealityEntityState(entityId, {
      ...entity.state,
      lifecycle: "committed",
      reservationStatus: afterState.reservationStatus,
      lastCommitTransactionId: transaction.id,
      readyForCommit: false,
      committedAtIso: transaction.timestamp,
    });
  }
  stages.push("reality_state_update");

  const ledgerEntry = appendRealityCommitLedgerEntry({
    entryId: `rcl_${Date.now().toString(36)}_${entityId.slice(0, 8)}`,
    transactionId: transaction.id,
    type: transaction.type,
    entityId,
    beforeState: transaction.beforeState,
    afterState: transaction.afterState,
    timestamp: transaction.timestamp,
    actor: REALITY_COMMIT_ACTOR,
    workspaceId: transaction.workspaceId,
    prepareId: prepare.prepareId,
    sourceDraftId: prepare.prepareId,
    approvedAt: input.approval?.approvedAtIso ?? transaction.timestamp,
    previousState: transaction.beforeState,
    newState: transaction.afterState,
    externalReference: transaction.externalApi.referenceId ?? "",
    summaryKo:
      type === "hotel_reservation"
        ? `Hotel Reservation · ${String(beforeState.reservationStatus)} → ${String(afterState.reservationStatus)}`
        : `${type} · committed`,
  });
  stages.push("ledger");

  return {
    ok: true,
    transaction,
    ledgerEntry,
    stagesCompleted: stages,
    summaryKo: [
      ledgerEntry.summaryKo,
      `actor · ${transaction.actor}`,
      `before · ${String(beforeState.reservationStatus ?? beforeState.lifecycle)}`,
      `after · ${String(afterState.reservationStatus ?? afterState.lifecycle)}`,
      `timestamp · ${transaction.timestamp}`,
      "Ledger 기록됨",
    ].join("\n"),
  };
}

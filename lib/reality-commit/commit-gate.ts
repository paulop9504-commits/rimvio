/**
 * Commit Gate — Human Approval Required.
 * AI / Agent / Callout never pass.
 *
 * Checks:
 *  1. User Approval 존재
 *  2. Policy Check 통과
 *  3. External Action 가능 여부
 */

import type { PrepareObject } from "@/lib/prepare-layer";
import { PREPARE_OBJECT_STATUS } from "@/lib/prepare-layer";
import type {
  CommitGateCheck,
  CommitGateResult,
  RealityCommitSource,
  UserApprovalRecord,
} from "@/lib/reality-commit/types";
import { getRealityEntity } from "@/lib/reality-graph";

function isAiSource(source: RealityCommitSource): boolean {
  return source === "ai" || source === "agent" || source === "callout";
}

export function assertAiCannotCommit(source: RealityCommitSource): void {
  if (isAiSource(source)) {
    throw new Error(
      "Reality Commit System: AI cannot Commit — Human Approval Required",
    );
  }
}

/**
 * Run Commit Gate before any Reality Transaction.
 */
export function runCommitGate(input: {
  readonly source: RealityCommitSource;
  readonly approval: UserApprovalRecord | null;
  readonly prepare: PrepareObject | null;
  readonly entityId: string;
  /** Soft policy: reservation requires dates + guests */
  readonly requirePrepareReady?: boolean;
}): CommitGateResult {
  const checks: CommitGateCheck[] = [];
  const aiAttempted = isAiSource(input.source);

  // ── 1. User Approval ──
  const approvalOk =
    !aiAttempted &&
    input.approval != null &&
    input.approval.approved === true &&
    (input.approval.channel === "field" || input.approval.channel === "human");

  checks.push({
    id: "user_approval",
    ok: approvalOk,
    detailKo: approvalOk
      ? "User Approval 확인"
      : aiAttempted
        ? "AI는 Commit할 수 없어요 · Human Approval Required"
        : "사람 승인이 필요해요",
  });

  // ── 2. Policy Check ──
  const requirePrepare = input.requirePrepareReady !== false;
  let policyOk = !aiAttempted && input.source !== "workspace";
  // workspace source allowed only with explicit human approval (Field handoff)
  if (input.source === "workspace" && approvalOk) {
    policyOk = true;
  }
  if (input.source === "field" || input.source === "human") {
    policyOk = approvalOk;
  }

  if (requirePrepare) {
    if (!input.prepare) {
      policyOk = false;
    } else if (input.prepare.status !== PREPARE_OBJECT_STATUS) {
      policyOk = false;
    } else if (input.prepare.entityId !== input.entityId.trim()) {
      policyOk = false;
    }
  }

  let policyDetail = "Policy Check 통과";
  if (aiAttempted) {
    policyDetail = "AI / Callout / Agent Commit 거부";
  } else if (!input.prepare && requirePrepare) {
    policyDetail = "Workspace Prepare(ready_for_commit)가 없어요";
  } else if (
    input.prepare &&
    input.prepare.status !== PREPARE_OBJECT_STATUS
  ) {
    policyDetail = "Prepare가 ready_for_commit이 아니에요";
  } else if (!approvalOk) {
    policyDetail = "승인 없는 Commit은 Policy 위반";
  }

  checks.push({
    id: "policy_check",
    ok: policyOk,
    detailKo: policyDetail,
  });

  // ── 3. External Action 가능 여부 ──
  const entity = getRealityEntity(input.entityId);
  const payload = input.prepare?.payload ?? {};
  let externalOk = Boolean(entity) && Boolean(input.entityId.trim());

  if (input.prepare?.action === "reservation_prepare") {
    const guests = payload.guests;
    const dates = payload.dates as
      | { checkInIso?: string | null; labelKo?: string | null }
      | undefined;
    const hasDates = Boolean(dates?.checkInIso || dates?.labelKo);
    const hasGuests = typeof guests === "number" && guests >= 1;
    externalOk = externalOk && hasDates && hasGuests;
  }

  if (input.prepare?.lifecycle === "prepared") {
    // prepared + entity → external path available (stub provider)
  }

  checks.push({
    id: "external_action",
    ok: externalOk,
    detailKo: externalOk
      ? "External Action 가능"
      : !entity
        ? "대상 Entity가 없어요"
        : "예약/실행에 필요한 정보(날짜·인원 등)가 부족해요",
  });

  const allOk = checks.every((c) => c.ok);
  if (!allOk) {
    const failed = checks.find((c) => !c.ok);
    return {
      ok: false,
      checks,
      reasonKo: failed?.detailKo ?? "Commit Gate 실패",
      aiAttemptedCommit: aiAttempted,
    };
  }

  return { ok: true, checks };
}

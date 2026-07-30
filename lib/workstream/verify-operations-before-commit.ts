/**
 * Commit gate — force-run Verification Agent before Reality mutate (ADR-043).
 * Stage logging alone is not enough: blocked findings refuse Commit.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import { runVerificationThenRepair } from "@/lib/workstream/agent-brain";
import { buildCommitScheduleFeasibility } from "@/lib/workstream/build-commit-feasibility";
import {
  preferenceWeight,
} from "@/lib/workstream/preference-graph";
import type {
  VerificationFinding,
  VerificationReport,
} from "@/lib/workstream/verification-agent";
import { enterAgentSpine } from "@/lib/workstream/agent-spine-law";

export type CommitVerificationGateResult = {
  /** True when Verification Agent (or preference checks) actually ran. */
  readonly ran: boolean;
  /** Allow booking / stamp. */
  readonly ok: boolean;
  readonly blocked: boolean;
  readonly report: VerificationReport;
  readonly reasonKo: string | null;
};

function mergeReports(
  parts: readonly VerificationReport[],
): VerificationReport {
  const findings = parts.flatMap((p) => p.findings);
  const blocked = findings.some((f) => f.severity === "block");
  const hasWarn = findings.some((f) => f.severity === "warn");
  return {
    ok: !blocked && !hasWarn,
    findings,
    blocked,
  };
}

/** Soft Preference Graph checks on lodging Commit labels (warn only). */
export function verifyLodgingPreferenceFit(input: {
  readonly operations: readonly RealityOperationV1[];
}): VerificationReport {
  const findings: VerificationFinding[] = [];
  const lodgingOps = input.operations.filter(
    (op) => op.kind === "lodging" || op.type === "booking_prep",
  );
  if (lodgingOps.length === 0) {
    return { ok: true, findings: [], blocked: false };
  }

  const quiet = preferenceWeight("quiet_hotel");
  const budget = preferenceWeight("budget_sensitive");
  const luxury = preferenceWeight("luxury");

  for (const op of lodgingOps) {
    const blob = [
      op.labelKo,
      op.preview.placeLabelKo,
      op.preview.titleKo,
      op.preview.summaryKo,
    ]
      .filter(Boolean)
      .join(" ");

    if (
      quiet >= 0.55 &&
      /party|클럽|호스텔|hostel|capsule|캡슐|nightlife|유흥/iu.test(blob)
    ) {
      findings.push({
        id: "pref_quiet_conflict",
        severity: "warn",
        titleKo: "조용한 숙소 선호와 충돌",
        detailKo: `${op.preview.placeLabelKo ?? op.labelKo} — Preference Graph: 조용한 숙소`,
        repairHintKo: "한적한 숙소로 다시 고르기",
      });
    }

    if (
      budget >= 0.55 &&
      luxury < 0.4 &&
      /스위트|suite|5성|럭셔리|luxury|premium/iu.test(blob)
    ) {
      findings.push({
        id: "pref_budget_conflict",
        severity: "warn",
        titleKo: "가성비 선호와 충돌",
        detailKo: `${op.preview.placeLabelKo ?? op.labelKo} — Preference Graph: 가성비`,
        repairHintKo: "가격대 낮은 후보로 교체",
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      id: "pref_lodging_ok",
      severity: "ok",
      titleKo: "선호 적합",
      detailKo: "Preference Graph와 숙소 라벨 충돌 없음",
      repairHintKo: null,
    });
  }

  const blocked = findings.some((f) => f.severity === "block");
  const hasWarn = findings.some((f) => f.severity === "warn");
  return { ok: !blocked && !hasWarn, findings, blocked };
}

/**
 * Force Verification Agent before Commit.
 * - Schedule coords missing → skip distance check (no false block).
 * - `blocked` findings → refuse Commit after Self Repair attempt.
 * - `warn` only → Repair runs; Commit allowed.
 */
export function verifyOperationsBeforeCommit(input: {
  readonly contextEventId: string;
  readonly event: EventCandidate | null;
  readonly operations: readonly RealityOperationV1[];
}): CommitVerificationGateResult {
  const bookingOps = input.operations.filter(
    (op) => op.type !== "payment_prep",
  );
  if (bookingOps.length === 0) {
    return {
      ran: false,
      ok: true,
      blocked: false,
      report: { ok: true, findings: [], blocked: false },
      reasonKo: null,
    };
  }

  enterAgentSpine({
    source: "workstream",
    contextEventId: input.contextEventId,
    stage: "verification",
  });

  const parts: VerificationReport[] = [];
  const prefReport = verifyLodgingPreferenceFit({ operations: bookingOps });
  parts.push(prefReport);

  const feasibility = buildCommitScheduleFeasibility({
    event: input.event,
    operations: bookingOps,
  });

  let scheduleReport: VerificationReport;
  if (feasibility) {
    scheduleReport = runVerificationThenRepair({
      contextEventId: input.contextEventId,
      feasibility,
    });
  } else {
    scheduleReport = {
      ok: true,
      blocked: false,
      findings: [
        {
          id: "verify_skip_no_coords",
          severity: "ok",
          titleKo: "이동 검증 생략",
          detailKo: "숙소·일정 좌표가 없어 거리 검증을 건너뜀",
          repairHintKo: null,
        },
      ],
    };
  }
  parts.push(scheduleReport);

  const report = mergeReports(parts);
  if (report.blocked) {
    enterAgentSpine({
      source: "workstream",
      contextEventId: input.contextEventId,
      stage: "repair",
    });
    const blockFinding =
      report.findings.find((f) => f.severity === "block") ?? null;
    return {
      ran: true,
      ok: false,
      blocked: true,
      report,
      reasonKo:
        blockFinding?.detailKo ??
        "검증 실패 — Reality Commit을 진행할 수 없어요",
    };
  }

  if (!report.ok) {
    // Warn-only: Repair already attempted inside runVerificationThenRepair.
    enterAgentSpine({
      source: "workstream",
      contextEventId: input.contextEventId,
      stage: "repair",
    });
  }

  return {
    ran: true,
    ok: true,
    blocked: false,
    report,
    reasonKo: null,
  };
}

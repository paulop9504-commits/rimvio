/**
 * Background Verify → Repair for Agent Runtime (ADR-042).
 * Uses Commit feasibility wire when coords exist; never false-blocks without inputs.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { runVerificationThenRepair } from "@/lib/workstream/agent-brain";
import { publishAgentRuntimeEvent } from "@/lib/workstream/agent-runtime-bus";
import { buildCommitScheduleFeasibility } from "@/lib/workstream/build-commit-feasibility";
import { runScheduleConflictSelfHeal } from "@/lib/workstream/agent-execution-loop";
import { enterAgentSpine } from "@/lib/workstream/agent-spine-law";
import type { VerificationReport } from "@/lib/workstream/verification-agent";
import {
  dispatchBackgroundTask,
  type BackgroundTaskRecord,
} from "@/lib/workstream/background-task-dispatch";

export type BackgroundVerificationResult = {
  readonly report: VerificationReport;
  readonly ranFeasibility: boolean;
  readonly usedRepair: boolean;
};

function skipReport(): VerificationReport {
  return {
    ok: true,
    blocked: false,
    findings: [
      {
        id: "verify_skip_no_coords",
        severity: "ok",
        titleKo: "이동 검증 생략",
        detailKo: "좌표 없음 — 백그라운드 검증 건너뜀",
        repairHintKo: null,
      },
    ],
  };
}

/**
 * Pure verify/repair — safe for sync tests and bg runner.
 */
export function runBackgroundAgentVerification(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly strategy?: "schedule" | "recovery";
}): BackgroundVerificationResult {
  const contextEventId = input.contextEventId.trim();
  enterAgentSpine({
    source: "workstream",
    contextEventId,
    stage: "verification",
  });

  const feasibility = buildCommitScheduleFeasibility({
    event: input.event ?? null,
    operations: [],
  });

  if (feasibility) {
    const report = runVerificationThenRepair({
      contextEventId,
      feasibility,
    });
    publishAgentRuntimeEvent({
      kind: "verification_finished",
      contextEventId,
      labelKo: report.blocked ? "검증 차단" : "검증 완료",
      payload: { blocked: report.blocked, ok: report.ok },
    });
    if (!report.blocked && !report.ok) {
      publishAgentRuntimeEvent({
        kind: "repair_finished",
        contextEventId,
        labelKo: "자동 수정 시도",
      });
    }
    return { report, ranFeasibility: true, usedRepair: !report.ok };
  }

  if (input.strategy === "recovery") {
    runScheduleConflictSelfHeal({ contextEventId });
    publishAgentRuntimeEvent({
      kind: "repair_finished",
      contextEventId,
      labelKo: "일정 충돌 자동 수정",
    });
    return {
      report: skipReport(),
      ranFeasibility: false,
      usedRepair: true,
    };
  }

  publishAgentRuntimeEvent({
    kind: "verification_finished",
    contextEventId,
    labelKo: "검증 생략",
    payload: { skipped: true },
  });
  return { report: skipReport(), ranFeasibility: false, usedRepair: false };
}

/**
 * Queue `bg:verify_schedule` — returns immediately.
 */
export function dispatchBackgroundAgentVerification(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly strategy?: "schedule" | "recovery";
  readonly sync?: boolean;
}): BackgroundTaskRecord {
  return dispatchBackgroundTask({
    kind: "verify_schedule",
    contextEventId: input.contextEventId,
    labelKo: "일정 검증",
    sync: input.sync,
    run: () =>
      runBackgroundAgentVerification({
        contextEventId: input.contextEventId,
        event: input.event,
        strategy: input.strategy,
      }),
  });
}

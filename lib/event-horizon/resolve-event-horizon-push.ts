import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import { readUserStatus } from "@/lib/global-brain/user-status-store";
import { buildLifeContextSnapshot } from "@/lib/event-horizon/build-life-context-snapshot";
import type { GlobalBrainSnapshot } from "@/lib/global-brain/types";
import {
  formatEventHorizonNudgeCopy,
  type GuardianNudgeCopy,
  type GuardianTone,
} from "@/lib/guardian-copy";
import {
  EVENT_HORIZON_DAILY_PUSH_CAP,
  readEventHorizonPushCount,
} from "@/lib/event-horizon/daily-nudge-cap-store";

export type EventHorizonPushReason =
  | "ready"
  | "no_insight"
  | "not_high_severity"
  | "cap_exceeded"
  | "dismissed"
  | "morning_unlock_suppressed";

export type EventHorizonPushDecision = {
  visible: boolean;
  reason: EventHorizonPushReason;
  insightKind: string | null;
  copy: GuardianNudgeCopy | null;
};

export function buildEventHorizonSnapshotForClient(input: {
  context: MasterOrchestratorContext;
  now?: Date;
}): GlobalBrainSnapshot {
  return buildLifeContextSnapshot({
    referenceDate: input.context.currentDate,
    existingSchedule: input.context.existingSchedule,
    userStatus: readUserStatus(),
    now: input.now ?? new Date(),
  });
}

export function resolveEventHorizonPush(input: {
  snapshot: GlobalBrainSnapshot;
  dateKey: string;
  dismissedForDateKey: string | null;
  suppressForMorningUnlock: boolean;
  tone?: GuardianTone;
}): EventHorizonPushDecision {
  if (input.suppressForMorningUnlock) {
    return {
      visible: false,
      reason: "morning_unlock_suppressed",
      insightKind: null,
      copy: null,
    };
  }
  if (input.dismissedForDateKey === input.dateKey) {
    return {
      visible: false,
      reason: "dismissed",
      insightKind: null,
      copy: null,
    };
  }
  if (readEventHorizonPushCount(input.dateKey) >= EVENT_HORIZON_DAILY_PUSH_CAP) {
    return {
      visible: false,
      reason: "cap_exceeded",
      insightKind: null,
      copy: null,
    };
  }

  const top = input.snapshot.eventHorizon[0];
  if (!top) {
    return {
      visible: false,
      reason: "no_insight",
      insightKind: null,
      copy: null,
    };
  }
  if (top.severity !== "high") {
    return {
      visible: false,
      reason: "not_high_severity",
      insightKind: top.kind,
      copy: null,
    };
  }

  const copy = formatEventHorizonNudgeCopy({
    insight: top,
    snapshot: input.snapshot,
    tone: input.tone ?? "jarvis",
  });

  return {
    visible: true,
    reason: "ready",
    insightKind: top.kind,
    copy,
  };
}

export function eventHorizonPushToOrchestratorResult(input: {
  copy: GuardianNudgeCopy;
  insightKind: string;
}): OrchestratorResult {
  return {
    summary: input.copy.summary,
    actions: [
      {
        id: "event-horizon-reschedule",
        label: input.copy.primaryActionLabel,
        kind: "custom",
        payload: {
          experienceChoicePrompt: "오늘 일정 중 미룰 수 있는 것 찾아서 조정해줘",
        },
      },
      {
        id: "event-horizon-core-only",
        label: input.copy.secondaryActionLabel,
        kind: "custom",
        payload: {
          experienceChoicePrompt: "오늘 꼭 필요한 일만 남기고 나머지 정리해줘",
        },
      },
    ],
    source: "rules",
    confidence: 0.88,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    thought: `EventHorizon · ${input.insightKind}`,
  };
}

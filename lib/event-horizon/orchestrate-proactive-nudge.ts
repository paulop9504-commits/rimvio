import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { isConversationalOnlyMessage } from "@/lib/action-chat/conversation-turns";
import type {
  EventHorizonInsight,
  GlobalBrainSnapshot,
  UserStatusRecord,
} from "@/lib/global-brain/types";
import {
  formatEventHorizonNudgeCopy,
  type GuardianTone,
} from "@/lib/guardian-copy";
import { eventHorizonPushToOrchestratorResult } from "@/lib/event-horizon/resolve-event-horizon-push";

function hasExplicitActionIntent(message: string): boolean {
  return /https?:\/\/|지도|맛집|길\s*찾|네비|검색|예약|일정\s*잡|전화(?:해|걸)|추천\s*해|찾아\s*줘|열어\s*줘|알려\s*줘/iu.test(
    message,
  );
}

function detectToneFromMessage(message: string): GuardianTone {
  return /(?:jarvis|자비스|현황\s*보고|디지털\s*지능)/iu.test(message)
    ? "jarvis"
    : "partner";
}

function shouldProactiveEventHorizon(input: {
  message: string;
  insights: EventHorizonInsight[];
  userStatus: UserStatusRecord | null;
}): boolean {
  if (input.insights.length === 0) {
    return false;
  }
  if (hasExplicitActionIntent(input.message)) {
    return false;
  }
  const top = input.insights[0];
  if (!top || top.severity !== "high") {
    return false;
  }
  const trimmed = input.message.trim();
  if (trimmed.length <= 32 || isConversationalOnlyMessage(trimmed)) {
    return true;
  }
  if (input.userStatus && trimmed.length <= 48) {
    return true;
  }
  return false;
}

function buildEventHorizonProactiveResult(
  insight: EventHorizonInsight,
  snapshot: GlobalBrainSnapshot,
  tone: GuardianTone,
): OrchestratorResult {
  const copy = formatEventHorizonNudgeCopy({ insight, snapshot, tone });
  return eventHorizonPushToOrchestratorResult({
    copy,
    insightKind: insight.kind,
  });
}

/** Phase-2 fast path — not Global Brain. */
export function tryEventHorizonProactiveResult(input: {
  message: string;
  snapshot: GlobalBrainSnapshot;
  skipWhenBusy?: boolean;
}): OrchestratorResult | null {
  if (input.skipWhenBusy) {
    return null;
  }
  if (
    !shouldProactiveEventHorizon({
      message: input.message,
      insights: input.snapshot.eventHorizon,
      userStatus: input.snapshot.userStatus,
    })
  ) {
    return null;
  }
  const top = input.snapshot.eventHorizon[0];
  if (!top) {
    return null;
  }
  return buildEventHorizonProactiveResult(
    top,
    input.snapshot,
    detectToneFromMessage(input.message),
  );
}

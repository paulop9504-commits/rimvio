/**
 * Compose Reality Control snapshot from Execution Plan + active trades.
 * Does not Commit — read-only Pending Reality projection.
 */

import { readContextExecutionPlanFromEvent } from "@/lib/context-execution/context-execution-plan-metadata";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import { readRealityQueueHeldItemIds } from "@/lib/reality-queue/reality-queue-hold-store";
import type {
  RealityAgentChipV1,
  RealityControlSnapshotV1,
  RealityQueueItemStatus,
  RealityQueueItemV1,
} from "@/lib/reality-queue/types";

const PLAN_PHASES_PENDING = new Set([
  "execution_planned",
  "plan_waiting_approval",
  "executing",
  "execution_prepared",
  "waiting_approval",
]);

function stepStatusToQueue(
  status: string,
): RealityQueueItemStatus {
  if (status === "prepared" || status === "ready" || status === "done") {
    return "ready";
  }
  if (status === "running") {
    return "running";
  }
  if (status === "blocked" || status === "failed") {
    return "blocked";
  }
  if (status === "waiting_approval") {
    return "needs_review";
  }
  return "needs_review";
}

function engineIdToAgentLabel(engineId: string | null): string {
  switch (engineId) {
    case "flight_booking":
      return "항공";
    case "lodging_search":
      return "숙소";
    case "transit_navigate":
      return "이동";
    case "finance_prep":
      return "결제";
    case "trip_experience_search":
      return "경험";
    default:
      return "준비";
  }
}

function buildItemsFromPlans(
  events: readonly EventCandidate[],
): RealityQueueItemV1[] {
  const items: RealityQueueItemV1[] = [];
  for (const event of events) {
    const plan = readContextExecutionPlanFromEvent(event);
    if (!plan || !PLAN_PHASES_PENDING.has(plan.osPhase)) {
      continue;
    }
    for (const step of plan.steps) {
      if (step.status === "done") {
        continue;
      }
      // Executing: only surface Commit-ready (or blocked) steps — hide running/
      // pending so the queue is a step approval loop, not a full graph dump.
      if (plan.osPhase === "executing") {
        if (step.status === "pending" || step.status === "running") {
          continue;
        }
      }
      items.push({
        itemId: `plan:${event.id}:${step.stepId}`,
        kind: "execution_step",
        labelKo: step.labelKo.trim() || "실행 단계",
        status: stepStatusToQueue(step.status),
        contextEventId: event.id,
        detailKo: plan.goalKo,
        sourceRef: step.stepId,
      });
    }
  }
  return items;
}

function buildItemsFromTrades(
  sessions: readonly MarketTradeSessionView[],
): RealityQueueItemV1[] {
  return sessions.map((session) => {
    const label =
      session.productTitle?.trim() ||
      session.meetPlaceLabel?.trim() ||
      "거래 확정";
    const needsReview =
      session.tradeStatus === "chat" ||
      session.tradeStatus === "scheduling" ||
      session.tradeStatus === "buyer_picked_day" ||
      session.tradeStatus === "seller_proposed" ||
      session.showAcceptProposal ||
      session.canConfirmHandshakeComplete;
    const ready =
      session.tradeStatus === "confirmed" ||
      session.tradeStatus === "en_route" ||
      session.tradeStatus === "meeting";
    return {
      itemId: `trade:${session.handshakeId}`,
      kind: "trade" as const,
      labelKo: label,
      status: (needsReview
        ? "needs_review"
        : ready
          ? "ready"
          : "needs_review") as RealityQueueItemStatus,
      contextEventId: null,
      detailKo: session.statusHeadlineKo?.trim() || null,
      amountLabel: session.priceLine?.trim() || null,
      sourceRef: session.handshakeId,
    };
  });
}

function buildAgentChips(items: readonly RealityQueueItemV1[]): RealityAgentChipV1[] {
  const byLabel = new Map<string, RealityAgentChipV1>();
  for (const item of items) {
    if (item.kind === "trade") {
      const prev = byLabel.get("거래");
      const status =
        item.status === "running"
          ? "running"
          : item.status === "needs_review" || item.status === "blocked"
            ? "needs_review"
            : "ready";
      if (!prev || status === "running" || (status === "needs_review" && prev.status === "ready")) {
        byLabel.set("거래", { agentId: "trade", labelKo: "거래", status });
      }
      continue;
    }
    const label = item.labelKo.slice(0, 4);
    const agentId = item.sourceRef ?? item.itemId;
    const status =
      item.status === "running"
        ? "running"
        : item.status === "needs_review" || item.status === "blocked"
          ? "needs_review"
          : "ready";
    const prev = byLabel.get(label);
    if (!prev || status === "running" || (status === "needs_review" && prev.status === "ready")) {
      byLabel.set(label, { agentId, labelKo: label, status });
    }
  }
  if (byLabel.size === 0) {
    return [
      { agentId: "idle", labelKo: "대기", status: "idle" },
    ];
  }
  return [...byLabel.values()].slice(0, 6);
}

function resolveRisk(
  items: readonly RealityQueueItemV1[],
): "low" | "medium" | "high" {
  if (items.some((item) => item.status === "blocked")) {
    return "high";
  }
  if (items.some((item) => item.status === "needs_review")) {
    return "medium";
  }
  return "low";
}

function sumAmountLabels(items: readonly RealityQueueItemV1[]): string | null {
  const labels = items
    .map((item) => item.amountLabel?.trim())
    .filter((value): value is string => Boolean(value));
  if (labels.length === 0) {
    return null;
  }
  if (labels.length === 1) {
    return labels[0]!;
  }
  return labels.slice(0, 3).join(" · ");
}

export function buildRealityControlSnapshot(input: {
  tradeSessions?: readonly MarketTradeSessionView[];
  events?: readonly EventCandidate[];
  titleKo?: string;
  subtitleKo?: string;
  /** When false, skip hold filter (tests). Default true on client. */
  applyHolds?: boolean;
}): RealityControlSnapshotV1 {
  const events = input.events ?? listLifeEventCandidates();
  const planItems = buildItemsFromPlans(events);
  const tradeItems = buildItemsFromTrades(input.tradeSessions ?? []);
  const held =
    input.applyHolds === false
      ? new Set<string>()
      : readRealityQueueHeldItemIds();
  const items = [...planItems, ...tradeItems].filter(
    (item) => !held.has(item.itemId),
  );
  const needsReview = items.some(
    (item) => item.status === "needs_review" || item.status === "blocked",
  );
  const hasReady = items.some((item) => item.status === "ready");
  const running = items.some((item) => item.status === "running");
  const primaryContextEventId =
    items.find((item) => item.contextEventId)?.contextEventId ?? null;
  const planCount = items.filter((item) => item.kind === "execution_step").length;

  return {
    version: 1,
    titleKo: input.titleKo ?? "반영 대기",
    subtitleKo:
      input.subtitleKo ??
      (items.length > 0
        ? "AI가 준비했어요 · 아직 현실은 그대로예요"
        : "지구에서 맥락을 만들면 여기에 쌓여요"),
    agents: buildAgentChips(items),
    items,
    impact: {
      timeSavedLabel:
        planCount > 0 ? `단계 ${planCount}` : null,
      costLabel: sumAmountLabels(items),
      risk: resolveRisk(items),
      pendingCount: items.length,
    },
    canCommit: hasReady && !needsReview && !running && items.length > 0,
    primaryContextEventId,
  };
}

/** Map engine id → chip label (for tests / UI helpers). */
export function realityAgentLabelFromEngineId(engineId: string | null): string {
  return engineIdToAgentLabel(engineId);
}

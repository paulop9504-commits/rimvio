/**
 * Compose Reality Control snapshot from Execution Plan + trades + prepared Operations.
 * Does not Commit — read-only Pending Reality projection.
 */

import { readContextExecutionPlanFromEvent } from "@/lib/context-execution/context-execution-plan-metadata";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import {
  domainFolderLabelKo,
  engineIdToQueueKind,
  kindLabelKo,
  queueKindToDomain,
  queueKindToOperationType,
} from "@/lib/reality-queue/operation-taxonomy";
import { preparedOperationsAsQueueItems } from "@/lib/reality-queue/prepared-operations-store";
import { readRealityQueueHeldItemIds } from "@/lib/reality-queue/reality-queue-hold-store";
import type {
  RealityAgentChipV1,
  RealityControlSnapshotV1,
  RealityOperationDomain,
  RealityOperationFolderV1,
  RealityQueueItemStatus,
  RealityQueueItemV1,
} from "@/lib/reality-queue/types";
import { asQueueItem } from "@/lib/reality-queue/types";

const PLAN_PHASES_PENDING = new Set([
  "execution_planned",
  "plan_waiting_approval",
  "executing",
  "execution_prepared",
  "waiting_approval",
]);

const DOMAIN_ORDER: readonly RealityOperationDomain[] = [
  "travel",
  "shopping",
  "finance",
  "work",
  "other",
];

function stepStatusToQueue(status: string): RealityQueueItemStatus {
  if (status === "prepared" || status === "ready" || status === "done") {
    return "ready";
  }
  if (status === "running") {
    return "running";
  }
  if (status === "blocked" || status === "failed") {
    return "blocked";
  }
  if (status === "waiting_approval" || status === "pending") {
    return status === "pending" ? "pending" : "needs_review";
  }
  return "needs_review";
}

function engineIdToAgentLabel(engineId: string | null): string {
  return kindLabelKo(engineIdToQueueKind(engineId));
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
      if (plan.osPhase === "executing") {
        if (step.status === "pending" || step.status === "running") {
          continue;
        }
      }
      const kind = engineIdToQueueKind(step.engineId);
      const labelKo = step.labelKo.trim() || "실행 단계";
      const operationId = `plan:${event.id}:${step.stepId}`;
      items.push(
        asQueueItem({
          operationId,
          type: queueKindToOperationType(kind),
          domain: queueKindToDomain(kind),
          status: stepStatusToQueue(step.status),
          contextEventId: event.id,
          contextLabelKo: plan.goalKo,
          labelKo,
          createdBy: "ai_assistant",
          preview: {
            titleKo: labelKo,
            summaryKo: plan.goalKo,
            diffFromKo: "준비 전",
            diffToKo: `${labelKo} 반영`,
            confidencePct: step.status === "prepared" ? 90 : 75,
          },
          needApproval: true,
          dependsOnItemIds: [],
          dependencyNoteKo: null,
          undoAllowed: true,
          expiresAtIso: null,
          sourceRef: step.stepId,
          engineId: step.engineId,
          kind,
          detailKo: plan.goalKo,
        }),
      );
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
    const status = (needsReview
      ? "needs_review"
      : ready
        ? "ready"
        : "needs_review") as RealityQueueItemStatus;
    const operationId = `trade:${session.handshakeId}`;
    return asQueueItem({
      operationId,
      type: "trade",
      domain: "shopping",
      status,
      contextEventId: null,
      contextLabelKo: null,
      labelKo: label,
      createdBy: "system",
      preview: {
        titleKo: label,
        summaryKo: session.statusHeadlineKo?.trim() || "거래 확정 준비",
        amountLabel: session.priceLine?.trim() || null,
      },
      needApproval: true,
      dependsOnItemIds: [],
      dependencyNoteKo: null,
      undoAllowed: false,
      expiresAtIso: null,
      sourceRef: session.handshakeId,
      engineId: null,
      kind: "trade",
      detailKo: session.statusHeadlineKo?.trim() || null,
      amountLabel: session.priceLine?.trim() || null,
    });
  });
}

function buildFolders(
  items: readonly RealityQueueItemV1[],
): RealityOperationFolderV1[] {
  type Bucket = {
    folderId: string;
    domain: RealityOperationDomain;
    labelKo: string;
    contextEventId: string | null;
    items: RealityQueueItemV1[];
  };
  const byKey = new Map<string, Bucket>();

  for (const item of items) {
    const contextEventId = item.contextEventId?.trim() || null;
    const contextLabel = item.contextLabelKo?.trim() || null;
    const domain = item.domain ?? "other";
    const folderId = contextEventId
      ? `ctx:${contextEventId}`
      : contextLabel
        ? `label:${domain}:${contextLabel}`
        : `domain:${domain}:misc`;
    const existing = byKey.get(folderId);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    byKey.set(folderId, {
      folderId,
      domain,
      labelKo: contextLabel || domainFolderLabelKo(domain),
      contextEventId,
      items: [item],
    });
  }

  const folders = [...byKey.values()].map((bucket) => ({
    folderId: bucket.folderId,
    domain: bucket.domain,
    labelKo: bucket.labelKo,
    domainLabelKo: domainFolderLabelKo(bucket.domain),
    contextEventId: bucket.contextEventId,
    items: bucket.items,
  }));

  folders.sort((left, right) => {
    const domainDelta =
      DOMAIN_ORDER.indexOf(left.domain) - DOMAIN_ORDER.indexOf(right.domain);
    if (domainDelta !== 0) {
      return domainDelta;
    }
    return left.labelKo.localeCompare(right.labelKo, "ko");
  });
  return folders;
}

function buildAgentChips(items: readonly RealityQueueItemV1[]): RealityAgentChipV1[] {
  const byLabel = new Map<string, RealityAgentChipV1>();
  for (const item of items) {
    const label = kindLabelKo(item.kind);
    const agentId = item.kind;
    const status =
      item.status === "running"
        ? "running"
        : item.status === "needs_review" ||
            item.status === "blocked" ||
            item.status === "pending"
          ? "needs_review"
          : "ready";
    const prev = byLabel.get(label);
    if (!prev || status === "running" || (status === "needs_review" && prev.status === "ready")) {
      byLabel.set(label, { agentId, labelKo: label, status });
    }
  }
  if (byLabel.size === 0) {
    return [{ agentId: "idle", labelKo: "대기", status: "idle" }];
  }
  return [...byLabel.values()].slice(0, 6);
}

function resolveRisk(
  items: readonly RealityQueueItemV1[],
): "low" | "medium" | "high" {
  if (items.some((item) => item.status === "blocked")) {
    return "high";
  }
  if (
    items.some(
      (item) => item.status === "needs_review" || item.status === "pending",
    )
  ) {
    return "medium";
  }
  return "low";
}

function sumAmountLabels(items: readonly RealityQueueItemV1[]): string | null {
  const labels = items
    .map((item) => item.amountLabel?.trim() || item.preview?.amountLabel?.trim())
    .filter((value): value is string => Boolean(value));
  if (labels.length === 0) {
    return null;
  }
  if (labels.length === 1) {
    return labels[0]!;
  }
  return labels.slice(0, 3).join(" · ");
}

function dedupeItems(items: readonly RealityQueueItemV1[]): RealityQueueItemV1[] {
  const byId = new Map<string, RealityQueueItemV1>();
  for (const item of items) {
    byId.set(item.itemId, item);
  }
  return [...byId.values()];
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
  const preparedItems = preparedOperationsAsQueueItems();
  const held =
    input.applyHolds === false
      ? new Set<string>()
      : readRealityQueueHeldItemIds();
  const items = dedupeItems([...preparedItems, ...planItems, ...tradeItems]).filter(
    (item) => !held.has(item.itemId),
  );
  const needsReview = items.some(
    (item) =>
      item.status === "needs_review" ||
      item.status === "blocked" ||
      (item.status === "pending" && item.needApproval),
  );
  // Pending Operations still need Reflect — treat as review for batch Commit gate
  // unless status is ready.
  const hasReady = items.some((item) => item.status === "ready");
  const running = items.some((item) => item.status === "running");
  const primaryContextEventId =
    items.find((item) => item.contextEventId)?.contextEventId ?? null;
  const travelCount = items.filter((item) => item.domain === "travel").length;

  // Prepared ops in pending: allow commit when user marked them ready via Reflect,
  // OR when all are pending-only pack — gate opens if every item is ready.
  // For demo pending pack, enable commit when no blocked/running and at least one item
  // (user Accepts whole folder) — pending status alone with needApproval still blocks.
  // Product: Reflect promotes pending → ready. Until then canCommit false for pending-only.
  const canCommit = hasReady && !needsReview && !running && items.length > 0;

  return {
    version: 1,
    titleKo: input.titleKo ?? "Pending Reality",
    subtitleKo:
      input.subtitleKo ??
      (items.length > 0
        ? "AI가 결과물을 준비했어요 · 아직 Reality는 그대로예요"
        : "지구에서 맥락을 만들면 Reality Queue에 쌓여요"),
    agents: buildAgentChips(items),
    items,
    folders: buildFolders(items),
    impact: {
      timeSavedLabel: travelCount > 0 ? `Travel ${travelCount}` : null,
      costLabel: sumAmountLabels(items),
      risk: resolveRisk(items),
      pendingCount: items.length,
    },
    canCommit,
    primaryContextEventId,
  };
}

/** Map engine id → chip label (for tests / UI helpers). */
export function realityAgentLabelFromEngineId(engineId: string | null): string {
  return engineIdToAgentLabel(engineId);
}

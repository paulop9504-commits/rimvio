"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { useFieldSheet } from "@/components/field/field-sheet-provider";
import { requestGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import { requestGlobeComposeSeed } from "@/lib/globe/globe-compose-seed-bridge";
import { requestOsaka30sDemo } from "@/lib/globe/osaka-demo";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import {
  buildRealityCommitReceipt,
  buildRealityControlSnapshot,
  clearRealityCommitReceipt,
  commitRealityQueueClient,
  dispatchRealityCommitPulse,
  readRealityCommitReceipt,
  rejectRealityQueueClient,
  subscribePreparedRealityOperations,
  subscribeRealityCommitReceipt,
  subscribeRealityQueueHold,
  writeRealityCommitReceipt,
  type RealityCommitReceiptV1,
  type RealityQueueItemStatus,
  type RealityQueueItemV1,
} from "@/lib/reality-queue";
import { RealityOperationPreviewCard } from "@/components/field/reality-operation-preview-card";
import { RealityExplorerTree } from "@/components/field/reality-explorer-tree";
import {
  buildRealityExplorer,
  type RealityExplorerSnapshot,
  type RealityPreparePlan,
} from "@/lib/reality-explorer";
import {
  readRealityPipelineSnapshot,
  runRealityIngressPipeline,
  subscribeRealityPipelineStore,
} from "@/lib/reality-pipeline";
import { ensureTripContextEvent } from "@/lib/experience-run/ensure-trip-context-event";
import { EVENT_CANDIDATES_UPDATED, listLifeEventCandidates } from "@/lib/life-read-model";
import { cn } from "@/lib/utils";

export type RealityControlCenterPanelProps = {
  tradeSessions: readonly MarketTradeSessionView[];
  primaryEventId?: string | null;
  onOpenTrades: () => void;
  onOpenMine?: () => void;
  className?: string;
};

function operationEmoji(item: RealityQueueItemV1): string {
  switch (item.kind) {
    case "flight":
      return "✈";
    case "lodging":
      return "🏨";
    case "eatery":
      return "🍣";
    case "transit":
      return "🚆";
    case "rental":
      return "🚗";
    case "finance":
      return "💳";
    case "review":
      return "✓";
    case "calendar":
    case "itinerary":
      return "📅";
    case "trade":
      return "🤝";
    default:
      return "·";
  }
}

function statusDoneLabel(
  status: RealityQueueItemStatus,
  field: ReturnType<typeof useCopy>["globe"]["field"],
): string {
  if (status === "ready") {
    return field.realityResultDone;
  }
  if (status === "running") {
    return field.realityQueueStatusRunning;
  }
  if (status === "blocked") {
    return field.realityQueueStatusBlocked;
  }
  if (status === "pending") {
    return field.realityResultPreparing;
  }
  return field.realityQueueStatusNeedsReview;
}

function prepareChipEmoji(stepId: string): string {
  if (/hotel|lodging|숙소/iu.test(stepId)) {
    return "🏨";
  }
  if (/flight|항공/iu.test(stepId)) {
    return "✈";
  }
  if (/food|eatery|맛집/iu.test(stepId)) {
    return "🍣";
  }
  if (/route|transit|동선|이동/iu.test(stepId)) {
    return "🚆";
  }
  return "✓";
}

function simplifyPrepareLabel(labelKo: string): string {
  if (/호텔|숙소|hotel/iu.test(labelKo)) {
    return "호텔";
  }
  if (/항공|flight/iu.test(labelKo)) {
    return "항공";
  }
  if (/맛집|식사|food|eatery/iu.test(labelKo)) {
    return "맛집";
  }
  if (/동선|이동|route|transit/iu.test(labelKo)) {
    return "동선";
  }
  if (/예약|avail/iu.test(labelKo)) {
    return "예약";
  }
  return labelKo.replace(/\s*후보.*$/u, "").replace(/\s*비교.*$/u, "").slice(0, 6);
}

function PrepareProgressCard({
  projectTitleKo,
  plan,
  field,
}: {
  projectTitleKo: string;
  plan: RealityPreparePlan | null;
  field: ReturnType<typeof useCopy>["globe"]["field"];
}) {
  const steps = (plan?.steps ?? []).slice(0, 4).map((step) => ({
    id: step.id,
    labelKo: simplifyPrepareLabel(step.labelKo),
    done: step.done,
    emoji: prepareChipEmoji(step.id + step.labelKo),
  }));
  const doneCount = steps.filter((s) => s.done).length;
  const total = Math.max(steps.length, 1);
  const pct = Math.round((doneCount / total) * 100);

  return (
    <section
      className="rounded-[1.35rem] bg-white px-4 py-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]"
      data-reality-prepare-progress
      aria-label={field.realityPrepareAria}
    >
      <p className="text-[17px] font-bold tracking-tight text-[#191f28]">
        ✈ {projectTitleKo}
      </p>
      <p className="mt-1 text-[13px] font-medium text-[#8b95a1]">
        {field.realityPrepareBusy}
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef1f4]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full rounded-full bg-[#0071e3]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
      {steps.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1",
                step.done
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200/80"
                  : "bg-[#f5f7fa] text-[#8b95a1] ring-black/[0.06]",
              )}
              data-prepare-chip={step.id}
            >
              <span aria-hidden>{step.emoji}</span>
              <span>{step.labelKo}</span>
              {step.done ? <span aria-hidden>✓</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function OperationResultRow({
  item,
  field,
  index,
  onSelect,
}: {
  item: RealityQueueItemV1;
  field: ReturnType<typeof useCopy>["globe"]["field"];
  index: number;
  onSelect: (item: RealityQueueItemV1) => void;
}) {
  const done = item.status === "ready" || item.status === "pending";
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.24 }}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left active:bg-black/[0.02]"
        data-reality-queue-item={item.itemId}
        data-reality-queue-status={item.status}
      >
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f7fa] text-[18px] ring-1 ring-black/[0.04]"
          aria-hidden
        >
          {operationEmoji(item)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-[#191f28]">
            {item.labelKo}
          </p>
          {item.preview.summaryKo?.trim() ? (
            <p className="mt-0.5 truncate text-[12px] text-[#8b95a1]">
              {item.preview.summaryKo}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 text-[12px] font-semibold",
            done ? "text-emerald-600" : "text-amber-700",
          )}
        >
          {statusDoneLabel(item.status, field)}
        </span>
      </button>
    </motion.li>
  );
}

function CommitReceiptCard({
  receipt,
  field,
  onViewGlobe,
  onDismiss,
}: {
  receipt: RealityCommitReceiptV1;
  field: ReturnType<typeof useCopy>["globe"]["field"];
  onViewGlobe: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.35rem] bg-white px-4 py-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]"
      aria-label={field.realityReceiptAria}
      data-reality-commit-receipt
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
        {field.realityCommitPulseBadge}
      </p>
      <p className="mt-1 text-[18px] font-bold tracking-tight text-[#191f28]">
        {receipt.titleKo}
      </p>
      <ul className="mt-3 space-y-1.5">
        {(receipt.lines.length > 0
          ? receipt.lines
          : [field.realityReceiptEmptyLine]
        ).map((line) => (
          <li key={line} className="text-[13px] text-[#4e5968]">
            · {line}
          </li>
        ))}
      </ul>
      {receipt.disclaimerKo ? (
        <p className="mt-3 text-[12px] text-[#8b95a1]">{receipt.disclaimerKo}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onViewGlobe}
          className="min-h-[46px] rounded-2xl bg-[#191f28] text-[14px] font-semibold text-white active:scale-[0.99]"
        >
          {field.realityReceiptGlobeCta}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[40px] text-[13px] font-medium text-[#8b95a1]"
        >
          {field.realityReceiptDismissCta}
        </button>
      </div>
    </motion.section>
  );
}

/** Field primary lens — 3 questions only: preparing · results · commit. */
export function RealityControlCenterPanel({
  tradeSessions,
  primaryEventId = null,
  onOpenTrades,
  onOpenMine,
  className,
}: RealityControlCenterPanelProps) {
  const copy = useCopy();
  const field = copy.globe.field;
  const router = useRouter();
  const { closeFieldSheet } = useFieldSheet();
  const [revision, setRevision] = useState(0);
  const [pipelineRevision, setPipelineRevision] = useState(0);
  const [committing, setCommitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RealityQueueItemV1 | null>(null);
  const [showAdvancedTree, setShowAdvancedTree] = useState(false);
  const [receipt, setReceipt] = useState<RealityCommitReceiptV1 | null>(() =>
    readRealityCommitReceipt(),
  );
  const [explorer, setExplorer] = useState<RealityExplorerSnapshot | null>(null);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    const unsubHold = subscribeRealityQueueHold(bump);
    const unsubOps = subscribePreparedRealityOperations(bump);
    const unsubPipeline = subscribeRealityPipelineStore(() => {
      setPipelineRevision((value) => value + 1);
    });
    const unsubReceipt = subscribeRealityCommitReceipt(() => {
      setReceipt(readRealityCommitReceipt());
    });
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      unsubHold();
      unsubOps();
      unsubPipeline();
      unsubReceipt();
    };
  }, []);

  const snapshot = useMemo(() => {
    void revision;
    return buildRealityControlSnapshot({
      tradeSessions,
      events: listLifeEventCandidates(),
      primaryEventId,
      titleKo: field.realityControlTitle,
      subtitleKo: field.realityControlSubtitle,
    });
  }, [
    field.realityControlSubtitle,
    field.realityControlTitle,
    primaryEventId,
    revision,
    tradeSessions,
  ]);

  const explorerSnapshot = useMemo(() => {
    void pipelineRevision;
    if (explorer) {
      return explorer;
    }
    const focusEventId =
      primaryEventId?.trim() ||
      snapshot.primaryContextEventId?.trim() ||
      null;
    if (focusEventId) {
      const pip = readRealityPipelineSnapshot(focusEventId);
      if (pip?.explorer) {
        return pip.explorer;
      }
    }
    const projectLabel = snapshot.executionInbox?.projectLabelKo?.trim();
    if (!projectLabel) {
      return null;
    }
    return buildRealityExplorer({
      utterance: `${projectLabel} 여행`,
      destinationLabelKo: projectLabel.replace(/\s*여행$/u, "") || projectLabel,
      executionItems: snapshot.items,
    });
  }, [
    explorer,
    pipelineRevision,
    primaryEventId,
    snapshot.executionInbox?.projectLabelKo,
    snapshot.items,
    snapshot.primaryContextEventId,
  ]);

  const projectTitleKo =
    explorerSnapshot?.projectTitleKo?.trim() ||
    snapshot.executionInbox?.projectLabelKo?.trim() ||
    snapshot.folders[0]?.labelKo?.trim() ||
    field.realityControlTitle;

  const resultItems = useMemo(
    () => snapshot.items.filter((item) => item.kind !== "trade"),
    [snapshot.items],
  );

  const approvalNeededCount = resultItems.filter(
    (item) =>
      item.needApproval &&
      (item.status === "pending" ||
        item.status === "needs_review" ||
        item.status === "ready"),
  ).length;

  const contextCount = Math.max(
    snapshot.folders.filter((f) => f.contextEventId).length,
    new Set(
      resultItems
        .map((item) => item.contextEventId?.trim())
        .filter(Boolean),
    ).size,
    resultItems.length > 0 ? 1 : 0,
  );

  const handleCommit = async () => {
    if (!snapshot.canCommit || committing) {
      toast.message(field.realityCommitBlockedToast);
      return;
    }
    const itemsSnapshot = snapshot.items;
    setCommitting(true);
    try {
      const result = await commitRealityQueueClient({
        items: itemsSnapshot,
        canCommit: snapshot.canCommit,
        promotePendingOnSign: true,
      });
      if (!result.ok) {
        if (result.reason === "blocked") {
          toast.message(field.realityCommitBlockedToast);
        } else if (result.reason === "booking_failed") {
          toast.message(result.reasonKo ?? field.realityCommitFailedToast);
        } else if (result.reason === "persist_failed") {
          toast.message(field.realityCommitFailedToast);
        } else {
          toast.message(field.realityCommitBlockedToast);
        }
        return;
      }
      if (result.tradeOnly) {
        toast.success(field.realityCommitTradeOnlyToast);
        onOpenTrades();
        return;
      }
      const nextReceipt = buildRealityCommitReceipt({
        items: itemsSnapshot,
        approvedPlanCount: result.approvedPlanCount,
        contextEventIds: result.contextEventIds,
        titleKo: field.realityReceiptTitle,
        disclaimerKo: field.realityReceiptDisclaimer,
      });
      writeRealityCommitReceipt(nextReceipt);
      if (nextReceipt.contextEventId) {
        dispatchRealityCommitPulse(nextReceipt.contextEventId);
      }
    } finally {
      setCommitting(false);
    }
  };

  const handleReject = () => {
    if (snapshot.items.length === 0) {
      return;
    }
    rejectRealityQueueClient({ items: snapshot.items });
    toast.message(field.realityRejectToast);
  };

  const handleEdit = () => {
    router.push("/");
  };

  const handleReceiptGlobe = () => {
    const eventId = receipt?.contextEventId?.trim() ?? "";
    closeFieldSheet();
    if (eventId) {
      requestGlobeAskBridgeFocus(eventId, "map");
      dispatchRealityCommitPulse(eventId);
    }
    router.push("/");
  };

  const handleReceiptDismiss = () => {
    clearRealityCommitReceipt();
  };

  const handleExampleChip = (chip: {
    id: string;
    labelKo: string;
    submitKo?: string;
  }) => {
    if (chip.id === "osaka-30s") {
      closeFieldSheet();
      requestOsaka30sDemo({ source: "field_chip" });
      router.push("/");
      return;
    }
    if (chip.id === "shanghai-3d") {
      const message = chip.submitKo ?? "상하이 2박3일 여행 만들어줘";
      const event = ensureTripContextEvent({
        message,
        profile: "leisure_travel",
      });
      const pip = runRealityIngressPipeline({
        contextEventId: event.id,
        utterance: message,
        contextLabelKo: "상하이 여행",
        destinationLabelKo: "상하이",
        seedExecutionInbox: true,
      });
      setExplorer(pip.explorer);
      setRevision((value) => value + 1);
      toast.message(field.realityOperationSeedToast);
      return;
    }
    const text = (chip.submitKo ?? chip.labelKo).trim();
    if (!text) {
      return;
    }
    closeFieldSheet();
    requestGlobeComposeSeed({
      text,
      source: "reality_queue_example",
    });
    router.push("/");
  };

  const empty = snapshot.items.length === 0;
  const commitEnabled =
    !committing &&
    !resultItems.some(
      (item) => item.status === "needs_review" || item.status === "running",
    ) &&
    (snapshot.canCommit ||
      resultItems.some(
        (item) =>
          item.status === "pending" &&
          item.operationId.startsWith("op:") &&
          item.kind !== "trade",
      ));
  const showReceipt = Boolean(receipt);

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-y-auto",
        "bg-[radial-gradient(110%_70%_at_50%_-8%,rgba(0,113,227,0.09),transparent_52%),linear-gradient(180deg,#f7f8fa_0%,#f2f4f6_100%)]",
        className,
      )}
      data-reality-control-center
    >
      <div className="relative space-y-4 px-4 pb-8 pt-3">
        {showReceipt && receipt ? (
          <CommitReceiptCard
            receipt={receipt}
            field={field}
            onViewGlobe={handleReceiptGlobe}
            onDismiss={handleReceiptDismiss}
          />
        ) : null}

        {/* ① Preparing */}
        {!showReceipt && !empty ? (
          <PrepareProgressCard
            projectTitleKo={projectTitleKo}
            plan={explorerSnapshot?.preparePlan ?? null}
            field={field}
          />
        ) : null}

        {/* ② Results */}
        {!showReceipt ? (
          <section aria-label={field.realityResultsAria}>
            {!empty ? (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b95a1]">
                {field.realityResultsEyebrow}
              </p>
            ) : null}

            {empty ? (
              <div className="rounded-[1.35rem] bg-white px-5 py-7 text-center shadow-[0_8px_28px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
                <div
                  className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#e8f1ff,#f5f8fc)] ring-1 ring-[#0071e3]/12"
                  aria-hidden
                >
                  <span className="size-2.5 rounded-full bg-[#0071e3] shadow-[0_0_10px_rgba(0,113,227,0.55)]" />
                </div>
                <p className="text-[16px] font-semibold tracking-tight text-[#191f28]">
                  {field.realityQueueEmptyTitle}
                </p>
                <p className="mt-1.5 text-[13px] leading-snug text-[#8b95a1]">
                  {field.realityQueueEmptyBody}
                </p>
                <p className="mt-2 text-[12px] font-medium text-[#4e5968]">
                  {field.realityQueueEmptyScope}
                </p>
                <div
                  className="mt-4 flex flex-wrap justify-center gap-1.5"
                  aria-label={field.realityQueueEmptyExamplesAria}
                >
                  {field.realityQueueEmptyExampleChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleExampleChip(chip)}
                      className="rounded-full bg-[#f5f7fa] px-3 py-1.5 text-[12px] font-semibold text-[#191f28] ring-1 ring-black/[0.06] active:scale-[0.98]"
                    >
                      {chip.labelKo}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="min-h-[46px] rounded-2xl bg-[#191f28] text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(25,31,40,0.18)] active:scale-[0.99]"
                  >
                    {field.realityQueueEmptyGlobeCta}
                  </button>
                  {tradeSessions.length > 0 ? (
                    <button
                      type="button"
                      onClick={onOpenTrades}
                      className="min-h-[46px] rounded-2xl bg-white text-[14px] font-semibold text-[#0071e3] ring-1 ring-[#0071e3]/20 active:scale-[0.99]"
                    >
                      {field.realityQueueEmptyTradesCta(tradeSessions.length)}
                    </button>
                  ) : null}
                  {onOpenMine ? (
                    <button
                      type="button"
                      onClick={onOpenMine}
                      className="min-h-[40px] text-[13px] font-medium text-[#8b95a1] active:opacity-70"
                    >
                      {field.dashboardTabMine}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
                {selectedItem ? (
                  <div className="border-b border-black/[0.04] p-3">
                    <RealityOperationPreviewCard
                      item={selectedItem}
                      onClose={() => setSelectedItem(null)}
                      onChanged={() => {
                        setRevision((value) => value + 1);
                        setSelectedItem(null);
                      }}
                    />
                  </div>
                ) : null}
                <ul className="divide-y divide-black/[0.04]">
                  {resultItems.map((item, index) => (
                    <OperationResultRow
                      key={item.itemId}
                      item={item}
                      field={field}
                      index={index}
                      onSelect={setSelectedItem}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>
        ) : null}

        {/* Advanced tree — collapsed by default */}
        {!showReceipt && !empty && explorerSnapshot ? (
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedTree((v) => !v)}
              className="text-[12px] font-semibold text-[#8b95a1] underline-offset-2 hover:underline"
              data-reality-advanced-tree-toggle
            >
              {showAdvancedTree
                ? field.realityAdvancedHide
                : field.realityAdvancedShow}
            </button>
            {showAdvancedTree ? (
              <div className="mt-2">
                <RealityExplorerTree
                  snapshot={explorerSnapshot}
                  showPreparePlan={false}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ③ Impact + Commit */}
        {!showReceipt && !empty ? (
          <>
            <section
              className="grid grid-cols-3 gap-2"
              aria-label={field.realityImpactAria}
            >
              <div className="rounded-2xl bg-white px-3 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b95a1]">
                  {field.realityImpactContextLabel}
                </p>
                <p className="mt-1.5 text-[15px] font-bold tabular-nums tracking-tight text-[#191f28]">
                  {contextCount}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8b95a1]">
                  {field.realityImpactContextHint}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b95a1]">
                  {field.realityImpactCostLabel}
                </p>
                <p className="mt-1.5 truncate text-[15px] font-bold tracking-tight text-[#191f28]">
                  {snapshot.impact.costLabel ?? "—"}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8b95a1]">
                  {field.realityImpactCostHint}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b95a1]">
                  {field.realityImpactApprovalLabel}
                </p>
                <p className="mt-1.5 text-[15px] font-bold tabular-nums tracking-tight text-[#191f28]">
                  {approvalNeededCount}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8b95a1]">
                  {field.realityImpactApprovalHint}
                </p>
              </div>
            </section>

            <section className="space-y-2 pt-1" aria-label={field.realityCommitAria}>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="min-h-[46px] rounded-2xl bg-white text-[13px] font-semibold text-[#4e5968] shadow-[0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.06] active:scale-[0.99]"
                >
                  {field.realityEditCta}
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="min-h-[46px] rounded-2xl bg-white text-[13px] font-semibold text-[#8b95a1] shadow-[0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.06] active:scale-[0.99]"
                >
                  {field.realityRejectCta}
                </button>
              </div>
              <motion.button
                type="button"
                disabled={!commitEnabled}
                onClick={() => void handleCommit()}
                whileTap={commitEnabled ? { scale: 0.985 } : undefined}
                className={cn(
                  "relative flex min-h-[52px] w-full items-center justify-center overflow-hidden rounded-2xl text-[15px] font-bold tracking-tight",
                  commitEnabled
                    ? "bg-[#0071e3] text-white shadow-[0_12px_28px_rgba(0,113,227,0.32)]"
                    : "bg-[#e5e8eb] text-[#8b95a1]",
                )}
                data-reality-commit-gate
              >
                {commitEnabled ? (
                  <motion.span
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.28)_45%,transparent_70%)]"
                    animate={{ x: ["-40%", "140%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-[1]">
                  {committing
                    ? field.realityCommitPendingCta
                    : field.realityCommitCta}
                </span>
              </motion.button>
              <p className="text-center text-[11px] text-[#8b95a1]">
                {field.realityCommitHint}
              </p>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

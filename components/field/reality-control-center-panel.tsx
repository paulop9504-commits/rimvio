"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { useFieldSheet } from "@/components/field/field-sheet-provider";
import { requestGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import { requestGlobeComposeSeed } from "@/lib/globe/globe-compose-seed-bridge";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import {
  buildRealityCommitReceipt,
  buildRealityControlSnapshot,
  clearRealityCommitReceipt,
  commitRealityQueueClient,
  dispatchRealityCommitPulse,
  enqueueTravelPrepareOperations,
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
import { ensureTripContextEvent } from "@/lib/experience-run/ensure-trip-context-event";
import { EVENT_CANDIDATES_UPDATED, listLifeEventCandidates } from "@/lib/life-read-model";
import { cn } from "@/lib/utils";

export type RealityControlCenterPanelProps = {
  tradeSessions: readonly MarketTradeSessionView[];
  onOpenTrades: () => void;
  onOpenMine?: () => void;
  className?: string;
};

function statusLabel(
  status: RealityQueueItemStatus,
  field: ReturnType<typeof useCopy>["globe"]["field"],
): string {
  if (status === "ready") {
    return field.realityQueueStatusReady;
  }
  if (status === "running") {
    return field.realityQueueStatusRunning;
  }
  if (status === "blocked") {
    return field.realityQueueStatusBlocked;
  }
  if (status === "pending") {
    return field.realityQueueStatusPending;
  }
  return field.realityQueueStatusNeedsReview;
}

function statusTone(status: RealityQueueItemStatus): {
  pill: string;
  bar: string;
  dot: string;
} {
  if (status === "ready") {
    return {
      pill: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
      bar: "bg-emerald-500",
      dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.45)]",
    };
  }
  if (status === "running") {
    return {
      pill: "bg-sky-50 text-sky-700 ring-sky-200/80",
      bar: "bg-sky-500",
      dot: "bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.4)]",
    };
  }
  if (status === "blocked") {
    return {
      pill: "bg-rose-50 text-rose-700 ring-rose-200/80",
      bar: "bg-rose-500",
      dot: "bg-rose-500",
    };
  }
  return {
    pill: "bg-amber-50 text-amber-800 ring-amber-200/80",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  };
}

function riskLabel(
  risk: "low" | "medium" | "high",
  field: ReturnType<typeof useCopy>["globe"]["field"],
): string {
  if (risk === "high") {
    return field.realityImpactRiskHigh;
  }
  if (risk === "medium") {
    return field.realityImpactRiskMedium;
  }
  return field.realityImpactRiskLow;
}

function riskTone(risk: "low" | "medium" | "high"): string {
  if (risk === "high") {
    return "text-rose-600";
  }
  if (risk === "medium") {
    return "text-amber-600";
  }
  return "text-emerald-600";
}

function QueueRow({
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
  const tone = statusTone(item.status);
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.28, ease: "easeOut" }}
      className="relative"
      data-reality-queue-item={item.itemId}
      data-reality-queue-status={item.status}
      data-reality-operation-type={item.type}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex w-full items-start gap-3 px-3.5 py-3.5 text-left active:bg-black/[0.02]"
      >
        <span
          className={cn("mt-1.5 h-8 w-[3px] shrink-0 rounded-full", tone.bar)}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-[14px] font-semibold tracking-tight text-[#191f28]">
              {item.labelKo}
            </p>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                tone.pill,
              )}
            >
              <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
              {statusLabel(item.status, field)}
            </span>
          </div>
          {item.detailKo || item.contextLabelKo ? (
            <p className="mt-0.5 truncate text-[12px] text-[#8b95a1]">
              {item.detailKo || item.contextLabelKo}
            </p>
          ) : null}
          {item.amountLabel ? (
            <p className="mt-1 text-[12px] font-medium tabular-nums text-[#4e5968]">
              {item.amountLabel}
            </p>
          ) : null}
        </div>
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
  const lines =
    receipt.lines.length > 0 ? receipt.lines : [field.realityReceiptEmptyLine];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="rounded-[1.35rem] bg-white px-5 py-6 shadow-[0_12px_36px_rgba(15,23,42,0.08)] ring-1 ring-emerald-200/70"
      aria-label={field.realityReceiptAria}
      data-reality-commit-receipt
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200/80"
          aria-hidden
        >
          <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.55)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold tracking-tight text-[#191f28]">
            {receipt.titleKo}
          </p>
          <ul className="mt-2 space-y-1.5">
            {lines.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-[13px] leading-snug text-[#4e5968]"
              >
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500"
                  aria-hidden
                />
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
          {receipt.disclaimerKo ? (
            <p className="mt-3 text-[12px] leading-snug text-[#8b95a1]">
              {receipt.disclaimerKo}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onViewGlobe}
          className="min-h-[46px] rounded-2xl bg-[#191f28] text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(25,31,40,0.18)] active:scale-[0.99]"
          data-reality-receipt-globe-cta
        >
          {field.realityReceiptGlobeCta}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[40px] text-[13px] font-medium text-[#8b95a1] active:opacity-70"
        >
          {field.realityReceiptDismissCta}
        </button>
      </div>
    </motion.section>
  );
}

/** Field primary lens — Pending Reality + Commit Gate (Reality Control Center). */
export function RealityControlCenterPanel({
  tradeSessions,
  onOpenTrades,
  onOpenMine,
  className,
}: RealityControlCenterPanelProps) {
  const copy = useCopy();
  const field = copy.globe.field;
  const router = useRouter();
  const { closeFieldSheet } = useFieldSheet();
  const [revision, setRevision] = useState(0);
  const [committing, setCommitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RealityQueueItemV1 | null>(null);
  const [receipt, setReceipt] = useState<RealityCommitReceiptV1 | null>(() =>
    readRealityCommitReceipt(),
  );

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    const unsubHold = subscribeRealityQueueHold(bump);
    const unsubOps = subscribePreparedRealityOperations(bump);
    const unsubReceipt = subscribeRealityCommitReceipt(() => {
      setReceipt(readRealityCommitReceipt());
    });
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      unsubHold();
      unsubOps();
      unsubReceipt();
    };
  }, []);

  const snapshot = useMemo(() => {
    void revision;
    return buildRealityControlSnapshot({
      tradeSessions,
      events: listLifeEventCandidates(),
      titleKo: field.realityControlTitle,
      subtitleKo: field.realityControlSubtitle,
    });
  }, [field.realityControlSubtitle, field.realityControlTitle, revision, tradeSessions]);

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
      });
      if (!result.ok) {
        if (result.reason === "blocked") {
          toast.message(field.realityCommitBlockedToast);
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
    if (chip.id === "shanghai-3d") {
      const event = ensureTripContextEvent({
        message: chip.submitKo ?? "상하이 2박3일 여행 만들어줘",
        profile: "leisure_travel",
      });
      enqueueTravelPrepareOperations({
        contextEventId: event.id,
        contextLabelKo: "상하이 여행",
        destinationLabelKo: "상하이",
      });
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
  const commitEnabled = snapshot.canCommit && !committing;
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

        {!showReceipt && !empty ? (
          <section aria-label={field.realityAgentsAria}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b95a1]">
              {field.realityAgentsEyebrow}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {snapshot.agents.map((agent, index) => (
                <motion.span
                  key={agent.agentId}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03, duration: 0.22 }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
                    agent.status === "ready" &&
                      "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
                    agent.status === "running" &&
                      "bg-sky-50 text-sky-700 ring-sky-200/80",
                    agent.status === "needs_review" &&
                      "bg-amber-50 text-amber-800 ring-amber-200/80",
                    agent.status === "idle" &&
                      "bg-white text-[#8b95a1] ring-black/[0.06]",
                  )}
                  data-reality-agent={agent.agentId}
                >
                  {agent.labelKo}
                  {agent.status === "ready"
                    ? " ✓"
                    : agent.status === "running"
                      ? " …"
                      : agent.status === "needs_review"
                        ? " !"
                        : ""}
                </motion.span>
              ))}
            </div>
          </section>
        ) : null}

        {!showReceipt ? (
          <section aria-label={field.realityQueueAria}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b95a1]">
                {field.realityQueueEyebrow}
              </p>
              {snapshot.impact.pendingCount > 0 ? (
                <span className="text-[11px] font-medium tabular-nums text-[#8b95a1]">
                  {field.realityQueueCount(snapshot.impact.pendingCount)}
                </span>
              ) : null}
            </div>

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
                  data-reality-queue-example-chips
                >
                  {field.realityQueueEmptyExampleChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleExampleChip(chip)}
                      className="rounded-full bg-[#f5f7fa] px-3 py-1.5 text-[12px] font-semibold text-[#191f28] ring-1 ring-black/[0.06] active:scale-[0.98]"
                      data-reality-queue-example={chip.id}
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
              <div className="space-y-3">
                {selectedItem ? (
                  <RealityOperationPreviewCard
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onChanged={() => {
                      setRevision((value) => value + 1);
                      setSelectedItem(null);
                    }}
                  />
                ) : null}
                {(snapshot.folders.length > 0 ? snapshot.folders : [
                  {
                    domain: "other" as const,
                    labelKo: "Pending",
                    items: snapshot.items,
                  },
                ]).map((folder) => (
                  <div
                    key={folder.domain}
                    className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]"
                    data-reality-queue-folder={folder.domain}
                  >
                    <p className="border-b border-[#eef1f4] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b95a1]">
                      {folder.labelKo}
                      {folder.items[0]?.contextLabelKo
                        ? ` · ${folder.items[0].contextLabelKo}`
                        : ""}
                    </p>
                    <ul className="divide-y divide-[#eef1f4]">
                      {folder.items.map((item, index) => (
                        <QueueRow
                          key={item.itemId}
                          item={item}
                          field={field}
                          index={index}
                          onSelect={setSelectedItem}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {!showReceipt && !empty ? (
          <>
            <section
              className="grid grid-cols-3 gap-2"
              aria-label={field.realityImpactAria}
            >
              <div className="rounded-2xl bg-white px-3 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b95a1]">
                  {field.realityImpactEyebrow}
                </p>
                <p className="mt-1.5 text-[15px] font-bold tabular-nums tracking-tight text-[#191f28]">
                  {snapshot.impact.pendingCount}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8b95a1]">
                  {field.realityImpactPendingLabel}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b95a1]">
                  {field.realityImpactRiskLabel}
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-[15px] font-bold tracking-tight",
                    riskTone(snapshot.impact.risk),
                  )}
                >
                  {riskLabel(snapshot.impact.risk, field)}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#8b95a1]">
                  {snapshot.impact.timeSavedLabel ?? "—"}
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
            </section>

            <section className="space-y-2 pt-1" aria-label={field.realityCommitAria}>
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
                  {committing ? field.realityCommitPendingCta : field.realityCommitCta}
                </span>
              </motion.button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  className="min-h-[46px] rounded-2xl bg-white text-[13px] font-semibold text-[#4e5968] shadow-[0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.06] active:scale-[0.99]"
                >
                  {field.realityRejectCta}
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="min-h-[46px] rounded-2xl bg-white text-[13px] font-semibold text-[#0071e3] shadow-[0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-[#0071e3]/18 active:scale-[0.99]"
                >
                  {field.realityEditCta}
                </button>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

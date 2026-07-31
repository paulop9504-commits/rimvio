"use client";

/**
 * Workspace Preview Layer (Peek) — photo gallery · price · review · book flow.
 * Touch → see images → Select → Prepare → Field approve → Hub pay (Article 0).
 */

import { useMemo, useState } from "react";
import { ChevronUp, Pin, X } from "lucide-react";
import {
  applyWorkspaceTransition,
  type ContextWorkspaceNode,
  type ContextWorkspaceState,
} from "@/lib/context-workspace";
import {
  buildNodePreview,
  type NodePreviewModel,
} from "@/lib/context-workspace/build-node-preview";
import { buildNodeContextBrief } from "@/lib/context-workspace/context-brief/build-node-brief";
import {
  findRealityDraftDayForNode,
} from "@/lib/context-workspace/reality-draft/build-reality-draft";
import { resolvePeekPrimaryAction } from "@/lib/context-workspace/set-node-action-ready-state";
import { prepareCopyFromCapabilities } from "@/lib/context-workspace/resolve-workspace-node-capabilities";
import { hasRealityExecutionCapability } from "@/lib/reality-object/capabilities-for-type";
import { copy } from "@/lib/copy/human-ko";
import { offerSoftNextWorkAfterAct } from "@/lib/workstream/offer-soft-next-work-after-act";
import { cn } from "@/lib/utils";

export type WorkspaceNodePeekProps = {
  contextEventId: string;
  node: ContextWorkspaceNode;
  workspace: Pick<
    ContextWorkspaceState,
    "nodes" | "relationshipEdges" | "compareIds" | "selectedIds" | "realityDraft"
  >;
  onClose?: () => void;
  onOpenCompare?: () => void;
  onRecenterItinerary?: (nodeId: string) => void;
  /** Soft prepare — auto-selects if needed; never charges. */
  onPrepareReserve?: () => void;
  /** Prepared → in-Workspace approve · pay. */
  onOpenField?: () => void;
  /** ready → approved (human Confirm). */
  onConfirmReady?: () => void;
  /** Place already prepared and awaiting approve. */
  awaitingField?: boolean;
  className?: string;
};

function Hero({
  preview,
  expanded,
  galleryIndex,
  onGalleryIndex,
}: {
  preview: NodePreviewModel;
  expanded: boolean;
  galleryIndex: number;
  onGalleryIndex: (i: number) => void;
}) {
  const images = preview.galleryImages;
  const active =
    images.length > 0
      ? images[Math.min(galleryIndex, images.length - 1)]!
      : null;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-[#f2f4f6]",
        expanded ? "h-48" : "h-32",
      )}
    >
      {active ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={active}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <span className="text-[28px]">
            {hasRealityExecutionCapability(preview.capabilities, "book_room")
              ? "🏨"
              : hasRealityExecutionCapability(preview.capabilities, "reserve")
                ? "🍜"
                : hasRealityExecutionCapability(preview.capabilities, "buy_ticket")
                  ? "🎫"
                  : "📍"}
          </span>
          <span className="text-[11px] font-semibold text-[#8b95a1]">
            {preview.kindLabelKo} · {copy.globe.workspacePreviewPhotoHint}
          </span>
        </div>
      )}
      {images.length > 1 ? (
        <div className="absolute inset-x-0 bottom-0 flex gap-1 overflow-x-auto px-2 pb-2 pt-8 bg-gradient-to-t from-black/45 to-transparent">
          {images.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              className={cn(
                "h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-2",
                i === galleryIndex
                  ? "ring-white"
                  : "ring-transparent opacity-80",
              )}
              onClick={() => onGalleryIndex(i)}
              aria-label={`사진 ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : preview.imageCountHint > 0 ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
          {copy.globe.workspacePreviewPhotoCount(preview.imageCountHint)}
        </span>
      ) : null}
    </div>
  );
}

function BookFlowSteps({
  selected,
  awaitingField,
  actionReadyState,
}: {
  selected: boolean;
  awaitingField: boolean;
  actionReadyState?: string | null;
}) {
  // Confirm → Prepare → Approve·Pay (Article 0). Photo/Select stay soft.
  const step =
    actionReadyState === "committed"
      ? 4
      : awaitingField
        ? 4
        : actionReadyState === "approved"
          ? 3
          : selected || actionReadyState === "ready"
            ? 2
            : 1;
  const labels = [
    copy.globe.workspaceBookFlowStepPhoto,
    copy.globe.workspaceConfirmNodeCta,
    copy.globe.workspaceBookFlowStepPrepare,
    copy.globe.workspaceBookFlowStepPay,
  ];
  return (
    <ol
      className="mt-2.5 flex items-center gap-0"
      data-workspace-book-flow
      aria-label={copy.globe.workspaceBookFlowLabel}
    >
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold transition-colors",
                  done || current
                    ? "bg-[#3182f6] text-white"
                    : "bg-[#f2f4f6] text-[#8b95a1]",
                )}
              >
                {done ? "✓" : n}
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-[9px] font-medium",
                  current ? "text-[#191f28]" : "text-[#8b95a1]",
                )}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 ? (
              <span
                className={cn(
                  "mb-4 h-px w-2 shrink-0",
                  done ? "bg-[#3182f6]/40" : "bg-[#e5e8eb]",
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function WorkspaceNodePeek({
  contextEventId,
  node,
  workspace,
  onClose,
  onOpenCompare,
  onRecenterItinerary,
  onPrepareReserve,
  onOpenField,
  onConfirmReady,
  awaitingField = false,
  className,
}: WorkspaceNodePeekProps) {
  const [expanded, setExpanded] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const preview = useMemo(
    () => buildNodePreview(node, workspace),
    [node, workspace],
  );
  const nodeBrief = useMemo(() => {
    const poiIndex = workspace.nodes
      .filter((n) => n.visible && (n.kind === "poi" || n.kind === "amenity"))
      .findIndex((n) => n.id === node.id);
    const lodging = workspace.nodes.find(
      (n) => n.visible && n.kind === "lodging",
    );
    return buildNodeContextBrief(node, {
      dayIndex: poiIndex >= 0 ? poiIndex : null,
      anchorTitle: lodging?.title ?? null,
    });
  }, [node, workspace]);
  const draftDay = useMemo(() => {
    const draft = workspace.realityDraft;
    if (!draft) return null;
    return findRealityDraftDayForNode(draft, node.id);
  }, [workspace.realityDraft, node.id]);
  const compareCount = workspace.compareIds.length;

  const addToCompare = () => {
    const nextIds = workspace.compareIds.includes(node.id)
      ? workspace.compareIds
      : [...workspace.compareIds, node.id].slice(0, 5);
    applyWorkspaceTransition({
      contextEventId,
      op: "compare",
      nodeIds: [...nextIds],
    });
    if (nextIds.length >= 2) {
      onOpenCompare?.();
    }
  };

  const confirmSelect = () => {
    applyWorkspaceTransition({
      contextEventId,
      op: "select",
      nodeIds: [node.id],
    });
    const domainCue = hasRealityExecutionCapability(
      preview.capabilities,
      "book_room",
    )
      ? "숙소 선택"
      : hasRealityExecutionCapability(preview.capabilities, "reserve")
        ? "맛집 선택"
        : "선택";
    offerSoftNextWorkAfterAct({
      contextEventId,
      lastAct: "select",
      lastUtterance: domainCue,
      autoRun: true,
      delayMs: 480,
    });
  };

  const prepareCopy = prepareCopyFromCapabilities(preview.capabilities);
  const prepareCta = prepareCopy.ctaKo;
  const prepareHint = prepareCopy.hintKo;

  const primary = resolvePeekPrimaryAction({
    node,
    awaitingPrepare: awaitingField,
    prepareLabelKo: prepareCta,
    prepareHintKo: preview.selected
      ? prepareHint
      : copy.globe.workspacePrepareAutoSelectHint,
    approveLabelKo: copy.globe.workspacePrepareOpenFieldCta,
    approveHintKo: copy.globe.workspacePreparePayFlowHint,
    confirmLabelKo: copy.globe.workspaceConfirmNodeCta,
    confirmHintKo: copy.globe.workspaceConfirmNodeHint,
    doneLabelKo: copy.globe.workspaceNodeDoneCta,
  });

  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-[22px] bg-white/98 shadow-[0_12px_32px_rgba(25,31,40,0.12)]",
        className,
      )}
      data-workspace-node-peek
      data-preview-expanded={expanded ? "true" : "false"}
    >
      <Hero
        preview={preview}
        expanded={expanded}
        galleryIndex={galleryIndex}
        onGalleryIndex={setGalleryIndex}
      />

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {draftDay ? (
                <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[10px] font-semibold text-[#4e5968]">
                  {draftDay.labelKo}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-[#8b95a1]">
                  {copy.globe.workspacePreviewEyebrow}
                </span>
              )}
              {node.actionReadyState === "ready" ||
              node.actionReadyState === "prepare" ||
              node.actionReadyState === "approved" ||
              node.actionReadyState === "committed" ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    node.actionReadyState === "committed"
                      ? "bg-[#e8f8ef] text-[#1aa05a]"
                      : node.actionReadyState === "approved"
                        ? "bg-[#fff4e5] text-[#c27803]"
                        : node.actionReadyState === "ready"
                          ? "bg-[#e8f3ff] text-[#3182f6]"
                          : "bg-[#f2f4f6] text-[#8b95a1]",
                  )}
                  data-action-ready-state={node.actionReadyState}
                >
                  {node.actionReadyState === "committed"
                    ? copy.globe.actionReadyStateCommitted
                    : node.actionReadyState === "approved"
                      ? copy.globe.actionReadyStateApproved
                      : node.actionReadyState === "ready"
                        ? copy.globe.actionReadyStateReady
                        : copy.globe.actionReadyStatePrepare}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 truncate text-[16px] font-semibold tracking-[-0.02em] text-[#191f28]">
              {preview.title}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-[#8b95a1]">
              {preview.ratingLabel}
              <span className="mx-1.5 text-[#d1d6db]">·</span>
              {preview.price}
              <span className="mx-1.5 text-[#d1d6db]">·</span>
              {preview.reviewSummary}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b95a1] transition hover:bg-[#f2f4f6]"
              onClick={() => setExpanded((v) => !v)}
              aria-label={
                expanded
                  ? copy.globe.workspacePreviewCollapse
                  : copy.globe.workspacePreviewRevealDetail
              }
            >
              <ChevronUp
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  expanded ? "rotate-0" : "rotate-180",
                )}
                strokeWidth={2.25}
              />
            </button>
            {onClose ? (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b95a1] transition hover:bg-[#f2f4f6]"
                onClick={onClose}
                aria-label="닫기"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            ) : null}
          </div>
        </div>

        <ul className="mt-3 space-y-1 border-t border-black/[0.04] pt-3">
          {nodeBrief.linesKo.map((line) => (
            <li
              key={line}
              className="flex gap-2 text-[12px] leading-snug text-[#4e5968]"
              data-node-brief-line
            >
              <span
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#d1d6db]"
                aria-hidden
              />
              {line}
            </li>
          ))}
        </ul>

        {preview.canPrepare ? (
          <BookFlowSteps
            selected={preview.selected}
            awaitingField={awaitingField}
            actionReadyState={node.actionReadyState}
          />
        ) : null}

        {preview.amenities.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {preview.amenities.map((a) => (
              <span
                key={a}
                className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[10px] font-semibold text-[#4e5968]"
              >
                {a}
              </span>
            ))}
          </div>
        ) : null}

        {preview.nearby.length > 0 ? (
          <div className="mt-2.5">
            <p className="mb-1 text-[10px] font-semibold text-[#8b95a1]">
              {copy.globe.workspacePreviewNearby}
            </p>
            <div className="flex flex-wrap gap-1">
              {preview.nearby.map((chip) => (
                <span
                  key={chip.labelKo}
                  className="rounded-full bg-[#e8f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#3182f6]"
                >
                  {chip.labelKo}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {expanded ? (
          <div className="mt-3 space-y-2 rounded-xl bg-[#f9fafb] p-2.5">
            <p className="text-[11px] font-semibold text-[#191f28]">
              {copy.globe.workspacePreviewDetailTitle}
            </p>
            <p className="text-[11px] leading-relaxed text-[#4e5968]">
              {prepareCopy.detailKo}
            </p>
            {onRecenterItinerary ? (
              <button
                type="button"
                className="w-full rounded-xl bg-white px-3 py-2 text-left text-[11px] font-semibold text-[#3182f6] ring-1 ring-black/[0.04]"
                onClick={() => onRecenterItinerary(node.id)}
              >
                {copy.globe.workspacePreviewRecenter}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-[11px] font-bold",
              preview.inCompare
                ? "bg-[#e8f3ff] text-[#3182f6]"
                : "bg-[#f2f4f6] text-[#191f28]",
            )}
            onClick={addToCompare}
          >
            {preview.inCompare
              ? copy.globe.workspacePreviewInCompare
              : copy.globe.workspacePreviewAddCompare}
            {compareCount > 0 ? ` (${compareCount})` : ""}
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex flex-1 items-center justify-center rounded-full px-3 py-2 text-[11px] font-bold text-white",
              preview.selected ? "bg-[#191f28]" : "bg-[#3182f6]",
            )}
            onClick={confirmSelect}
            data-workspace-preview-select
          >
            {preview.selected
              ? copy.globe.workspacePreviewSelected
              : copy.globe.workspacePreviewSelect}
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full px-2.5 py-2 text-[11px] font-bold",
              preview.bookmarked
                ? "bg-[#191f28] text-white"
                : "bg-[#f2f4f6] text-[#191f28]",
            )}
            onClick={() => {
              applyWorkspaceTransition({
                contextEventId,
                op: "bookmark",
                nodeIds: [node.id],
                pin: !node.bookmarked,
              });
            }}
            aria-label={
              preview.bookmarked
                ? copy.globe.workspacePinDone
                : copy.globe.workspacePinCta
            }
          >
            <Pin className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {compareCount >= 2 ? (
          <button
            type="button"
            className="mt-2 w-full rounded-xl bg-[#191f28] px-3 py-2 text-[11px] font-bold text-white"
            onClick={onOpenCompare}
            data-workspace-open-compare
          >
            {copy.globe.workspacePreviewOpenCompare(compareCount)}
          </button>
        ) : null}

        {preview.canPrepare && primary.kind !== "done" ? (
          <button
            type="button"
            className="mt-2 w-full rounded-[14px] bg-[#3182f6] px-3 py-2.5 text-[13px] font-semibold tracking-tight text-white shadow-[0_6px_16px_rgba(49,130,246,0.28)] transition active:scale-[0.99]"
            onClick={() => {
              if (primary.kind === "confirm") onConfirmReady?.();
              else if (primary.kind === "approve_pay") onOpenField?.();
              else onPrepareReserve?.();
            }}
            data-workspace-primary-action={primary.kind}
            title={primary.hintKo || undefined}
          >
            {primary.labelKo}
            {primary.hintKo ? (
              <span className="mt-0.5 block text-[10px] font-medium opacity-90">
                {primary.hintKo}
              </span>
            ) : null}
          </button>
        ) : primary.kind === "done" ? (
          <p className="mt-2 rounded-[14px] bg-[#e8f8ef] px-3 py-2.5 text-center text-[12px] font-semibold text-[#1aa05a]">
            {primary.labelKo}
          </p>
        ) : null}
      </div>
    </div>
  );
}

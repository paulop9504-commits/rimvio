"use client";

/**
 * Workspace Preview Layer (Peek) — photo · price · review · nearby · soft actions.
 * First tap opens Preview; Prepare/Commit stay behind explicit Select.
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
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceNodePeekProps = {
  contextEventId: string;
  node: ContextWorkspaceNode;
  workspace: Pick<
    ContextWorkspaceState,
    "nodes" | "relationshipEdges" | "compareIds" | "selectedIds"
  >;
  onClose?: () => void;
  onOpenCompare?: () => void;
  onRecenterItinerary?: (nodeId: string) => void;
  className?: string;
};

function Hero({ preview, expanded }: { preview: NodePreviewModel; expanded: boolean }) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-[#f2f4f6]",
        expanded ? "h-40" : "h-28",
      )}
    >
      {preview.heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.heroImage}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <span className="text-[28px]">
            {preview.kind === "lodging"
              ? "🏨"
              : preview.kind === "eatery"
                ? "🍜"
                : "📍"}
          </span>
          <span className="text-[11px] font-semibold text-[#8b95a1]">
            {preview.kindLabelKo} · {copy.globe.workspacePreviewPhotoHint}
          </span>
        </div>
      )}
      {preview.imageCountHint > 0 ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
          {copy.globe.workspacePreviewPhotoCount(preview.imageCountHint)}
        </span>
      ) : null}
    </div>
  );
}

export function WorkspaceNodePeek({
  contextEventId,
  node,
  workspace,
  onClose,
  onOpenCompare,
  onRecenterItinerary,
  className,
}: WorkspaceNodePeekProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = useMemo(
    () => buildNodePreview(node, workspace),
    [node, workspace],
  );
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
  };

  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-[18px] bg-white/98 shadow-[0_10px_28px_rgba(25,31,40,0.14)] ring-1 ring-black/[0.04]",
        className,
      )}
      data-workspace-node-peek
      data-preview-expanded={expanded ? "true" : "false"}
    >
      <Hero preview={preview} expanded={expanded} />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95a1]">
              {copy.globe.workspacePreviewEyebrow}
            </p>
            <p className="mt-0.5 truncate text-[15px] font-bold tracking-tight text-[#191f28]">
              {preview.title}
            </p>
            <p className="mt-0.5 text-[12px] text-[#4e5968]">
              {preview.ratingLabel}
              <span className="mx-1 text-[#d1d6db]">·</span>
              {preview.price}
              <span className="mx-1 text-[#d1d6db]">·</span>
              {preview.reviewSummary}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#8b95a1] hover:bg-[#f2f4f6]"
              onClick={() => setExpanded((v) => !v)}
              aria-label={
                expanded
                  ? copy.globe.workspacePreviewCollapse
                  : copy.globe.workspacePreviewRevealDetail
              }
            >
              <ChevronUp
                className={cn(
                  "h-4 w-4 transition-transform",
                  expanded ? "rotate-0" : "rotate-180",
                )}
                strokeWidth={2.5}
              />
            </button>
            {onClose ? (
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#8b95a1] hover:bg-[#f2f4f6]"
                onClick={onClose}
                aria-label="닫기"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-[#4e5968]">
          {preview.whyChosen}
        </p>

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
              {preview.kind === "lodging"
                ? copy.globe.workspacePreviewLodgingDetail
                : preview.kind === "eatery"
                  ? copy.globe.workspacePreviewEateryDetail
                  : copy.globe.workspacePreviewGenericDetail}
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
      </div>
    </div>
  );
}

"use client";

/**
 * Workspace Compare sheet — 2~5 candidates side-by-side after Preview.
 */

import { useMemo } from "react";
import { X } from "lucide-react";
import {
  applyWorkspaceTransition,
  type ContextWorkspaceState,
} from "@/lib/context-workspace";
import { buildNodePreviewsForCompare } from "@/lib/context-workspace/build-node-preview";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceCompareSheetProps = {
  open: boolean;
  contextEventId: string;
  workspace: ContextWorkspaceState;
  onClose: () => void;
  onSelect: (nodeId: string) => void;
};

export function WorkspaceCompareSheet({
  open,
  contextEventId,
  workspace,
  onClose,
  onSelect,
}: WorkspaceCompareSheetProps) {
  const previews = useMemo(
    () => buildNodePreviewsForCompare(workspace),
    [workspace],
  );

  if (!open || previews.length < 2) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-[5] flex max-h-[72%] flex-col rounded-t-[22px] bg-white shadow-[0_-12px_40px_rgba(25,31,40,0.18)]"
      role="dialog"
      aria-label={copy.globe.workspaceCompareTitle}
      data-workspace-compare-sheet
    >
      <div className="flex items-center justify-between border-b border-black/[0.04] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95a1]">
            {copy.globe.workspaceCompareEyebrow}
          </p>
          <p className="text-[14px] font-bold text-[#191f28]">
            {copy.globe.workspaceCompareTitleCount(previews.length)}
          </p>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f4f6] text-[#8b95a1]"
          onClick={onClose}
          aria-label="닫기"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-3 py-3">
        {previews.map((p) => (
          <div
            key={p.nodeId}
            className={cn(
              "w-[min(46vw,180px)] shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/[0.05]",
              p.selected ? "ring-2 ring-[#3182f6]" : "bg-white",
            )}
          >
            <div className="relative h-24 bg-[#f2f4f6]">
              {p.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.heroImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[22px]">
                  {p.kind === "lodging" ? "🏨" : p.kind === "eatery" ? "🍜" : "📍"}
                </div>
              )}
            </div>
            <div className="space-y-1.5 p-2.5">
              <p className="truncate text-[12px] font-bold text-[#191f28]">
                {p.title}
              </p>
              <p className="text-[10px] text-[#4e5968]">
                {p.ratingLabel} · {p.price}
              </p>
              <p className="line-clamp-2 text-[10px] leading-snug text-[#8b95a1]">
                {p.whyChosen}
              </p>
              {p.nearby[0] ? (
                <p className="truncate text-[10px] font-medium text-[#3182f6]">
                  {p.nearby[0].labelKo}
                </p>
              ) : null}
              <button
                type="button"
                className={cn(
                  "mt-1 w-full rounded-full py-1.5 text-[11px] font-bold text-white",
                  p.selected ? "bg-[#191f28]" : "bg-[#3182f6]",
                )}
                onClick={() => {
                  applyWorkspaceTransition({
                    contextEventId,
                    op: "select",
                    nodeIds: [p.nodeId],
                  });
                  onSelect(p.nodeId);
                  onClose();
                }}
              >
                {p.selected
                  ? copy.globe.workspacePreviewSelected
                  : copy.globe.workspacePreviewSelect}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

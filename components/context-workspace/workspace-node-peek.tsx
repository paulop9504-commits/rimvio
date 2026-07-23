"use client";

/**
 * Compact Workspace node peek — photo + why (no big place card).
 */

import { Pin, X } from "lucide-react";
import {
  applyWorkspaceTransition,
  domainLabelKo,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceNodePeekProps = {
  contextEventId: string;
  node: ContextWorkspaceNode;
  onClose?: () => void;
  className?: string;
};

function isPhotoSpot(node: ContextWorkspaceNode): boolean {
  return (
    node.tags.includes("photo_spot") ||
    /포토|사진|photo|전망|야경/i.test(`${node.title} ${node.summaryKo}`)
  );
}

export function WorkspaceNodePeek({
  contextEventId,
  node,
  onClose,
  className,
}: WorkspaceNodePeekProps) {
  const photo = isPhotoSpot(node);
  const why =
    node.summaryKo.trim() ||
    (photo
      ? "사진 찍기 좋은 명소로 잡힌 곳이에요"
      : `${domainLabelKo(node.kind)} 후보`);

  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-[16px] bg-white/96 shadow-[0_8px_24px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]",
        className,
      )}
      data-workspace-node-peek
    >
      <div className="flex gap-2.5 p-2.5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f2f4f6]">
          {node.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={node.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-center">
              <span className="text-[16px]">{photo ? "📸" : "📍"}</span>
              <span className="text-[9px] font-bold text-[#8b95a1]">
                {photo ? "포토" : domainLabelKo(node.kind)}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              {photo ? (
                <span className="mb-0.5 inline-flex rounded-full bg-[#e8f3ff] px-1.5 py-0.5 text-[9px] font-bold text-[#3182f6]">
                  포토스팟
                </span>
              ) : null}
              <p className="truncate text-[12px] font-bold tracking-tight text-[#191f28]">
                {node.title}
              </p>
            </div>
            {onClose ? (
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8b95a1] hover:bg-[#f2f4f6]"
                onClick={onClose}
                aria-label="닫기"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#4e5968]">
            {why}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold",
                node.bookmarked
                  ? "bg-[#191f28] text-white"
                  : "bg-[#3182f6] text-white",
              )}
              onClick={() => {
                applyWorkspaceTransition({
                  contextEventId,
                  op: "bookmark",
                  nodeIds: [node.id],
                  pin: !node.bookmarked,
                });
              }}
            >
              <Pin className="h-3 w-3" strokeWidth={2.5} />
              {node.bookmarked
                ? copy.globe.workspacePinDone
                : copy.globe.workspacePinCta}
            </button>
            {node.rating != null ? (
              <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[9px] font-semibold text-[#8b95a1]">
                ★ {node.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

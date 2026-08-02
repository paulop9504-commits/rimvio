"use client";

/**
 * Draft Change Preview — Apply / Cancel before Workspace State mutates.
 * Globe Reality stays Read Only.
 */

import { useEffect, useState } from "react";
import {
  applyDraftMutation,
  listProposedDrafts,
  rejectDraftMutation,
  subscribeWorkspaceDraftEvents,
  type DraftMutation,
} from "@/lib/workspace-command";
import { cn } from "@/lib/utils";

export function WorkspaceDraftPreviewCard({
  workspaceId,
  className,
  onApplied,
  onCancelled,
}: {
  workspaceId: string;
  className?: string;
  onApplied?: (draft: DraftMutation) => void;
  onCancelled?: (draft: DraftMutation) => void;
}) {
  const [draft, setDraft] = useState<DraftMutation | null>(null);

  useEffect(() => {
    const id = workspaceId.trim();
    if (!id) return;
    const sync = () => {
      const proposed = listProposedDrafts(id);
      setDraft(proposed[proposed.length - 1] ?? null);
    };
    sync();
    return subscribeWorkspaceDraftEvents((detail) => {
      if (detail.workspaceId === id) sync();
    });
  }, [workspaceId]);

  if (!draft) return null;

  const beforeType = String(draft.realityDiff.before.hotelType ?? "all");
  const afterType = String(draft.realityDiff.after.hotelType ?? beforeType);
  const afterCount = draft.impact.afterVisibleCount;
  const reduced =
    draft.impact.beforeVisibleCount - draft.impact.afterVisibleCount;

  return (
    <div
      className={cn(
        "rounded-[16px] bg-white px-3 py-3 shadow-[0_8px_24px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]",
        className,
      )}
      data-workspace-draft-preview
      data-draft-id={draft.id}
    >
      <p className="text-[10px] font-semibold tracking-[0.04em] text-[#8b95a1]">
        Preview Change · Draft
      </p>
      <p className="mt-1 text-[12px] font-semibold text-[#191f28]">
        현재: {beforeType === "all" ? "호텔 전체" : beforeType}
      </p>
      <p className="text-[12px] text-[#4e5968]">
        변경 예정:{" "}
        {afterType === "capsule" ? "캡슐호텔" : afterType} {afterCount}개
      </p>
      {reduced > 0 ? (
        <p className="mt-0.5 text-[11px] text-[#8b95a1]">
          영향: 후보 감소 {reduced}개 · {draft.impact.summaryKo}
        </p>
      ) : (
        <p className="mt-0.5 text-[11px] text-[#8b95a1]">
          {draft.impact.summaryKo}
        </p>
      )}
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-full bg-[#191f28] px-3 py-2 text-[12px] font-semibold text-white"
          onClick={() => {
            const result = applyDraftMutation(draft.id);
            if (result.ok) onApplied?.(result.draft);
          }}
        >
          적용
        </button>
        <button
          type="button"
          className="flex-1 rounded-full bg-[#f2f4f6] px-3 py-2 text-[12px] font-semibold text-[#4e5968]"
          onClick={() => {
            const result = rejectDraftMutation(draft.id);
            if (result.ok) onCancelled?.(result.draft);
          }}
        >
          취소
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-[#c4c9d0]">
        Reality 원본은 변경되지 않아요
      </p>
    </div>
  );
}

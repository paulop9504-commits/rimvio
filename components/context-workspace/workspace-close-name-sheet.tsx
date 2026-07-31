"use client";

/**
 * Close Workspace → name Capsule → Confirm = save + Reality Commit to Globe.
 */

import { useEffect, useState } from "react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceCloseNameSheetProps = {
  suggestedTitleKo: string;
  busy?: boolean;
  onConfirm: (titleKo: string) => void;
  onCollapseOnly: (titleKo: string) => void;
  onCancel: () => void;
};

export function WorkspaceCloseNameSheet({
  suggestedTitleKo,
  busy = false,
  onConfirm,
  onCollapseOnly,
  onCancel,
}: WorkspaceCloseNameSheetProps) {
  const [title, setTitle] = useState(suggestedTitleKo);

  useEffect(() => {
    setTitle(suggestedTitleKo);
  }, [suggestedTitleKo]);

  return (
    <div
      className="absolute inset-0 z-[4] flex items-end justify-center bg-black/35 p-4"
      data-workspace-close-name
      role="dialog"
      aria-label={copy.globe.workspaceCloseNameTitle}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/8">
        <div className="border-b border-black/5 px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            {copy.globe.workspaceCloseNameEyebrow}
          </p>
          <h3 className="text-[16px] font-semibold text-foreground">
            {copy.globe.workspaceCloseNameTitle}
          </h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {copy.globe.workspaceCloseNameHint}
          </p>
        </div>
        <div className="px-4 py-3">
          <label className="sr-only" htmlFor="workspace-capsule-name">
            {copy.globe.workspaceCloseNameLabel}
          </label>
          <input
            id="workspace-capsule-name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            className="w-full rounded-2xl bg-[#f2f4f6] px-3.5 py-3 text-[15px] font-semibold text-[#191f28] outline-none ring-1 ring-black/[0.04] focus:ring-[#3182f6]/40"
            placeholder={copy.globe.workspaceCloseNamePlaceholder}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2 px-4 pb-4">
          <button
            type="button"
            disabled={busy || !title.trim()}
            className={cn(
              "w-full rounded-2xl bg-[#191f28] py-3 text-[14px] font-bold text-white",
              "disabled:opacity-40",
            )}
            onClick={() => onConfirm(title.trim())}
          >
            {copy.globe.workspaceCloseNameConfirm}
          </button>
          <button
            type="button"
            disabled={busy}
            className="w-full rounded-2xl bg-[#f2f4f6] py-2.5 text-[13px] font-semibold text-[#4e5968]"
            onClick={() => onCollapseOnly(title.trim())}
          >
            {copy.globe.workspaceCloseNameCollapseOnly}
          </button>
          <button
            type="button"
            disabled={busy}
            className="w-full py-1.5 text-[12px] font-medium text-[#8b95a1]"
            onClick={onCancel}
          >
            {copy.globe.workspaceCloseNameStay}
          </button>
        </div>
      </div>
    </div>
  );
}

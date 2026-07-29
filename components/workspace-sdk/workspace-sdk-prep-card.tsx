"use client";

/**
 * Compact chat card — resources ready, one CTA opens SDK Host.
 */

import { dispatchWorkspaceSdkOpen } from "@/lib/workspace-sdk/workspace-sdk-session-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceSdkPrepCardProps = {
  frame: WorkspaceSdkFrame;
  className?: string;
};

export function WorkspaceSdkPrepCard({
  frame,
  className,
}: WorkspaceSdkPrepCardProps) {
  const contextEventId = frame.contextEventId?.trim() ?? "";

  const open = () => {
    if (!contextEventId) {
      return;
    }
    dispatchWorkspaceSdkOpen(contextEventId);
    dispatchContextWorkspaceExpand({
      contextEventId,
      source: "preview_expand",
    });
  };

  return (
    <div
      className={cn(
        "w-full max-w-[min(100%,360px)] overflow-hidden rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]",
        className,
      )}
      data-workspace-sdk-prep
    >
      <p className="text-[11px] font-medium text-[#8b95a1]">
        {frame.header.eyebrowKo}
      </p>
      <h3 className="mt-1 text-[17px] font-semibold tracking-tight text-[#191f28]">
        {frame.header.titleKo}
      </h3>
      <p className="mt-2 text-[13px] text-[#4e5968]">
        {frame.primaryFocus.headlineKo}
      </p>
      <p className="mt-1 text-[12px] text-[#8b95a1]">{frame.primaryFocus.askKo}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[11px] text-[#6b7684]">
          {frame.node.labelKo}
        </span>
        <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[11px] text-[#6b7684]">
          {frame.action.labelKo}
        </span>
        <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[11px] text-[#6b7684]">
          {frame.commit.labelKo}
        </span>
      </div>
      <button
        type="button"
        className="mt-4 w-full rounded-2xl bg-[#191f28] py-3 text-[14px] font-semibold text-white"
        onClick={open}
        data-workspace-sdk-open-cta
      >
        {copy.globe.workspacePrepOpenCta}
      </button>
    </div>
  );
}

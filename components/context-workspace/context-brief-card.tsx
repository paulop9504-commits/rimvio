"use client";

/**
 * Context Brief — quiet thesis + grounds; map owns reality.
 */

import type { ContextBrief } from "@/lib/context-workspace/context-brief/types";
import { dispatchWorkspaceBriefReplay } from "@/lib/context-workspace/context-brief/brief-replay-bridge";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ContextBriefCardProps = {
  brief: ContextBrief;
  contextEventId: string;
  onFocusNode?: (nodeId: string) => void;
  onReplayStart?: () => void;
  activeGroundIndex?: number | null;
  className?: string;
};

function roleEmoji(kind: ContextBrief["roles"][number]["kind"]): string {
  switch (kind) {
    case "arrival":
      return "✈️";
    case "stay":
      return "🏨";
    case "experience":
      return "🎢";
    case "food":
      return "🍣";
    case "route":
      return "➡️";
    default:
      return "📍";
  }
}

export function ContextBriefCard({
  brief,
  contextEventId,
  onFocusNode,
  onReplayStart,
  activeGroundIndex = null,
  className,
}: ContextBriefCardProps) {
  const onReplay = () => {
    onReplayStart?.();
    dispatchWorkspaceBriefReplay({
      contextEventId,
      nodeIds: brief.nodeIdsInOrder,
    });
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] bg-white/95 shadow-[0_8px_24px_rgba(25,31,40,0.08)]",
        className,
      )}
      data-context-brief-card
    >
      <header className="px-3.5 pb-2 pt-3">
        <p className="text-[11px] font-medium text-[#8b95a1]">
          {copy.globe.contextBriefEyebrow}
        </p>
        <h3 className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em] text-[#191f28]">
          {brief.titleKo}
        </h3>
        <p className="mt-1 text-[12px] font-medium leading-snug text-[#3182f6]">
          {brief.thesisKo}
        </p>
      </header>

      {brief.groundsKo.length > 0 ? (
        <div className="px-3.5 pb-2.5">
          <p className="mb-1.5 text-[10px] font-medium text-[#8b95a1]">
            {copy.globe.contextBriefGroundsLabel}
          </p>
          <ul className="space-y-1.5">
            {brief.groundsKo.map((line, i) => {
              const active =
                activeGroundIndex != null &&
                i ===
                  Math.min(
                    activeGroundIndex,
                    Math.max(0, brief.groundsKo.length - 1),
                  );
              return (
                <li
                  key={line}
                  className={cn(
                    "flex items-start gap-2 text-[12px] leading-snug transition-colors",
                    active ? "font-semibold text-[#191f28]" : "text-[#4e5968]",
                  )}
                  data-brief-ground={i}
                >
                  <span
                    className={cn(
                      "mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold",
                      active
                        ? "bg-[#3182f6] text-white"
                        : "bg-[#f2f4f6] text-[#8b95a1]",
                    )}
                    aria-hidden
                  >
                    ✓
                  </span>
                  {line}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {brief.roles.length > 0 ? (
        <div className="px-3.5 pb-2.5">
          <p className="mb-1.5 text-[10px] font-medium text-[#8b95a1]">
            {copy.globe.contextBriefRolesLabel}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {brief.roles.map((role) => (
              <button
                key={role.nodeId}
                type="button"
                className="min-w-[5.5rem] shrink-0 rounded-[12px] bg-[#f7f8fa] px-2.5 py-2 text-left transition active:scale-[0.98] hover:bg-[#f2f4f6]"
                onClick={() => onFocusNode?.(role.nodeId)}
                data-brief-role={role.kind}
              >
                <span className="block text-[11px] font-semibold text-[#191f28]">
                  {roleEmoji(role.kind)} {role.labelKo}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-[#8b95a1]">
                  {role.placeTitle}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {brief.nodeIdsInOrder.length >= 2 ? (
        <div className="px-3.5 pb-3.5">
          <button
            type="button"
            className="w-full rounded-[14px] bg-[#191f28] px-3 py-2.5 text-[13px] font-semibold tracking-tight text-white shadow-[0_6px_16px_rgba(25,31,40,0.18)] transition active:scale-[0.99]"
            onClick={onReplay}
            data-context-brief-replay
          >
            {copy.globe.contextBriefReplayCta}
          </button>
        </div>
      ) : null}
    </div>
  );
}

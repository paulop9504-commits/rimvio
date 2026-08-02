"use client";

import type { CalloutAction } from "@/lib/callout/types";
import { cn } from "@/lib/utils";

export function CalloutAction({
  actions,
  onAction,
  className,
}: {
  actions: readonly CalloutAction[];
  onAction?: (action: CalloutAction) => void;
  className?: string;
}) {
  if (actions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={!action.enabled}
          className={cn(
            "rounded-full px-3 py-1.5 text-[11px] font-semibold",
            action.enabled
              ? action.kind === "handoff_field" ||
                action.kind === "create_prepare_draft"
                ? "bg-[#3182f6] text-white"
                : "bg-white text-[#191f28] ring-1 ring-black/[0.06]"
              : "cursor-not-allowed bg-[#f2f4f6] text-[#c4c9d0]",
          )}
          onClick={() => {
            if (action.enabled) onAction?.(action);
          }}
        >
          {action.labelKo}
        </button>
      ))}
    </div>
  );
}

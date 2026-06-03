"use client";

import type { DockActionWire } from "@/lib/action-os/types";
import { cn } from "@/lib/utils";

type ActionOsDockStripProps = {
  main_action: DockActionWire;
  shadow_actions: DockActionWire[];
  onAction: (action: DockActionWire) => void;
  className?: string;
};

/** Renders only main_action + shadow_actions — no thought, no raw JSON. */
export function ActionOsDockStrip({
  main_action,
  shadow_actions,
  onAction,
  className,
}: ActionOsDockStripProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <button
        type="button"
        onClick={() => onAction(main_action)}
        className="rounded-full bg-[#4A90E2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3a7bc8]"
      >
        {main_action.label}
      </button>
      {shadow_actions.map((action) => (
        <button
          key={`${action.label}-${action.execution.uri}`}
          type="button"
          onClick={() => onAction(action)}
          className="rounded-full border border-[#4A90E2]/25 bg-rimvio-surface px-3.5 py-2 text-sm font-medium text-[#1a1a1a] shadow-sm transition-colors hover:bg-[#F0F7FF]"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import type { SurfaceAction } from "@/lib/surface-engine/surface-contract";
import { cn } from "@/lib/utils";

export type PrimaryActionButtonProps = {
  action: SurfaceAction;
  onPress: () => void;
  className?: string;
};

/** Exactly one CTA per primary surface MF — no branching. */
export function PrimaryActionButton({
  action,
  onPress,
  className,
}: PrimaryActionButtonProps) {
  return (
    <button
      type="button"
      data-surface-cta="primary"
      data-capability-id={action.capabilityId}
      className={cn(
        "w-full rounded-xl bg-rimvio-ink px-4 py-3 text-[15px] font-medium text-white",
        className,
      )}
      onClick={onPress}
    >
      {action.label}
    </button>
  );
}

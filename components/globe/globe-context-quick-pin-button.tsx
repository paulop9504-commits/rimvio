"use client";

import { Loader2, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

export type GlobeContextQuickPinButtonProps = {
  label: string;
  pinned?: boolean;
  busy?: boolean;
  onClick: () => void;
  className?: string;
};

/** Compact top-area action — turns the current discovery item into a context pin. */
export function GlobeContextQuickPinButton({
  label,
  pinned = false,
  busy = false,
  onClick,
  className,
}: GlobeContextQuickPinButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || pinned}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur-md transition active:scale-[0.98] disabled:cursor-default",
        pinned
          ? "bg-[#0071e3] text-white shadow-[0_8px_20px_rgba(0,113,227,0.25)]"
          : "bg-[#f5f5f7] text-[#1d1d1f] ring-1 ring-black/[0.06]",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <MapPinned className="size-3.5" aria-hidden />
      )}
      <span>{label}</span>
    </button>
  );
}

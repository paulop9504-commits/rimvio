"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type RoomFedAttentionChipProps = {
  className?: string;
};

/** Dev-only: visual for device “best previous” shelf — session-only, not MODEL. */
export function RoomFedAttentionChip({ className }: RoomFedAttentionChipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-violet-400/25"
        aria-expanded={open}
      >
        <Sparkles className="size-2.5" aria-hidden />
        device
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-card p-2 text-[10px] text-muted-foreground shadow-lg">
          Device-attention shim (dev). Not attention policy —{" "}
          <code className="text-[9px]">rimvio-fed</code> placeholder.
        </div>
      ) : null}
    </div>
  );
}

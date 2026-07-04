"use client";

import { ListTodo } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeWorkQueuePeekProps = {
  count: number;
  onOpen: () => void;
  className?: string;
};

/** Collapsed queue chip — Cursor-style pending count. */
export function GlobeWorkQueuePeek({ count, onOpen, className }: GlobeWorkQueuePeekProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-full bg-[#121316]/88 px-3 py-2 text-left shadow-[0_8px_24px_rgba(0,0,0,0.28)] ring-1 ring-white/14 backdrop-blur-md active:scale-[0.98]",
        className,
      )}
      aria-label={copy.globe.workQueue.peekAria(count)}
      data-globe-work-queue-peek
      data-globe-work-queue-count={count}
    >
      <ListTodo className="size-4 shrink-0 text-[#7db3ff]" aria-hidden />
      <span className="text-[12px] font-semibold text-white">
        {copy.globe.workQueue.peekLabel(count)}
      </span>
    </button>
  );
}

"use client";

import { ChevronUp, ImagePlus, MapPin, ShoppingBag, Trash2 } from "lucide-react";
import type { WorkQueueItem } from "@/lib/work-queue";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeWorkQueueSheetProps = {
  items: readonly WorkQueueItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: (item: WorkQueueItem) => void;
  onDismiss: (item: WorkQueueItem) => void;
};

function surfaceLabel(surface: WorkQueueItem["surface"]): string {
  return surface === "outer"
    ? copy.globe.workQueue.surfaceOuter
    : copy.globe.workQueue.surfaceInner;
}

function itemIcon(item: WorkQueueItem) {
  if (item.kind === "portal_compose") {
    return ShoppingBag;
  }
  if (item.kind === "travel_context") {
    return MapPin;
  }
  return ImagePlus;
}

/** Cursor-style incomplete work list — resume to add media and publish. */
export function GlobeWorkQueueSheet({
  items,
  open,
  onOpenChange,
  onResume,
  onDismiss,
}: GlobeWorkQueueSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 max-h-[min(60vh,28rem)] overflow-hidden rounded-[1.25rem] bg-[#f5f5f7] shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-white/30"
      data-globe-work-queue-sheet
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0071e3]">
            {copy.globe.workQueue.eyebrow}
          </p>
          <p className="text-[15px] font-semibold text-[#1d1d1f]">
            {copy.globe.workQueue.title(items.length)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex size-8 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label={copy.globe.workQueue.closeAria}
        >
          <ChevronUp className="size-4 text-[#86868b]" aria-hidden />
        </button>
      </div>

      <ul className="max-h-[calc(min(60vh,28rem)-4.5rem)] space-y-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <li className="px-3 py-6 text-center text-[13px] text-[#86868b]">
            {copy.globe.workQueue.empty}
          </li>
        ) : (
          items.map((item) => {
            const Icon = itemIcon(item);
            return (
              <li key={item.id}>
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-[1rem] bg-white px-3 py-3 shadow-sm ring-1 ring-black/[0.05]",
                  )}
                  data-globe-work-queue-item
                  data-work-queue-surface={item.surface}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#0071e3]/10 text-[#0071e3]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <button
                    type="button"
                    onClick={() => onResume(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#86868b]">
                      {surfaceLabel(item.surface)}
                    </span>
                    <span className="mt-0.5 block truncate text-[14px] font-semibold text-[#1d1d1f]">
                      {item.titleKo}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-[12px] leading-snug text-[#86868b]">
                      {item.subtitleKo}
                    </span>
                    {item.needsMedia ? (
                      <span className="mt-2 inline-flex rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[10px] font-semibold text-[#1a4fad]">
                        {copy.globe.workQueue.needsMedia}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(item)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#86868b] active:bg-black/[0.04]"
                    aria-label={copy.globe.workQueue.dismissAria}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

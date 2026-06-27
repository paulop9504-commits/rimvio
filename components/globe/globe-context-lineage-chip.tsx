"use client";

import Link from "next/link";
import { MapPin, Sparkles, X } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readPinLineageParentEventId } from "@/lib/globe/pin-lineage-metadata";
import { cn } from "@/lib/utils";

export type GlobeContextLineageChipProps = {
  eventId: string;
  className?: string;
  onDismiss?: () => void;
};

/** Tier 2 — one-line parent context when a trace continues from an earlier pin. */
export function GlobeContextLineageChip({
  eventId,
  className,
  onDismiss,
}: GlobeContextLineageChipProps) {
  const event = findLifeEventCandidate(eventId);
  const parentId = event ? readPinLineageParentEventId(event.metadata) : null;
  const parent = parentId ? findLifeEventCandidate(parentId) : null;

  if (!parent) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f2f4f6]/95 px-2.5 py-1",
        "text-[10px] font-semibold text-[#4e5968] ring-1 ring-black/[0.05]",
        className,
      )}
      data-globe-context-lineage-chip
    >
      <Sparkles className="size-3 shrink-0 text-[#3182f6]" aria-hidden />
      <span className="truncate">
        {copy.globe.gatheringTraceLineage} · {parent.title}
      </span>
      <Link
        href={`/?recallEvent=${encodeURIComponent(parent.id)}`}
        className="shrink-0 text-[#3182f6] underline-offset-2 hover:underline"
      >
        {copy.globe.memoryRecallEyebrow}
      </Link>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-0.5 shrink-0 rounded-full p-0.5 text-[#8b95a1] active:bg-black/[0.04]"
          aria-label={copy.portal.closeAria}
        >
          <X className="size-3" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

function familyLabel(family: BrainSurfaceProjectionCandidate["family"]): string {
  switch (family) {
    case "media":
      return "영상";
    case "eatery":
      return "맛집";
    case "lodging":
      return "숙소";
    case "trace_place":
      return "장소";
    case "info":
      return "정보";
    case "event":
      return "행사";
    case "memo":
    default:
      return "메모";
  }
}

export type GlobeBrainSurfaceConnectSheetProps = {
  anchor: BrainSurfaceProjectionCandidate;
  related: readonly BrainSurfaceProjectionCandidate[];
  activeRelatedId?: string | null;
  onSelectRelated: (candidateId: string) => void;
  onExpandMap?: (() => void) | null;
  inferredPlaceCount?: number;
  onOpenDetail?: (() => void) | null;
  onClose: () => void;
  className?: string;
};

export function GlobeBrainSurfaceConnectSheet({
  anchor,
  related,
  activeRelatedId,
  onSelectRelated,
  onExpandMap = null,
  inferredPlaceCount,
  onOpenDetail = null,
  onClose,
  className,
}: GlobeBrainSurfaceConnectSheetProps) {
  const chips = related.filter((row) => row.id !== anchor.id);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 z-[31] flex justify-center px-3",
        className,
      )}
      style={{
        bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.5rem)",
      }}
      data-globe-brain-surface-connect-sheet
    >
      <div className="w-full max-w-[22rem] overflow-hidden rounded-[1.25rem] border border-white/80 bg-white/96 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-2xl ring-1 ring-black/[0.04]">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {copy.globe.brainSurfaceConnectTitle}
            </p>
            <p className="line-clamp-1 text-[13px] font-semibold text-slate-900">
              {anchor.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-600 active:scale-[0.97]"
            aria-label={copy.globe.brainSurfaceStoryCloseAria}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {chips.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((row) => {
              const thumb = row.markerThumbnailUrl?.trim();
              const active = row.id === activeRelatedId;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onSelectRelated(row.id)}
                  className={cn(
                    "flex w-[4.5rem] shrink-0 flex-col overflow-hidden rounded-[0.85rem] border text-left active:scale-[0.98]",
                    active
                      ? "border-[#0071e3]/40 ring-2 ring-[#0071e3]/25"
                      : "border-slate-200/80",
                  )}
                  data-globe-brain-surface-connect-chip={row.id}
                >
                  <div className="relative aspect-square w-full bg-slate-100">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-500">
                        {familyLabel(row.family)}
                      </div>
                    )}
                  </div>
                  <p className="line-clamp-2 px-1.5 py-1 text-[9px] font-semibold leading-tight text-slate-800">
                    {row.label}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-3 py-3 text-[12px] leading-relaxed text-slate-500">
            {copy.globe.brainSurfaceConnectTitle}
          </p>
        )}

        <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
          {onExpandMap ? (
            <GlobeMediaGuideMapExpandButton
              variant="bar"
              label={copy.globe.contextGuideExpandMap}
              candidateCount={inferredPlaceCount}
              onClick={onExpandMap}
            />
          ) : null}
          {onOpenDetail ? (
            <button
              type="button"
              onClick={onOpenDetail}
              className="flex w-full items-center justify-center rounded-[0.85rem] bg-slate-100 px-3 py-2.5 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200/80 active:scale-[0.98]"
            >
              {copy.globe.contextGuideDisclosureDetail}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

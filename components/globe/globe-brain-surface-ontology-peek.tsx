"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { GlobeBrainSurfaceYoutubeEmbed } from "@/components/globe/globe-brain-surface-youtube-embed";
import { buildBrainSurfaceEmbedSrc } from "@/components/globe/globe-brain-surface-video-chip";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";
import { layoutBrainSurfaceOntologyPeek } from "@/lib/globe/layout-brain-surface-ontology-peek";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
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

function familyAccent(family: BrainSurfaceProjectionCandidate["family"]): string {
  switch (family) {
    case "eatery":
      return "bg-orange-500";
    case "lodging":
      return "bg-emerald-500";
    case "media":
      return "bg-violet-500";
    case "trace_place":
      return "bg-sky-500";
    default:
      return "bg-slate-400";
  }
}

export type GlobeBrainSurfaceOntologyPeekProps = {
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

export function GlobeBrainSurfaceOntologyPeek({
  anchor,
  related,
  activeRelatedId,
  onSelectRelated,
  onExpandMap = null,
  inferredPlaceCount,
  onOpenDetail = null,
  onClose,
  className,
}: GlobeBrainSurfaceOntologyPeekProps) {
  const [playing, setPlaying] = useState(false);
  const embedSrc = buildBrainSurfaceEmbedSrc(anchor.embedUrl);
  const embedKey =
    (anchor.embedUrl ? extractYouTubeVideoId(anchor.embedUrl) : null) ?? anchor.id;
  const thumb = anchor.markerThumbnailUrl?.trim();
  const hasVideo = Boolean(embedSrc);

  const satellites = useMemo(
    () => related.filter((row) => row.id !== anchor.id).slice(0, 8),
    [anchor.id, related],
  );

  const layout = useMemo(
    () =>
      layoutBrainSurfaceOntologyPeek({
        satellites,
        width: 300,
        mediaHeight: hasVideo || thumb ? 112 : 84,
      }),
    [hasVideo, satellites, thumb],
  );

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 z-[31] flex justify-center px-2",
        className,
      )}
      style={{
        bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.4rem)",
      }}
      data-globe-brain-surface-ontology-peek
    >
      <div className="w-full max-w-[18.75rem] overflow-hidden rounded-[1.2rem] border border-white/88 bg-white/98 shadow-[0_14px_36px_rgba(15,23,42,0.14)] backdrop-blur-2xl ring-1 ring-black/[0.04]">
        <div className="relative bg-slate-50/80" style={{ height: layout.height }}>
          <div
            className="absolute inset-x-0 top-0 overflow-hidden rounded-t-[1.2rem] bg-slate-950"
            style={{ height: layout.mediaHeight }}
          >
            {playing && embedSrc ? (
              <GlobeBrainSurfaceYoutubeEmbed
                videoKey={embedKey}
                embedSrc={embedSrc}
                title={anchor.previewTitle}
                className="h-full w-full border-0 object-cover"
              />
            ) : thumb ? (
              <button
                type="button"
                onClick={() => hasVideo && setPlaying(true)}
                className={cn(
                  "relative block h-full w-full overflow-hidden",
                  hasVideo && "cursor-pointer active:opacity-95",
                )}
                aria-label={anchor.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="" className="h-full w-full object-cover" />
                {hasVideo ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/18">
                    <span className="flex size-9 items-center justify-center rounded-full bg-black/48 text-sm text-white">
                      ▶
                    </span>
                  </span>
                ) : null}
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 px-4 text-center text-[13px] font-semibold text-white/88">
                {anchor.label}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2 top-2 z-[2] flex size-7 items-center justify-center rounded-full bg-black/42 text-white backdrop-blur-md active:scale-95"
              aria-label={copy.globe.brainSurfaceStoryCloseAria}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>

          {satellites.length > 0 ? (
            <>
              <svg
                className="pointer-events-none absolute inset-0 z-[1] overflow-visible"
                width={layout.width}
                height={layout.height}
                aria-hidden
                data-globe-brain-surface-ontology-links
              >
                {layout.nodes.map((node) => {
                  const row = satellites.find((item) => item.id === node.candidateId);
                  const active = node.candidateId === activeRelatedId;
                  const virtual = row?.virtualCandidate === true;
                  const inferred = row?.anchorKind === "inferred_place";
                  return (
                    <line
                      key={`stem:${node.candidateId}`}
                      x1={layout.rootStem.x}
                      y1={layout.rootStem.y}
                      x2={node.centerX}
                      y2={node.centerY - node.height / 2 + 6}
                      stroke={
                        active
                          ? "rgba(0,113,227,0.78)"
                          : virtual
                            ? "rgba(148,163,184,0.42)"
                            : "rgba(100,116,139,0.36)"
                      }
                      strokeWidth={active ? 2 : 1.25}
                      strokeDasharray={inferred || virtual ? "4 3" : undefined}
                    />
                  );
                })}
              </svg>

              {layout.nodes.map((node) => {
                const row = satellites.find((candidate) => candidate.id === node.candidateId);
                if (!row) {
                  return null;
                }
                const active = row.id === activeRelatedId;
                const nodeThumb = row.markerThumbnailUrl?.trim();
                const compact = !nodeThumb || row.virtualCandidate;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onSelectRelated(row.id)}
                    className={cn(
                      "pointer-events-auto absolute z-[2] flex flex-col overflow-hidden text-left active:scale-[0.98]",
                      compact
                        ? "items-center justify-center rounded-[0.9rem] border bg-white px-1.5 py-1.5 shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                        : "rounded-[0.85rem] border bg-white shadow-[0_4px_14px_rgba(15,23,42,0.1)]",
                      active
                        ? "border-[#0071e3]/50 ring-2 ring-[#0071e3]/20"
                        : "border-slate-200/85",
                    )}
                    style={{
                      left: node.centerX - node.width / 2,
                      top: node.centerY - node.height / 2,
                      width: node.width,
                      height: node.height,
                    }}
                    data-globe-brain-surface-ontology-node={row.id}
                  >
                    {compact ? (
                      <>
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            familyAccent(row.family),
                          )}
                        />
                        <p className="mt-1 line-clamp-2 w-full text-center text-[9px] font-semibold leading-tight text-slate-800">
                          {row.label}
                        </p>
                        <p className="mt-0.5 text-[8px] font-medium text-slate-500">
                          {familyLabel(row.family)}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="relative h-[2.15rem] w-full shrink-0 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={nodeThumb}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <p className="line-clamp-2 flex-1 px-1.5 py-1 text-[9px] font-semibold leading-tight text-slate-800">
                          {row.label}
                        </p>
                      </>
                    )}
                  </button>
                );
              })}
            </>
          ) : null}
        </div>

        <div className="border-t border-slate-200/70 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {anchor.placeLabel}
          </p>
          <p className="line-clamp-1 text-[13px] font-semibold leading-snug text-slate-900">
            {anchor.label}
          </p>
        </div>

        {(onExpandMap || onOpenDetail) && (
          <div className="flex flex-col gap-1.5 border-t border-slate-200/60 px-2.5 pb-2.5 pt-2">
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
                className="flex w-full items-center justify-center rounded-[0.85rem] bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200/80 active:scale-[0.98]"
              >
                {copy.globe.contextGuideDisclosureDetail}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

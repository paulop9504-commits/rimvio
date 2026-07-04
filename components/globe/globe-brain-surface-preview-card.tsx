"use client";

import { ExternalLink, MapPinned, X } from "lucide-react";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import { formatSpatialTraceLine } from "@/lib/situation-projection/build-media-spatial-trace";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

function withAutoplay(embedUrl: string | null): string | null {
  if (!embedUrl) {
    return null;
  }
  try {
    const url = new URL(embedUrl);
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("mute", "0");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("rel", "0");
    return url.toString();
  } catch {
    return embedUrl;
  }
}

export type GlobeBrainSurfacePreviewCardProps = {
  candidate: BrainSurfaceProjectionCandidate;
  detailMode?: boolean;
  onClose: () => void;
  onPromoteDetail: () => void;
  onOpenPrimary: () => void;
  onOpenMap?: (() => void) | null;
  onExpandInferredMap?: (() => void) | null;
  inferredPlaceCount?: number;
  onCommitMemo?: (() => void) | null;
  committingMemo?: boolean;
};

export function GlobeBrainSurfacePreviewCard({
  candidate,
  detailMode = false,
  onClose,
  onPromoteDetail,
  onOpenPrimary,
  onOpenMap,
  onExpandInferredMap = null,
  inferredPlaceCount,
  onCommitMemo,
  committingMemo = false,
}: GlobeBrainSurfacePreviewCardProps) {
  const embedUrl = withAutoplay(candidate.embedUrl);
  const primaryLabel =
    candidate.primaryActionLabelKo ??
    (candidate.family === "memo"
      ? "연결 열기"
      : candidate.family === "event"
        ? "행사 보기"
        : candidate.family === "info"
          ? "가이드 열기"
          : "상세 열기");
  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-1/2 z-[23] w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-[1.35rem] border border-white/14 bg-[#09111d]/92 text-white shadow-[0_22px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl",
        detailMode ? "bottom-[max(6.4rem,calc(env(safe-area-inset-bottom)+5.25rem))]" : "bottom-[max(7rem,calc(env(safe-area-inset-bottom)+5.75rem))]",
      )}
      data-globe-brain-surface-preview
      data-detail-mode={detailMode ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/56">
              {candidate.placeLabel}
            </p>
            {candidate.sourceLabelKo ? (
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/72 ring-1 ring-white/10">
                {candidate.sourceLabelKo}
              </span>
            ) : null}
            {candidate.validityLabelKo ? (
              <span className="rounded-full bg-[#ffd89b]/14 px-2 py-0.5 text-[10px] font-medium text-[#ffd89b] ring-1 ring-[#ffd89b]/18">
                {candidate.validityLabelKo}
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug">
            {candidate.previewTitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-1.5 text-white/72 active:scale-[0.97]"
          aria-label="닫기"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {embedUrl ? (
        <div className="px-4 pb-3">
          <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-black/50">
            <iframe
              src={embedUrl}
              title={candidate.previewTitle}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full border-0"
            />
          </div>
        </div>
      ) : candidate.markerThumbnailUrl ? (
        <div className="px-4 pb-3">
          <div className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-black/40">
            <img
              src={candidate.markerThumbnailUrl}
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
            {candidate.markerMediaKind === "video" ? (
              <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white ring-1 ring-white/20">
                ▶ 영상
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {candidate.previewBody ? (
        <p
          className={cn(
            "px-4 text-[12px] leading-relaxed text-white/74",
            detailMode ? "pb-3" : "pb-2",
          )}
        >
          {candidate.previewBody}
        </p>
      ) : null}

      {detailMode &&
      candidate.spatialTraceItems &&
      candidate.spatialTraceItems.length > 0 ? (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/52">
            {copy.globe.spatialTraceTitle}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/58">
            {copy.globe.spatialTraceDisclaimer}
          </p>
          <ul className="mt-2 space-y-1.5">
            {candidate.spatialTraceItems.map((item) => (
              <li
                key={item.id}
                className="rounded-xl bg-white/6 px-3 py-2 text-[12px] leading-snug text-white/84 ring-1 ring-white/8"
              >
                {formatSpatialTraceLine(item)}
                {item.detailKo ? (
                  <p className="mt-1 text-[11px] text-white/58">{item.detailKo}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detailMode &&
      candidate.anchorKind === "inferred_place" &&
      candidate.inferenceLabelKo ? (
        <div className="px-4 pb-3">
          <p className="rounded-xl bg-[#7cc4ff]/10 px-3 py-2 text-[11px] leading-relaxed text-[#cfeaff] ring-1 ring-[#7cc4ff]/16">
            {candidate.inferenceLabelKo}
            {candidate.confidenceLabelKo ? ` · ${candidate.confidenceLabelKo}` : ""}
            {" · "}
            {copy.globe.spatialTraceInferredPlaceNote}
          </p>
        </div>
      ) : null}

      {!detailMode ? (
        <div className="mx-4 mb-4 space-y-2">
          {onExpandInferredMap ? (
            <GlobeMediaGuideMapExpandButton
              variant="bar"
              label={copy.globe.contextGuideExpandMap}
              candidateCount={inferredPlaceCount}
              onClick={onExpandInferredMap}
              className="w-full"
            />
          ) : null}
          <button
            type="button"
            onClick={onPromoteDetail}
            className="w-full rounded-full bg-white text-[12px] font-semibold text-[#0f172a] shadow-sm active:scale-[0.98] py-3"
          >
            한 번 더 이어 보기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onOpenPrimary}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0071e3] px-4 py-3 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] active:scale-[0.98]"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {primaryLabel}
          </button>
          {onCommitMemo ? (
            <button
              type="button"
              onClick={onCommitMemo}
              disabled={committingMemo}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-3 text-[12px] font-semibold text-white ring-1 ring-white/14 active:scale-[0.98] disabled:opacity-60"
            >
              <MapPinned className="size-3.5" aria-hidden />
              {committingMemo ? "남기는 중…" : "지도에 남기기"}
            </button>
          ) : null}
          {onOpenMap ? (
            <button
              type="button"
              onClick={onOpenMap}
              className="rounded-full bg-white/6 px-4 py-3 text-[12px] font-semibold text-white/82 ring-1 ring-white/10 active:scale-[0.98]"
            >
              지도 보기
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { ExternalLink, MapPinned, X } from "lucide-react";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import type { MediaSpatialTraceTourStop } from "@/lib/situation-projection/build-media-spatial-trace-tour";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import { formatSpatialTraceLine } from "@/lib/situation-projection/build-media-spatial-trace";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";
import { copy } from "@/lib/copy/human-ko";
import { GlobeBrainSurfaceYoutubeEmbed } from "@/components/globe/globe-brain-surface-youtube-embed";

function buildStableEmbedSrc(embedUrl: string | null): string | null {
  if (!embedUrl) {
    return null;
  }
  try {
    const url = new URL(embedUrl);
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("mute", "0");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("enablejsapi", "1");
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
  tourStop?: MediaSpatialTraceTourStop | null;
  tourStopIndex?: number;
  tourStopCount?: number;
  onTourSkip?: (() => void) | null;
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
  tourStop = null,
  tourStopIndex = 0,
  tourStopCount = 0,
  onTourSkip = null,
}: GlobeBrainSurfacePreviewCardProps) {
  const embedSrc = useMemo(
    () => buildStableEmbedSrc(candidate.embedUrl),
    [candidate.embedUrl],
  );
  const embedKey = useMemo(
    () =>
      (candidate.embedUrl
        ? extractYouTubeVideoId(candidate.embedUrl)
        : null) ?? candidate.id,
    [candidate.embedUrl, candidate.id],
  );
  const primaryLabel =
    candidate.primaryActionLabelKo ??
    (candidate.family === "memo"
      ? "연결 열기"
      : candidate.family === "event"
        ? "행사 보기"
        : candidate.family === "info"
          ? "가이드 열기"
          : "상세 열기");

  const showTourStrip = Boolean(tourStop && tourStopCount > 0 && onTourSkip);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-1/2 z-[31] w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/92 text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.16)] backdrop-blur-2xl ring-1 ring-black/[0.04]",
        detailMode
          ? "bottom-[max(6.4rem,calc(env(safe-area-inset-bottom)+5.25rem))]"
          : "bottom-[max(7rem,calc(env(safe-area-inset-bottom)+5.75rem))]",
      )}
      data-globe-brain-surface-preview
      data-detail-mode={detailMode ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {candidate.placeLabel}
            </p>
            {candidate.sourceLabelKo ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                {candidate.sourceLabelKo}
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">
            {candidate.previewTitle}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="rounded-full bg-slate-100 p-1.5 text-slate-600 active:scale-[0.97]"
          aria-label="닫기"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {embedSrc ? (
        <div className="bg-slate-950 px-0 pb-0 pt-0">
          <GlobeBrainSurfaceYoutubeEmbed
            videoKey={embedKey}
            embedSrc={embedSrc}
            title={candidate.previewTitle}
          />
        </div>
      ) : candidate.markerThumbnailUrl || candidate.openUrl ? (
        <div className="px-4 pb-3 pt-3">
          {candidate.markerThumbnailUrl ? (
            <div className="relative overflow-hidden rounded-[1rem] border border-slate-200/80 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={candidate.markerThumbnailUrl}
                alt=""
                className="aspect-video w-full object-cover"
              />
              {candidate.markerMediaKind === "video" ? (
                <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                  ▶ 영상
                </span>
              ) : null}
            </div>
          ) : null}
          {candidate.openUrl ? (
            <a
              href={candidate.openUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex w-full items-center justify-center rounded-full bg-[#0071e3] py-2.5 text-[12px] font-semibold text-white active:scale-[0.98]"
            >
              YouTube에서 보기
            </a>
          ) : null}
        </div>
      ) : null}

      {candidate.previewBody ? (
        <p
          className={cn(
            "px-4 text-[12px] leading-relaxed text-slate-600",
            detailMode ? "pb-3 pt-3" : "pb-2 pt-3",
          )}
        >
          {candidate.previewBody}
        </p>
      ) : null}

      {showTourStrip ? (
        <div className="mx-4 mb-3 rounded-[1rem] border border-sky-200/70 bg-sky-50/90 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700/80">
                {copy.globe.spatialTraceTourEyebrow}
                {tourStopCount > 1 ? (
                  <span className="ml-1.5 text-sky-600/70">
                    {copy.globe.spatialTraceTourProgress(
                      tourStopIndex + 1,
                      tourStopCount,
                    )}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[12px] font-semibold text-sky-950">
                {tourStop!.labelKo}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTourSkip?.();
              }}
              className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-sky-800 ring-1 ring-sky-200/80"
            >
              {copy.globe.spatialTraceTourSkip}
            </button>
          </div>
        </div>
      ) : null}

      {detailMode &&
      candidate.spatialTraceItems &&
      candidate.spatialTraceItems.length > 0 ? (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {copy.globe.spatialTraceTitle}
          </p>
          <ul className="mt-2 space-y-1.5">
            {candidate.spatialTraceItems.map((item) => (
              <li
                key={item.id}
                className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] leading-snug text-slate-800 ring-1 ring-slate-200/80"
              >
                {formatSpatialTraceLine(item)}
              </li>
            ))}
          </ul>
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
            className="w-full rounded-full bg-[#0071e3] py-3 text-[12px] font-semibold text-white shadow-sm active:scale-[0.98]"
          >
            한 번 더 이어 보기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onOpenPrimary}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0071e3] px-4 py-3 text-[12px] font-semibold text-white shadow-[0_8px_20px_rgba(0,113,227,0.22)] active:scale-[0.98]"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {primaryLabel}
          </button>
          {onCommitMemo ? (
            <button
              type="button"
              onClick={onCommitMemo}
              disabled={committingMemo}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-100 px-4 py-3 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200/80 active:scale-[0.98] disabled:opacity-60"
            >
              <MapPinned className="size-3.5" aria-hidden />
              {committingMemo ? "남기는 중…" : "지도에 남기기"}
            </button>
          ) : null}
          {onOpenMap ? (
            <button
              type="button"
              onClick={onOpenMap}
              className="rounded-full bg-white px-4 py-3 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200/80 active:scale-[0.98]"
            >
              지도 보기
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { ExternalLink, MapPinned, X } from "lucide-react";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import type { MediaSpatialTraceTourStop } from "@/lib/situation-projection/build-media-spatial-trace-tour";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import { formatSpatialTraceLine } from "@/lib/situation-projection/build-media-spatial-trace";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
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

function normalizeCompareText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ").toLowerCase() ?? "";
}

function isRedundantPreviewBody(
  title: string,
  body: string | null | undefined,
): boolean {
  const normalizedTitle = normalizeCompareText(title);
  const normalizedBody = normalizeCompareText(body);
  if (!normalizedBody) {
    return true;
  }
  if (normalizedBody === normalizedTitle) {
    return true;
  }
  if (normalizedTitle && normalizedBody.includes(normalizedTitle)) {
    return true;
  }
  if (/맥락에 맞춰 찾은/u.test(body ?? "")) {
    return true;
  }
  return normalizedBody.length > 96;
}

function compactVideoTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 42) {
    return trimmed;
  }
  return `${trimmed.slice(0, 41).trimEnd()}…`;
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
  const isVideoCompact =
    !detailMode &&
    candidate.anchorKind === "video_root" &&
    Boolean(embedSrc);
  const showPreviewBody =
    !isRedundantPreviewBody(candidate.previewTitle, candidate.previewBody) &&
    Boolean(candidate.previewBody?.trim());
  const primaryLabel =
    candidate.primaryActionLabelKo ??
    (candidate.family === "memo"
      ? "연결 열기"
      : candidate.family === "event"
        ? "행사 보기"
        : candidate.family === "info"
          ? "가이드 열기"
          : "상세 열기");

  const shellClass = cn(
    "pointer-events-auto absolute left-1/2 z-[31] -translate-x-1/2 overflow-hidden rounded-[1.15rem] border border-white/85 bg-white/94 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-2xl ring-1 ring-black/[0.04]",
    isVideoCompact
      ? "bottom-[max(6.75rem,calc(env(safe-area-inset-bottom)+5.5rem))] w-[min(18rem,calc(100vw-1.25rem))]"
      : cn(
          "w-[min(24rem,calc(100vw-1.5rem))]",
          detailMode
            ? "bottom-[max(6.4rem,calc(env(safe-area-inset-bottom)+5.25rem))]"
            : "bottom-[max(7rem,calc(env(safe-area-inset-bottom)+5.75rem))]",
        ),
  );

  if (isVideoCompact) {
    return (
      <div
        className={shellClass}
        data-globe-brain-surface-preview
        data-detail-mode="false"
        data-compact-video="true"
      >
        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200/80">
              {candidate.placeLabel}
            </span>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800 ring-1 ring-violet-200/80">
              YouTube
            </span>
          </div>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="shrink-0 rounded-full bg-slate-100 p-1 text-slate-600 active:scale-[0.97]"
            aria-label="닫기"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>

        <div className="px-2">
          <p className="mb-1.5 line-clamp-1 px-0.5 text-[12px] font-semibold leading-snug text-slate-900">
            {compactVideoTitle(candidate.previewTitle)}
          </p>
          <div className="overflow-hidden rounded-[0.85rem] bg-slate-950 ring-1 ring-slate-900/10">
            <GlobeBrainSurfaceYoutubeEmbed
              videoKey={embedKey}
              embedSrc={embedSrc!}
              title={candidate.previewTitle}
              className="aspect-video max-h-[10.25rem] w-full border-0"
            />
          </div>
        </div>

        {showPreviewBody ? (
          <p className="line-clamp-2 px-3 pt-2 text-[11px] leading-relaxed text-slate-600">
            {candidate.previewBody}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2.5">
          {onExpandInferredMap ? (
            <GlobeMediaGuideMapExpandButton
              variant="pill"
              label={copy.globe.contextGuideExpandMap}
              candidateCount={inferredPlaceCount}
              onClick={onExpandInferredMap}
            />
          ) : null}
          {onOpenPrimary && candidate.openUrl ? (
            <button
              type="button"
              onClick={onOpenPrimary}
              className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200/80 active:scale-[0.98]"
            >
              YouTube에서 보기
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={shellClass}
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
                {candidate.sourceLabelKo.split("·")[0]?.trim()}
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
              className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-200/80"
            >
              YouTube에서 보기
            </a>
          ) : null}
        </div>
      ) : null}

      {showPreviewBody ? (
        <p
          className={cn(
            "px-4 text-[12px] leading-relaxed text-slate-600",
            detailMode ? "pb-3 pt-3" : "pb-2 pt-3",
          )}
        >
          {candidate.previewBody}
        </p>
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
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {onExpandInferredMap ? (
            <GlobeMediaGuideMapExpandButton
              variant="pill"
              label={copy.globe.contextGuideExpandMap}
              candidateCount={inferredPlaceCount}
              onClick={onExpandInferredMap}
            />
          ) : null}
          <button
            type="button"
            onClick={onPromoteDetail}
            className="inline-flex items-center rounded-full bg-[#0071e3] px-3 py-1.5 text-[11px] font-semibold text-white active:scale-[0.98]"
          >
            자세히
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-3 pb-4">
          <button
            type="button"
            onClick={onOpenPrimary}
            className="inline-flex items-center gap-1 rounded-full bg-[#0071e3] px-3 py-2 text-[11px] font-semibold text-white active:scale-[0.98]"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {primaryLabel}
          </button>
          {onCommitMemo ? (
            <button
              type="button"
              onClick={onCommitMemo}
              disabled={committingMemo}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-200/80 active:scale-[0.98] disabled:opacity-60"
            >
              <MapPinned className="size-3.5" aria-hidden />
              {committingMemo ? "남기는 중…" : "지도에 남기기"}
            </button>
          ) : null}
          {onOpenMap ? (
            <button
              type="button"
              onClick={onOpenMap}
              className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80 active:scale-[0.98]"
            >
              지도 보기
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

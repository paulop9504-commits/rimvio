"use client";

import { useMemo, type ReactNode } from "react";
import { ExternalLink, MapPinned, X } from "lucide-react";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import type { MediaSpatialTraceTourStop } from "@/lib/situation-projection/build-media-spatial-trace-tour";
import { GlobeBrainSurfaceVideoChip } from "@/components/globe/globe-brain-surface-video-chip";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import { formatSpatialTraceLine } from "@/lib/situation-projection/build-media-spatial-trace";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";
import { copy } from "@/lib/copy/human-ko";
import { textsOverlap } from "@/lib/globe/brain-surface-card-copy";
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
  if (trimmed.length <= 36) {
    return trimmed;
  }
  return `${trimmed.slice(0, 35).trimEnd()}…`;
}

const INFO_SHELL =
  "overflow-hidden rounded-b-[1.1rem] rounded-t-none border border-t-0 border-white/85 bg-white/94 text-slate-900 shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur-2xl ring-1 ring-black/[0.04]";

const PREVIEW_SHELL =
  "overflow-hidden rounded-b-[1.15rem] rounded-t-none border border-t-0 border-white/85 bg-white/94 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-2xl ring-1 ring-black/[0.04]";

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

function GlobeBrainSurfaceInfoFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlobeBrainSurfaceFloatingFrame
      frameId="brain-surface-info"
      dragLabel="정보 프레임 이동"
      shellClassName={cn(INFO_SHELL, className)}
      bodyClassName="p-0"
    >
      {children}
    </GlobeBrainSurfaceFloatingFrame>
  );
}

function GlobeBrainSurfacePreviewFrame({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <GlobeBrainSurfaceFloatingFrame
      frameId="brain-surface-preview"
      dragLabel="미리보기 이동"
      shellClassName={PREVIEW_SHELL}
      bodyClassName="p-0"
    >
      {children}
    </GlobeBrainSurfaceFloatingFrame>
  );
}

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
  const isVideoSplit =
    candidate.anchorKind === "video_root" && Boolean(embedSrc) && !detailMode;
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

  const tourMeta = tourStop
    ? [tourStop.inferenceLabelKo, tourStop.confidenceLabelKo].filter(Boolean).join(" · ")
    : "";
  const tourLabelVisible = Boolean(
    tourStop && !textsOverlap(tourStop.labelKo, candidate.previewTitle),
  );
  const infoHeadline =
    tourStop && tourLabelVisible
      ? tourStop.labelKo
      : compactVideoTitle(candidate.previewTitle);

  if (isVideoSplit) {
    return (
      <>
        <GlobeBrainSurfaceVideoChip
          embedSrc={embedSrc!}
          embedKey={embedKey}
          title={candidate.previewTitle}
          onClose={onClose}
        />

        <GlobeBrainSurfaceInfoFrame>
          {tourStop ? (
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-2">
              <p className="text-[10px] font-semibold text-sky-700">
                {copy.globe.spatialTraceTourEyebrow}
                {tourStopCount > 1 ? (
                  <span className="ml-1 text-sky-600/75">
                    {copy.globe.spatialTraceTourProgress(tourStopIndex + 1, tourStopCount)}
                  </span>
                ) : null}
              </p>
              {tourMeta ? (
                <span className="truncate text-[10px] font-medium text-sky-700/80">
                  {tourMeta}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="px-3 pt-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              {candidate.placeLabel}
            </p>
            <p className="mt-1 line-clamp-1 text-[13px] font-semibold leading-snug text-slate-900">
              {infoHeadline}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 px-2.5 pb-2.5 pt-2">
            {onExpandInferredMap ? (
              <GlobeMediaGuideMapExpandButton
                variant="bar"
                label={copy.globe.contextGuideExpandMap}
                candidateCount={inferredPlaceCount}
                onClick={onExpandInferredMap}
              />
            ) : null}
            <button
              type="button"
              onClick={onPromoteDetail}
              className={cn(
                "flex w-full items-center justify-center rounded-[0.85rem] px-3 py-2.5 text-[12px] font-semibold active:scale-[0.98]",
                onExpandInferredMap
                  ? "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80"
                  : "bg-[#0071e3] text-white shadow-[0_8px_20px_rgba(0,113,227,0.28)]",
              )}
            >
              {copy.globe.contextGuideDisclosureDetail}
            </button>
          </div>
        </GlobeBrainSurfaceInfoFrame>
      </>
    );
  }

  const previewBody = (
    <>
      {tourStop ? (
        <div className="border-b border-slate-200/70 px-3 py-2">
          <p className="text-[10px] font-semibold text-sky-700">
            {copy.globe.spatialTraceTourEyebrow}
            {tourStopCount > 1 ? (
              <span className="ml-1 text-sky-600/75">
                {copy.globe.spatialTraceTourProgress(tourStopIndex + 1, tourStopCount)}
              </span>
            ) : null}
          </p>
          {tourLabelVisible ? (
            <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-slate-900">
              {tourStop!.labelKo}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-3 pb-2.5 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {candidate.placeLabel}
          </p>
          <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-slate-900">
            {candidate.previewTitle}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-600 active:scale-[0.97]"
          aria-label="닫기"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {embedSrc && detailMode ? (
        <div className="bg-slate-950 px-0 pb-0 pt-0">
          <GlobeBrainSurfaceYoutubeEmbed
            videoKey={embedKey}
            embedSrc={embedSrc}
            title={candidate.previewTitle}
            className="aspect-video max-h-[9rem] w-full border-0"
          />
        </div>
      ) : candidate.markerThumbnailUrl || candidate.openUrl ? (
        <div className="px-3 pb-2 pt-2">
          {candidate.markerThumbnailUrl ? (
            <div className="relative overflow-hidden rounded-[0.85rem] border border-slate-200/80 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={candidate.markerThumbnailUrl}
                alt=""
                className="aspect-video max-h-[9rem] w-full object-cover"
              />
              {candidate.markerMediaKind === "video" ? (
                <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                  ▶ 영상
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showPreviewBody && detailMode ? (
        <p className="line-clamp-2 px-3 pb-2 pt-2 text-[11px] leading-relaxed text-slate-600">
          {candidate.previewBody}
        </p>
      ) : null}

      {detailMode &&
      candidate.spatialTraceItems &&
      candidate.spatialTraceItems.length > 0 ? (
        <div className="px-3 pb-3">
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
        <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
          {onExpandInferredMap ? (
            <GlobeMediaGuideMapExpandButton
              variant="bar"
              label={copy.globe.contextGuideExpandMap}
              candidateCount={inferredPlaceCount}
              onClick={onExpandInferredMap}
            />
          ) : null}
          <button
            type="button"
            onClick={onPromoteDetail}
            className={cn(
              "flex w-full items-center justify-center rounded-[0.85rem] px-3 py-2.5 text-[12px] font-semibold active:scale-[0.98]",
              onExpandInferredMap
                ? "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80"
                : "bg-[#0071e3] text-white",
            )}
          >
            {copy.globe.contextGuideDisclosureDetail}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
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
    </>
  );

  return (
    <GlobeBrainSurfacePreviewFrame>{previewBody}</GlobeBrainSurfacePreviewFrame>
  );
}

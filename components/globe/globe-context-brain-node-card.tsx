"use client";

import { ExternalLink, MapPinned, Play, X } from "lucide-react";
import { ProjectionNodeIcon } from "@/components/globe/projection-node-icon";
import { copy } from "@/lib/copy/human-ko";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import type { ProjectionNodePresentation } from "@/lib/situation-projection/projection-node-presentation";
import type { ProjectionNode } from "@/lib/situation-projection/types";
import type { MediaSpatialTraceTourStop } from "@/lib/situation-projection/build-media-spatial-trace-tour";
import { GlobeBrainSurfaceYoutubeEmbed } from "@/components/globe/globe-brain-surface-youtube-embed";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";
import {
  dedupeFactorChips,
  pickCardHeadline,
  pickPrimaryReason,
  shouldShowCandidateBadge,
  shouldShowContextBadge,
  textsOverlap,
} from "@/lib/globe/brain-surface-card-copy";
import { cn } from "@/lib/utils";

type GlobeContextBrainNodeCardAction = {
  label: string;
  onClick: () => void;
};

export type GlobeContextBrainNodeCardProps = {
  contextTitle: string;
  node: ProjectionNode;
  presentation: ProjectionNodePresentation;
  memoBody?: string | null;
  factors?: readonly string[];
  mediaGuide?: MediaGuideNode | null;
  primaryAction?: GlobeContextBrainNodeCardAction | null;
  secondaryAction?: GlobeContextBrainNodeCardAction | null;
  tourStop?: MediaSpatialTraceTourStop | null;
  tourStopIndex?: number;
  tourStopCount?: number;
  onClose: () => void;
  className?: string;
  /** float = centered overlay card · dock = bottom split panel */
  variant?: "float" | "dock";
};

const GLOBE_CARD_SHELL =
  "w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.15rem] border border-white/85 bg-white/94 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-2xl ring-1 ring-black/[0.04]";

function resolveAccentClasses(accent: ProjectionNodePresentation["discoveryAccent"]) {
  switch (accent) {
    case "green":
      return {
        iconWrap: "bg-emerald-50 text-emerald-700",
        chip: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
        subtleChip: "bg-slate-100 text-slate-700 ring-slate-200/80",
      };
    case "orange":
      return {
        iconWrap: "bg-orange-50 text-orange-700",
        chip: "bg-orange-50 text-orange-800 ring-orange-200/80",
        subtleChip: "bg-slate-100 text-slate-700 ring-slate-200/80",
      };
    case "purple":
      return {
        iconWrap: "bg-violet-50 text-violet-700",
        chip: "bg-violet-50 text-violet-800 ring-violet-200/80",
        subtleChip: "bg-slate-100 text-slate-700 ring-slate-200/80",
      };
    case "blue":
    default:
      return {
        iconWrap: "bg-sky-50 text-sky-700",
        chip: "bg-sky-50 text-sky-800 ring-sky-200/80",
        subtleChip: "bg-slate-100 text-slate-700 ring-slate-200/80",
      };
  }
}

function formatPublishedAt(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) {
    return null;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

function pickGuideThumbnail(guide: MediaGuideNode | null | undefined): string | null {
  if (!guide) {
    return null;
  }
  const official = guide.youtubeOfficial?.thumbnails;
  return (
    official?.maxres ||
    official?.standard ||
    official?.high ||
    official?.medium ||
    official?.default ||
    guide.thumbnailUrl ||
    null
  );
}

function pickGuideProvider(guide: MediaGuideNode | null | undefined): string | null {
  if (!guide) {
    return null;
  }
  return (
    guide.youtubeOfficial?.channelTitle?.trim() ||
    guide.providerName?.trim() ||
    guide.relatedPlaceLabel?.trim() ||
    null
  );
}

function buildStableEmbedSrc(embedUrl: string | null | undefined): string | null {
  const raw = embedUrl?.trim();
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("mute", "0");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("enablejsapi", "1");
    return url.toString();
  } catch {
    return raw;
  }
}

function GlobeContextBrainTourStrip({
  stop,
  stopIndex,
  stopCount,
  headline,
}: {
  stop: MediaSpatialTraceTourStop;
  stopIndex: number;
  stopCount: number;
  headline: string;
}) {
  const meta = [stop.inferenceLabelKo, stop.confidenceLabelKo]
    .filter(Boolean)
    .join(" · ");
  const labelVisible = !textsOverlap(stop.labelKo, headline);

  return (
    <div className="border-b border-slate-200/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700/80">
        {copy.globe.spatialTraceTourEyebrow}
        {stopCount > 1 ? (
          <span className="ml-1.5 text-sky-600/70">
            {copy.globe.spatialTraceTourProgress(stopIndex + 1, stopCount)}
          </span>
        ) : null}
      </p>
      {labelVisible ? (
        <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">
          {stop.labelKo}
        </p>
      ) : null}
      {stop.detailKo ? (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-600">
          {stop.detailKo}
        </p>
      ) : null}
      {meta ? <p className="mt-1 text-[10px] font-medium text-sky-700">{meta}</p> : null}
    </div>
  );
}

export function GlobeContextBrainNodeCard({
  contextTitle,
  node,
  presentation,
  memoBody = null,
  factors = [],
  mediaGuide = null,
  primaryAction = null,
  secondaryAction = null,
  tourStop = null,
  tourStopIndex = 0,
  tourStopCount = 0,
  onClose,
  className,
  variant = "float",
}: GlobeContextBrainNodeCardProps) {
  const accent = resolveAccentClasses(presentation.discoveryAccent);
  const guideThumbnail = pickGuideThumbnail(mediaGuide);
  const guideProvider = pickGuideProvider(mediaGuide);
  const guidePublishedAt = formatPublishedAt(mediaGuide?.youtubeOfficial?.publishedAt ?? null);
  const guideDuration = formatDuration(mediaGuide?.durationSeconds ?? null);
  const relatedVideos = mediaGuide?.youtubeOfficial?.relatedSearchResults.slice(0, 2) ?? [];
  const isMediaInferredGhost =
    node.kind === "ghost" && node.candidateOrigin === "media_inferred";
  const { headline, guideTitleLine } = pickCardHeadline({
    nodeLabel: node.label,
    guideTitle: mediaGuide?.title ?? node.sourceGuideTitle ?? null,
    isMediaInferredGhost,
  });
  const primaryReason = pickPrimaryReason({
    headline,
    guideTitle: mediaGuide?.title ?? node.sourceGuideTitle ?? null,
    whyRelevantKo: mediaGuide?.whyRelevantKo ?? null,
    relationReasonKo: node.relationReasonKo ?? null,
    playbookReasonKo: node.playbookReasonKo ?? null,
    snippetKo: node.sourceGuideSnippetKo ?? null,
    memoBody,
  });
  const factorChips = dedupeFactorChips(
    factors,
    [headline, guideTitleLine, primaryReason, contextTitle, presentation.categoryLabelKo],
    3,
  );
  const momentChips =
    mediaGuide?.moments
      .slice(0, 3)
      .map((moment) => moment.chipLabelKo)
      .filter(
        (chip) =>
          !factorChips.some((factor) => factor.includes(chip) || chip.includes(factor)) &&
          !primaryReason?.includes(chip),
      ) ?? [];
  const showHero = Boolean(mediaGuide?.embedUrl || guideThumbnail);
  const embedSrc = buildStableEmbedSrc(mediaGuide?.embedUrl);
  const embedKey =
    (mediaGuide?.embedUrl ? extractYouTubeVideoId(mediaGuide.embedUrl) : null) ??
    mediaGuide?.guideNodeId ??
    node.id;

  const docked = variant === "dock";

  return (
    <div
      className={cn(
        GLOBE_CARD_SHELL,
        docked
          ? "max-h-[min(44vh,20rem)] w-full max-w-none overflow-y-auto rounded-[1rem] shadow-none ring-0"
          : "max-h-[min(52vh,32rem)] overflow-y-auto",
        className,
      )}
      data-globe-context-brain-node-card
      data-globe-context-brain-node-variant={variant}
      data-globe-context-brain-node-kind={node.kind}
    >
      {tourStop ? (
        <GlobeContextBrainTourStrip
          stop={tourStop}
          stopIndex={tourStopIndex}
          stopCount={tourStopCount}
          headline={headline}
        />
      ) : null}

      <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-3 pb-3 pt-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", accent.chip)}>
              {presentation.categoryLabelKo}
            </span>
            {mediaGuide ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800 ring-1 ring-violet-200/80">
                {mediaGuide.sourceLabelKo}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">
            {headline}
          </p>
          {guideTitleLine ? (
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{guideTitleLine}</p>
          ) : null}
          {guideProvider || guidePublishedAt || guideDuration ? (
            <p className="mt-1 text-[11px] text-slate-500">
              {[guideProvider, guidePublishedAt, guideDuration].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-600 active:scale-[0.97]"
          aria-label={copy.globe.contextBrainNodeClose}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {showHero ? (
        <div className="px-3 pt-3">
          {embedSrc ? (
            <div className="overflow-hidden rounded-[0.85rem] bg-slate-950 ring-1 ring-slate-900/10">
              <GlobeBrainSurfaceYoutubeEmbed
                videoKey={embedKey}
                embedSrc={embedSrc}
                title={mediaGuide?.title ?? "영상"}
                className="aspect-video max-h-[10.25rem] w-full border-0"
              />
            </div>
          ) : guideThumbnail ? (
            <div className="relative overflow-hidden rounded-[0.85rem] bg-slate-100 ring-1 ring-slate-200/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={guideThumbnail}
                alt=""
                className="aspect-video max-h-[10.25rem] w-full object-cover"
                loading="lazy"
              />
              {mediaGuide?.sourceKind === "youtube" ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/12 text-white">
                  <span className="flex size-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md">
                    <Play className="size-4 fill-white/80" aria-hidden />
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 pt-3">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", accent.iconWrap)}>
            <ProjectionNodeIcon token={presentation.iconToken} className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {presentation.axisLabelKo}
            </p>
            <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-slate-900">
              {node.label}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 px-3 pb-3 pt-3">
        {shouldShowContextBadge(contextTitle, presentation.categoryLabelKo) ||
        shouldShowCandidateBadge(node.candidateBadgeKo, presentation.categoryLabelKo) ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {shouldShowContextBadge(contextTitle, presentation.categoryLabelKo) ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200/80">
                {contextTitle}
              </span>
            ) : null}
            {shouldShowCandidateBadge(node.candidateBadgeKo, presentation.categoryLabelKo) ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                {node.candidateBadgeKo}
              </span>
            ) : null}
          </div>
        ) : null}

        {primaryReason ? (
          <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {copy.globe.contextBrainNodeReasonLabel}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{primaryReason}</p>
          </div>
        ) : null}

        {momentChips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {momentChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200/80"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {!showHero && relatedVideos.length > 0 ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {copy.globe.contextBrainNodeRelatedTitle}
            </p>
            <div className="mt-2 space-y-1.5">
              {relatedVideos.map((result) => (
                <a
                  key={`${mediaGuide?.guideNodeId ?? node.id}:${result.videoId}`}
                  href={result.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-[0.9rem] border border-slate-200/80 bg-slate-50 px-2.5 py-2 active:scale-[0.99]"
                >
                  {result.thumbnailUrl ? (
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[0.7rem] border border-slate-200/80 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/12 text-white">
                        <Play className="size-3.5 fill-white/80" aria-hidden />
                      </span>
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-slate-800">
                      {result.title || mediaGuide?.title || node.label}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {[result.channelTitle, formatPublishedAt(result.publishedAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <ExternalLink className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {factorChips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {factorChips.map((factor) => (
              <span
                key={factor}
                className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200/80"
              >
                {factor}
              </span>
            ))}
          </div>
        ) : null}

        {primaryAction || secondaryAction ? (
          <div className="flex flex-wrap gap-1.5">
            {primaryAction ? (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0071e3] px-3 py-2 text-[11px] font-semibold text-white active:scale-[0.98]"
              >
                {mediaGuide?.sourceKind === "youtube" ? (
                  <Play className="size-3.5" aria-hidden />
                ) : (
                  <ExternalLink className="size-3.5" aria-hidden />
                )}
                {primaryAction.label}
              </button>
            ) : null}
            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-200/80 active:scale-[0.98]"
              >
                <MapPinned className="size-3.5" aria-hidden />
                {secondaryAction.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

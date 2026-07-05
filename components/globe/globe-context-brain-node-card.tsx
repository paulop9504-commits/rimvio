"use client";

import { ExternalLink, MapPinned, Play, X } from "lucide-react";
import { ProjectionNodeIcon } from "@/components/globe/projection-node-icon";
import { copy } from "@/lib/copy/human-ko";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import type { ProjectionNodePresentation } from "@/lib/situation-projection/projection-node-presentation";
import type { ProjectionNode } from "@/lib/situation-projection/types";
import type { MediaSpatialTraceTourStop } from "@/lib/situation-projection/build-media-spatial-trace-tour";
import { GlobeMapFocusMediaShell } from "@/components/globe/globe-map-focus-media-shell";
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
  /** float = centered overlay · dock = legacy bottom panel · embedded = inside floating frame */
  variant?: "float" | "dock" | "embedded";
  /** dock + YouTube: embed renders in map stage, card stays info-only */
  videoDetached?: boolean;
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
  videoDetached = false,
}: GlobeContextBrainNodeCardProps) {
  const accent = resolveAccentClasses(presentation.discoveryAccent);
  const guideThumbnail = pickGuideThumbnail(mediaGuide);
  const guideProvider = pickGuideProvider(mediaGuide);
  const guidePublishedAt = formatPublishedAt(mediaGuide?.youtubeOfficial?.publishedAt ?? null);
  const guideDuration = formatDuration(mediaGuide?.durationSeconds ?? null);
  const relatedVideos = mediaGuide?.youtubeOfficial?.relatedSearchResults.slice(0, 2) ?? [];
  const isMediaInferredGhost =
    node.kind === "ghost" && node.candidateOrigin === "media_inferred";
  const ghostNode = node.kind === "ghost" ? node : null;
  const candidateBadgeKo = ghostNode?.candidateBadgeKo ?? null;
  const sourceGuideTitle = ghostNode?.sourceGuideTitle ?? null;
  const { headline, guideTitleLine } = pickCardHeadline({
    nodeLabel: node.label,
    guideTitle: mediaGuide?.title ?? sourceGuideTitle,
    isMediaInferredGhost,
  });
  const primaryReason = pickPrimaryReason({
    headline,
    guideTitle: mediaGuide?.title ?? sourceGuideTitle,
    whyRelevantKo: mediaGuide?.whyRelevantKo ?? null,
    relationReasonKo: node.relationReasonKo ?? null,
    playbookReasonKo: node.kind === "ghost" ? node.playbookReasonKo ?? null : null,
    snippetKo: node.kind === "ghost" ? node.sourceGuideSnippetKo ?? null : null,
    memoBody,
  });
  const factorChips = dedupeFactorChips(
    factors,
    [headline, guideTitleLine ?? "", primaryReason ?? "", contextTitle, presentation.categoryLabelKo],
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
  const embedKey =
    (mediaGuide?.embedUrl ? extractYouTubeVideoId(mediaGuide.embedUrl) : null) ??
    mediaGuide?.guideNodeId ??
    node.id;
  const docked = variant === "dock";
  const embedded = variant === "embedded";
  const videoInMapStage =
    (docked || embedded) && videoDetached && Boolean(mediaGuide?.embedUrl?.trim());
  const showHero =
    Boolean(mediaGuide?.embedUrl || guideThumbnail) && !videoInMapStage;
  const dockMediaCompact = videoInMapStage || embedded;

  return (
    <div
      className={cn(
        embedded
          ? cn("w-full text-slate-900", className)
          : cn(
              GLOBE_CARD_SHELL,
              docked
                ? "max-h-[min(44vh,20rem)] w-full max-w-none overflow-y-auto rounded-[1rem] shadow-none ring-0"
                : "max-h-[min(52vh,32rem)] overflow-y-auto",
              className,
            ),
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
              {dockMediaCompact ? contextTitle : presentation.categoryLabelKo}
            </span>
            {mediaGuide && !dockMediaCompact ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800 ring-1 ring-violet-200/80">
                {mediaGuide.sourceLabelKo}
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-1.5 font-semibold leading-snug text-slate-900",
              dockMediaCompact ? "line-clamp-1 text-[13px]" : "line-clamp-2 text-[15px]",
            )}
          >
            {headline}
          </p>
          {!dockMediaCompact && guideTitleLine ? (
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{guideTitleLine}</p>
          ) : null}
          {!dockMediaCompact && (guideProvider || guidePublishedAt || guideDuration) ? (
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
          <GlobeMapFocusMediaShell
            title={headline}
            caption={guideTitleLine}
            thumbnailUrl={guideThumbnail}
            youtubeEmbedUrl={mediaGuide?.embedUrl ?? null}
            youtubeVideoKey={embedKey}
            showMetadataOverlay={false}
            className="w-full"
          />
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

      <div className={cn("space-y-3 px-3 pb-3", dockMediaCompact ? "pt-2" : "pt-3")}>
        {!dockMediaCompact &&
        (shouldShowContextBadge(contextTitle, presentation.categoryLabelKo) ||
          shouldShowCandidateBadge(candidateBadgeKo, presentation.categoryLabelKo)) ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {shouldShowContextBadge(contextTitle, presentation.categoryLabelKo) ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200/80">
                {contextTitle}
              </span>
            ) : null}
            {shouldShowCandidateBadge(candidateBadgeKo, presentation.categoryLabelKo) ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                {candidateBadgeKo}
              </span>
            ) : null}
          </div>
        ) : null}

        {primaryReason && !dockMediaCompact ? (
          <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {copy.globe.contextBrainNodeReasonLabel}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{primaryReason}</p>
          </div>
        ) : primaryReason && dockMediaCompact ? (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-600">{primaryReason}</p>
        ) : null}

        {!dockMediaCompact && momentChips.length > 0 ? (
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

        {!dockMediaCompact && !showHero && relatedVideos.length > 0 ? (
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

        {!dockMediaCompact && factorChips.length > 0 ? (
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
          <div className={cn(dockMediaCompact ? "flex flex-col gap-1.5" : "flex flex-wrap gap-1.5")}>
            {primaryAction ? (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className={cn(
                  "inline-flex min-h-10 items-center justify-center gap-1.5 bg-[#0071e3] px-3 py-2.5 text-[12px] font-semibold text-white active:scale-[0.98]",
                  dockMediaCompact
                    ? "w-full rounded-[0.85rem] shadow-[0_8px_20px_rgba(0,113,227,0.28)]"
                    : "flex-1 rounded-full",
                )}
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
                className={cn(
                  "inline-flex min-h-10 items-center justify-center gap-1.5 bg-slate-100 px-3 py-2.5 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200/80 active:scale-[0.98]",
                  dockMediaCompact ? "w-full rounded-[0.85rem]" : "rounded-full",
                )}
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

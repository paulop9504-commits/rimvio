"use client";

import { ExternalLink, MapPinned, Play, X } from "lucide-react";
import { ProjectionNodeIcon } from "@/components/globe/projection-node-icon";
import { copy } from "@/lib/copy/human-ko";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import type { ProjectionNodePresentation } from "@/lib/situation-projection/projection-node-presentation";
import type { ProjectionNode } from "@/lib/situation-projection/types";
import { GlobeBrainSurfaceYoutubeEmbed } from "@/components/globe/globe-brain-surface-youtube-embed";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";

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
  onClose: () => void;
  className?: string;
};

function resolveAccentClasses(
  accent: ProjectionNodePresentation["discoveryAccent"],
) {
  switch (accent) {
    case "green":
      return {
        iconWrap: "bg-[#123725] text-[#6ee7b7]",
        chip: "bg-[#10271b] text-[#8cf0c7] ring-[#34c759]/18",
        subtleChip: "bg-white/10 text-white/72 ring-white/10",
        cardRing: "ring-[#34c759]/18",
      };
    case "orange":
      return {
        iconWrap: "bg-[#3a2612] text-[#ffb869]",
        chip: "bg-[#2b1a0f] text-[#ffc98e] ring-[#ff9500]/18",
        subtleChip: "bg-white/10 text-white/72 ring-white/10",
        cardRing: "ring-[#ff9500]/18",
      };
    case "purple":
      return {
        iconWrap: "bg-[#2d1d3d] text-[#e6ccff]",
        chip: "bg-[#23152f] text-[#e6ccff] ring-[#bf5af2]/18",
        subtleChip: "bg-white/10 text-white/72 ring-white/10",
        cardRing: "ring-[#bf5af2]/18",
      };
    case "blue":
    default:
      return {
        iconWrap: "bg-[#11263d] text-[#8fd1ff]",
        chip: "bg-[#0b1f36] text-[#b6dcff] ring-[#3182f6]/18",
        subtleChip: "bg-white/10 text-white/72 ring-white/10",
        cardRing: "ring-[#3182f6]/18",
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

export function GlobeContextBrainNodeCard({
  contextTitle,
  node,
  presentation,
  memoBody = null,
  factors = [],
  mediaGuide = null,
  primaryAction = null,
  secondaryAction = null,
  onClose,
  className,
}: GlobeContextBrainNodeCardProps) {
  const accent = resolveAccentClasses(presentation.discoveryAccent);
  const guideThumbnail = pickGuideThumbnail(mediaGuide);
  const guideProvider = pickGuideProvider(mediaGuide);
  const guidePublishedAt = formatPublishedAt(mediaGuide?.youtubeOfficial?.publishedAt ?? null);
  const guideDuration = formatDuration(mediaGuide?.durationSeconds ?? null);
  const relatedVideos = mediaGuide?.youtubeOfficial?.relatedSearchResults.slice(0, 2) ?? [];
  const sourceLine =
    mediaGuide?.whyRelevantKo?.trim() ||
    (node.kind === "ghost" ? node.sourceGuideSnippetKo?.trim() || node.playbookReasonKo?.trim() : null) ||
    memoBody?.trim() ||
    null;
  const showHero = Boolean(mediaGuide?.embedUrl || guideThumbnail);
  const embedSrc = buildStableEmbedSrc(mediaGuide?.embedUrl);
  const embedKey =
    (mediaGuide?.embedUrl ? extractYouTubeVideoId(mediaGuide.embedUrl) : null) ??
    mediaGuide?.guideNodeId ??
    node.id;
  const relationLine =
    node.kind === "ghost"
      ? node.relationReasonKo?.trim() || node.relationLabelKo?.trim() || null
      : node.relationReasonKo?.trim() || node.relationLabelKo?.trim() || null;

  return (
    <div
      className={cn(
        "max-h-[min(58vh,34rem)] w-full max-w-[min(100%,26rem)] overflow-y-auto overflow-x-hidden rounded-[1.35rem] border border-white/12 bg-[#0f172a]/88 text-white shadow-[0_22px_52px_rgba(0,0,0,0.36)] backdrop-blur-xl",
        className,
      )}
      data-globe-context-brain-node-card
      data-globe-context-brain-node-kind={node.kind}
    >
      {showHero ? (
        <div className="relative overflow-hidden border-b border-white/10 bg-[#05070b]">
          {embedSrc ? (
            <GlobeBrainSurfaceYoutubeEmbed
              videoKey={embedKey}
              embedSrc={embedSrc}
              title={mediaGuide?.title ?? "영상"}
              className="h-[min(44vw,16rem)] min-h-[13rem] w-full border-0 bg-black"
            />
          ) : guideThumbnail ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={guideThumbnail}
                alt=""
                className="h-[min(44vw,16rem)] min-h-[13rem] w-full object-cover"
                loading="lazy"
              />
              {mediaGuide?.sourceKind === "youtube" ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/16 text-white">
                  <span className="flex size-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md">
                    <Play className="size-5 fill-white/80" aria-hidden />
                  </span>
                </span>
              ) : null}
            </>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 z-[3] flex size-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-[0.96]"
            aria-label={copy.globe.contextBrainNodeClose}
          >
            <X className="size-4" aria-hidden />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-14">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold ring-1", accent.chip)}>
                {presentation.categoryLabelKo}
              </span>
              {mediaGuide ? (
                <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] font-semibold text-white/88 ring-1 ring-white/10">
                  {mediaGuide.sourceLabelKo}
                </span>
              ) : null}
              {mediaGuide?.primaryMoment ? (
                <span className="rounded-full bg-[#2d2316] px-2 py-1 text-[10px] font-semibold text-[#ffd59a] ring-1 ring-[#f59e0b]/18">
                  {mediaGuide.primaryMoment.chipLabelKo}
                </span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-[16px] font-bold leading-tight tracking-tight text-white">
              {mediaGuide?.title || node.label}
            </p>
            <p className="mt-1 line-clamp-2 text-[12px] font-medium text-white/82">
              {node.label}
            </p>
            {guideProvider || guidePublishedAt || guideDuration ? (
              <p className="mt-1 text-[11px] text-white/68">
                {[guideProvider, guidePublishedAt, guideDuration].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3 px-3 pb-0 pt-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", accent.iconWrap)}>
                <ProjectionNodeIcon token={presentation.iconToken} className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/62">
                  {presentation.categoryLabelKo}
                </p>
                <p className="truncate text-[11px] text-white/74">{presentation.axisLabelKo}</p>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-[16px] font-semibold leading-snug text-white">
              {node.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/70 active:bg-white/14"
            aria-label={copy.globe.contextBrainNodeClose}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="space-y-3 px-3 pb-3 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold ring-1", accent.subtleChip)}>
            {copy.globe.contextBrainNodeContextLabel}
          </span>
          <span className="rounded-full bg-white/6 px-2 py-1 text-[10px] font-medium text-white/78 ring-1 ring-white/8">
            {contextTitle}
          </span>
          {node.kind === "ghost" && node.candidateBadgeKo ? (
            <span className="rounded-full bg-white/6 px-2 py-1 text-[10px] font-medium text-white/70 ring-1 ring-white/8">
              {node.candidateBadgeKo}
            </span>
          ) : null}
        </div>

        {relationLine ? (
          <p className="text-[11px] leading-snug text-white/60">{relationLine}</p>
        ) : null}

        {sourceLine ? (
          <div className="rounded-[1rem] border border-[#e8d3a8]/38 bg-[#fff7e7]/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f0d7ab]">
              {copy.globe.contextBrainNodeReasonLabel}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/84">{sourceLine}</p>
          </div>
        ) : null}

        {mediaGuide?.moments.length ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/52">
              {copy.globe.contextBrainNodeSourceLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mediaGuide.moments.slice(0, 3).map((moment) => (
                <span
                  key={`${mediaGuide.guideNodeId}:${moment.seconds}`}
                  className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-semibold text-white/84 ring-1 ring-white/10"
                >
                  {moment.chipLabelKo}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {relatedVideos.length > 0 ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/52">
              {copy.globe.contextBrainNodeRelatedTitle}
            </p>
            <div className="mt-2 space-y-1.5">
              {relatedVideos.map((result) => (
                <a
                  key={`${mediaGuide?.guideNodeId ?? node.id}:${result.videoId}`}
                  href={result.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-[0.9rem] border border-white/10 bg-white/[0.04] px-2.5 py-2 active:scale-[0.99]"
                >
                  {result.thumbnailUrl ? (
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[0.7rem] border border-white/10 bg-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/18 text-white">
                        <Play className="size-3.5 fill-white/80" aria-hidden />
                      </span>
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-white/84">
                      {result.title || mediaGuide?.title || node.label}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-white/48">
                      {[result.channelTitle, formatPublishedAt(result.publishedAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <ExternalLink className="size-3.5 shrink-0 text-white/42" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {factors.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {factors.map((factor) => (
              <span
                key={factor}
                className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-semibold text-white/74 ring-1 ring-white/10"
              >
                {factor}
              </span>
            ))}
          </div>
        ) : null}

        {primaryAction || secondaryAction ? (
          <div className="flex gap-2">
            {primaryAction ? (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className={cn(
                  "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[1rem] bg-white px-3 py-3 text-[13px] font-semibold text-[#0f172a] active:scale-[0.99]",
                  !secondaryAction && "w-full",
                )}
              >
                {mediaGuide?.sourceKind === "youtube" ? (
                  <Play className="size-4" aria-hidden />
                ) : (
                  <ExternalLink className="size-4" aria-hidden />
                )}
                {primaryAction.label}
              </button>
            ) : null}
            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-[1rem] border border-white/14 bg-white/8 px-3 py-3 text-[13px] font-semibold text-white active:scale-[0.99]",
                  primaryAction ? "w-[8.25rem]" : "flex-1",
                )}
              >
                <MapPinned className="size-4" aria-hidden />
                {secondaryAction.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

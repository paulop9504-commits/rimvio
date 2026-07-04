"use client";

import { ExternalLink, Play } from "lucide-react";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextGuideSectionProps = {
  guides: readonly MediaGuideNode[];
  loading?: boolean;
  tone?: "light" | "dark";
  maxItems?: number;
  onExpandGuideMap?: (guide: MediaGuideNode) => void;
};

function openLabel(sourceKind: MediaGuideNode["sourceKind"]): string {
  return sourceKind === "youtube"
    ? copy.globe.contextGuideOpenVideo
    : copy.globe.contextGuideOpenPage;
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

function pickGuideThumbnail(guide: MediaGuideNode): string | null {
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

function pickGuideMetaLine(guide: MediaGuideNode): string | null {
  const provider =
    guide.youtubeOfficial?.channelTitle?.trim() ||
    guide.providerName?.trim() ||
    guide.relatedPlaceLabel?.trim() ||
    null;
  const publishedAt = formatPublishedAt(guide.youtubeOfficial?.publishedAt ?? null);
  const duration = formatDuration(guide.durationSeconds);
  const line = [provider, publishedAt, duration].filter(Boolean).join(" · ");
  return line || null;
}

export function GlobeContextGuideSection({
  guides,
  loading = false,
  tone = "light",
  maxItems = 3,
  onExpandGuideMap,
}: GlobeContextGuideSectionProps) {
  const rows = guides.slice(0, maxItems);
  if (rows.length === 0 && !loading) {
    return null;
  }

  return (
    <section
      className={cn(
        "space-y-2 rounded-[1.35rem] border px-3 py-3",
        tone === "dark"
          ? "border-white/10 bg-white/5"
          : "border-border/50 bg-card/95",
      )}
      data-globe-context-guide-section
    >
      <div>
        <p
          className={cn(
            "text-[12px] font-semibold",
            tone === "dark" ? "text-[#8fd1ff]" : "text-primary",
          )}
        >
          {copy.globe.contextGuideEyebrow}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[14px] font-semibold",
            tone === "dark" ? "text-white" : "text-foreground",
          )}
        >
          {copy.globe.contextGuideTitle}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[12px] leading-relaxed",
            tone === "dark" ? "text-white/62" : "text-muted-foreground",
          )}
        >
          {loading && rows.length === 0
            ? copy.globe.contextGuideLoading
            : copy.globe.contextGuideBody}
        </p>
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((guide) => {
            const metaLine = pickGuideMetaLine(guide);
            const relatedVideos = guide.youtubeOfficial?.relatedSearchResults.slice(0, 2) ?? [];
            const thumbnail = pickGuideThumbnail(guide);

            return (
              <li key={guide.guideNodeId}>
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-[1.05rem] border px-3 py-3 active:scale-[0.99]",
                    tone === "dark"
                      ? "border-white/10 bg-[#0f172a]/58"
                      : "border-black/[0.06] bg-white",
                  )}
                  data-globe-context-guide={guide.guideNodeId}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-semibold",
                          tone === "dark"
                            ? "bg-white/10 text-white/74 ring-1 ring-white/10"
                            : "bg-[#f5f5f7] text-[#555] ring-1 ring-black/[0.05]",
                        )}
                      >
                        {guide.trustLabelKo}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-semibold",
                          tone === "dark"
                            ? "bg-[#0b2946] text-[#8fd1ff] ring-1 ring-[#3182f6]/20"
                            : "bg-[#eef5ff] text-[#1d4ed8] ring-1 ring-[#3182f6]/12",
                        )}
                      >
                        {guide.sourceLabelKo}
                      </span>
                      {guide.primaryMoment ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-semibold",
                            tone === "dark"
                              ? "bg-[#2d2316] text-[#ffd59a] ring-1 ring-[#f59e0b]/18"
                              : "bg-[#fff5e8] text-[#b45309] ring-1 ring-[#f59e0b]/12",
                          )}
                        >
                          {guide.primaryMoment.chipLabelKo}
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "mt-2 line-clamp-2 text-[13px] font-semibold leading-snug",
                        tone === "dark" ? "text-white" : "text-[#1d1d1f]",
                      )}
                    >
                      {guide.title}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[11px] leading-snug",
                        tone === "dark" ? "text-white/68" : "text-[#6e6e73]",
                      )}
                    >
                      {guide.whyRelevantKo}
                    </p>
                    {metaLine ? (
                      <p
                        className={cn(
                          "mt-1.5 text-[10px]",
                          tone === "dark" ? "text-white/48" : "text-[#8a8a8e]",
                        )}
                      >
                        {metaLine}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <a
                        href={guide.openUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] font-semibold",
                          tone === "dark" ? "text-white/82" : "text-[#1d1d1f]",
                        )}
                      >
                        {guide.sourceKind === "youtube" ? (
                          <Play className="size-3.5" aria-hidden />
                        ) : (
                          <ExternalLink className="size-3.5" aria-hidden />
                        )}
                        {openLabel(guide.sourceKind)}
                      </a>
                      {onExpandGuideMap && guide.inferredPlaceCandidates.length > 0 ? (
                        <>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
                              tone === "dark"
                                ? "bg-white/5 text-white/68 ring-white/10"
                                : "bg-[#f5f5f7] text-[#6e6e73] ring-black/[0.05]",
                            )}
                          >
                            {copy.globe.contextGuideCandidateCount(
                              guide.inferredPlaceCandidates.length,
                            )}
                          </span>
                          <GlobeMediaGuideMapExpandButton
                            variant="pill"
                            candidateCount={guide.inferredPlaceCandidates.length}
                            className={
                              tone === "dark"
                                ? "bg-white/10 text-white/82 ring-white/12"
                                : undefined
                            }
                            onClick={() => onExpandGuideMap(guide)}
                          />
                        </>
                      ) : null}
                    </div>

                    {relatedVideos.length > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        <p
                          className={cn(
                            "text-[10px] font-semibold uppercase tracking-[0.08em]",
                            tone === "dark" ? "text-white/48" : "text-[#8a8a8e]",
                          )}
                        >
                          {copy.globe.contextGuideRelatedTitle}
                        </p>
                        <div className="space-y-1.5">
                          {relatedVideos.map((result) => (
                            <a
                              key={`${guide.guideNodeId}:${result.videoId}`}
                              href={result.canonicalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "flex items-center gap-2 rounded-[0.85rem] border px-2.5 py-2",
                                tone === "dark"
                                  ? "border-white/8 bg-white/[0.04]"
                                  : "border-black/[0.05] bg-[#fafafc]",
                              )}
                            >
                              {result.thumbnailUrl ? (
                                <div
                                  className={cn(
                                    "relative h-11 w-11 shrink-0 overflow-hidden rounded-[0.7rem] border",
                                    tone === "dark"
                                      ? "border-white/8 bg-white/5"
                                      : "border-black/[0.05] bg-white",
                                  )}
                                >
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
                                <p
                                  className={cn(
                                    "truncate text-[11px] font-medium",
                                    tone === "dark" ? "text-white/84" : "text-[#1d1d1f]",
                                  )}
                                >
                                  {result.title || guide.title}
                                </p>
                                <p
                                  className={cn(
                                    "mt-0.5 truncate text-[10px]",
                                    tone === "dark" ? "text-white/48" : "text-[#8a8a8e]",
                                  )}
                                >
                                  {[result.channelTitle, formatPublishedAt(result.publishedAt)]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>
                              <ExternalLink
                                className={cn(
                                  "size-3.5 shrink-0",
                                  tone === "dark" ? "text-white/42" : "text-[#8a8a8e]",
                                )}
                                aria-hidden
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {thumbnail ? (
                    <div
                      className={cn(
                        "relative h-20 w-20 shrink-0 overflow-hidden rounded-[0.9rem] border",
                        tone === "dark"
                          ? "border-white/10 bg-white/5"
                          : "border-black/[0.06] bg-[#f5f5f7]",
                      )}
                    >
                      <img
                        src={thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {guide.sourceKind === "youtube" ? (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/18 text-white">
                          <Play className="size-5 fill-white/80" aria-hidden />
                        </span>
                      ) : null}
                      {onExpandGuideMap && guide.inferredPlaceCandidates.length > 0 ? (
                        <div className="absolute inset-x-1 bottom-1 z-[2]">
                          <GlobeMediaGuideMapExpandButton
                            variant="overlay"
                            candidateCount={guide.inferredPlaceCandidates.length}
                            onClick={() => onExpandGuideMap(guide)}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

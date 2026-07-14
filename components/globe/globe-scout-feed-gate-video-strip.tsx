"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import type { PlaceReviewVideo } from "@/lib/globe/place-review-video";
import type { ScoutFeedGateVideoContextWire } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { dispatchPlaceMapYoutubeOpen } from "@/lib/globe/place-map-youtube-bridge";
import { useAppLocale } from "@/hooks/use-copy";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeScoutFeedGateVideoStripProps = {
  videoContext: ScoutFeedGateVideoContextWire;
  className?: string;
};

function apiUrl(
  input: ScoutFeedGateVideoContextWire & { locale: string },
): string {
  const params = new URLSearchParams({ name: input.name });
  if (input.place.trim()) {
    params.set("place", input.place.trim());
  }
  params.set("kind", input.kind);
  params.set("lat", String(input.lat));
  params.set("lng", String(input.lng));
  if (input.locale.trim()) {
    params.set("locale", input.locale.trim());
  }
  return `/api/globe/place-review-video?${params.toString()}`;
}

function playOnMapOrInline(input: {
  video: PlaceReviewVideo;
  videoContext: ScoutFeedGateVideoContextWire;
  fallback: () => void;
}): void {
  const { video, videoContext, fallback } = input;
  if (
    Number.isFinite(videoContext.lat) &&
    Number.isFinite(videoContext.lng) &&
    video.embedUrl.trim()
  ) {
    dispatchPlaceMapYoutubeOpen({
      embedUrl: video.embedUrl,
      videoId: video.videoId,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      lat: videoContext.lat,
      lng: videoContext.lng,
      placeLabel: videoContext.name,
    });
    return;
  }
  fallback();
}

export function GlobeScoutFeedGateVideoStrip({
  videoContext,
  className,
}: GlobeScoutFeedGateVideoStripProps) {
  const locale = useAppLocale();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<readonly PlaceReviewVideo[]>([]);
  const [searchUrl, setSearchUrl] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlaceReviewVideo | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(apiUrl({ ...videoContext, locale }), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("failed");
        }
        const data = (await response.json()) as {
          videos?: PlaceReviewVideo[];
          searchUrl?: string;
        };
        if (!active) {
          return;
        }
        setVideos((data.videos ?? []).slice(0, 3));
        setSearchUrl(data.searchUrl?.trim() || null);
      } catch {
        if (active) {
          setVideos([]);
          setSearchUrl(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [videoContext, locale]);

  if (!loading && videos.length === 0 && !searchUrl) {
    return null;
  }

  return (
    <>
      <div className={cn("space-y-1.5", className)} data-globe-scout-feed-gate-videos>
        <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
          {copy.globe.scoutFeedGateVideosLabel}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading
            ? Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 w-24 shrink-0 animate-pulse rounded-xl bg-[#e8e8ed]"
                />
              ))
            : null}
          {!loading
            ? videos.map((video) => (
                <button
                  key={video.videoId}
                  type="button"
                  onClick={() =>
                    playOnMapOrInline({
                      video,
                      videoContext,
                      fallback: () => setPlayer(video),
                    })
                  }
                  className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[#e8e8ed] ring-1 ring-black/[0.06] active:scale-[0.98]"
                  aria-label={copy.globe.videoBranchPlayAria(video.title ?? "")}
                >
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="size-full object-cover"
                      draggable={false}
                    />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                    <span className="flex size-7 items-center justify-center rounded-full bg-white/95 text-[#0071e3] shadow-sm">
                      <Play className="size-3.5 fill-[#0071e3]" aria-hidden />
                    </span>
                  </span>
                </button>
              ))
            : null}
          {!loading && searchUrl ? (
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-[#0071e3] ring-1 ring-[#0071e3]/20 active:scale-[0.98]"
            >
              <Play className="size-4 fill-[#0071e3]" aria-hidden />
              <span className="mt-0.5 text-[9px] font-semibold">
                {copy.globe.videoBranchMore}
              </span>
            </a>
          ) : null}
        </div>
      </div>

      {player ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[10080] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPlayer(null)}
        >
          <div
            className="relative w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="aspect-video w-full bg-black">
              <iframe
                key={player.videoId}
                src={`${player.embedUrl}?autoplay=1&rel=0`}
                title={player.title ?? "video"}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {player.title ? (
              <div className="px-3 py-2.5">
                <p className="line-clamp-2 text-[13px] font-medium text-[#1d1d1f]">
                  {player.title}
                </p>
                {player.channelTitle ? (
                  <p className="mt-0.5 text-[11px] text-[#86868b]">
                    {player.channelTitle}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

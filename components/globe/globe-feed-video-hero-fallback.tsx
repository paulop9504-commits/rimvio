"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import type { ScoutFeedGateVideoContextWire } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import type { PlaceReviewVideo } from "@/lib/globe/place-review-video";
import { useAppLocale } from "@/hooks/use-copy";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeFeedVideoHeroFallbackProps = {
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

/** Photo-empty feed cards — fill the hero with a place YouTube clip when available. */
export function GlobeFeedVideoHeroFallback({
  videoContext,
  className,
}: GlobeFeedVideoHeroFallbackProps) {
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

  const primary = videos[0] ?? null;

  return (
    <>
      <div
        className={cn(
          "relative aspect-[4/5] w-full overflow-hidden bg-[#1d1d1f]",
          className,
        )}
        data-globe-infinite-feed-video-hero
      >
        {loading ? (
          <div className="absolute inset-0 animate-pulse bg-[#e8e8ed]" />
        ) : null}

        {!loading && primary?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primary.thumbnailUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
        ) : null}

        {!loading && !primary && searchUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#f5f5f7] px-6 text-center">
            <p className="text-[13px] font-semibold text-[#1d1d1f]">
              {copy.globe.intelligentPinVideoHeroHint}
            </p>
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0071e3] px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm active:scale-[0.98]"
            >
              <Play className="size-3.5 fill-white" aria-hidden />
              {copy.globe.videoBranchMore}
            </a>
          </div>
        ) : null}

        {!loading && !primary && !searchUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7] text-[12px] text-[#86868b]">
            {copy.globe.intelligentPinSwipePhotos}
          </div>
        ) : null}

        {primary ? (
          <button
            type="button"
            onClick={() => setPlayer(primary)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25 active:bg-black/35"
            aria-label={copy.globe.videoBranchPlayAria(primary.title ?? videoContext.name)}
            data-globe-infinite-feed-video-hero-play
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-white/95 text-[#0071e3] shadow-lg">
              <Play className="size-6 fill-[#0071e3]" aria-hidden />
            </span>
            <span className="max-w-[85%] truncate rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              {copy.globe.intelligentPinVideoHeroHint}
            </span>
          </button>
        ) : null}
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
                title={player.title ?? videoContext.name}
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

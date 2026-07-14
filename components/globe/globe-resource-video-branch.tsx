"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import type { PlaceReviewKind, PlaceReviewVideo } from "@/lib/globe/place-review-video";
import { dispatchPlaceMapYoutubeOpen } from "@/lib/globe/place-map-youtube-bridge";
import { useAppLocale } from "@/hooks/use-copy";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const NODE_X = 82;
const NODE_GAP = 74;
const NODE_SIZE = 60;
const ORIGIN_Y_PAD = 6;

type BranchNode =
  | { kind: "video"; video: PlaceReviewVideo }
  | { kind: "search"; searchUrl: string };

export type GlobeResourceVideoBranchProps = {
  name: string;
  place?: string | null;
  kind?: PlaceReviewKind;
  lat?: number | null;
  lng?: number | null;
  className?: string;
};

function apiUrl(
  input: GlobeResourceVideoBranchProps & { locale: string },
): string {
  const params = new URLSearchParams({ name: input.name });
  if (input.place?.trim()) {
    params.set("place", input.place.trim());
  }
  if (input.kind) {
    params.set("kind", input.kind);
  }
  if (input.lat != null && Number.isFinite(input.lat)) {
    params.set("lat", String(input.lat));
  }
  if (input.lng != null && Number.isFinite(input.lng)) {
    params.set("lng", String(input.lng));
  }
  if (input.locale.trim()) {
    params.set("locale", input.locale.trim());
  }
  return `/api/globe/place-review-video?${params.toString()}`;
}

export function GlobeResourceVideoBranch(props: GlobeResourceVideoBranchProps) {
  const { name, place = null, kind, lat = null, lng = null, className } = props;
  const locale = useAppLocale();
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<BranchNode[]>([]);
  const [player, setPlayer] = useState<PlaceReviewVideo | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNodes([]);
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(apiUrl({ ...props, locale }), {
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
        const videoNodes: BranchNode[] = (data.videos ?? []).map((video) => ({
          kind: "video",
          video,
        }));
        const searchUrl = data.searchUrl?.trim();
        const next =
          videoNodes.length > 0
            ? videoNodes
            : searchUrl
              ? [{ kind: "search", searchUrl } as BranchNode]
              : [];
        setNodes(next);
      } catch {
        if (active) {
          setNodes([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, place, kind, lat, lng, locale]);

  const count = loading ? 2 : nodes.length;
  if (count === 0) {
    return null;
  }

  const spanH = (count - 1) * NODE_GAP + NODE_SIZE + ORIGIN_Y_PAD * 2;
  const originY = spanH / 2;
  const nodeCenterY = (index: number) =>
    ORIGIN_Y_PAD + NODE_SIZE / 2 + index * NODE_GAP;

  return (
    <>
      <div
        className={cn("pointer-events-none relative", className)}
        style={{ width: NODE_X + NODE_SIZE + 16, height: spanH }}
        data-globe-resource-video-branch
      >
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          {Array.from({ length: count }).map((_, index) => (
            <path
              key={index}
              d={`M 0 ${originY} C ${NODE_X * 0.5} ${originY}, ${NODE_X * 0.5} ${nodeCenterY(index)}, ${NODE_X} ${nodeCenterY(index)}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={loading ? 0.4 : 0.9}
            />
          ))}
        </svg>

        {loading
          ? Array.from({ length: count }).map((_, index) => (
              <div
                key={index}
                className="absolute animate-pulse rounded-2xl bg-white/70 ring-1 ring-black/[0.06]"
                style={{
                  left: NODE_X,
                  top: nodeCenterY(index) - NODE_SIZE / 2,
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                }}
              />
            ))
          : nodes.map((node, index) => {
              const top = nodeCenterY(index) - NODE_SIZE / 2;
              if (node.kind === "search") {
                return (
                  <a
                    key="search"
                    href={node.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto absolute flex flex-col items-center justify-center rounded-2xl bg-white text-[#ef4444] shadow-[0_6px_18px_rgba(0,0,0,0.16)] ring-2 ring-[#ef4444] active:scale-95"
                    style={{ left: NODE_X, top, width: NODE_SIZE, height: NODE_SIZE }}
                    aria-label={copy.globe.videoBranchSearchNode}
                  >
                    <Play className="size-5 fill-[#ef4444]" aria-hidden />
                    <span className="mt-0.5 text-[9px] font-semibold leading-none">
                      {copy.globe.videoBranchMore}
                    </span>
                  </a>
                );
              }
              const { video } = node;
              return (
                <button
                  key={video.videoId}
                  type="button"
                  onClick={() => {
                    if (
                      lat != null &&
                      lng != null &&
                      Number.isFinite(lat) &&
                      Number.isFinite(lng) &&
                      video.embedUrl.trim()
                    ) {
                      dispatchPlaceMapYoutubeOpen({
                        embedUrl: video.embedUrl,
                        videoId: video.videoId,
                        title: video.title,
                        channelTitle: video.channelTitle,
                        thumbnailUrl: video.thumbnailUrl,
                        lat,
                        lng,
                        placeLabel: name,
                      });
                      return;
                    }
                    setPlayer(video);
                  }}
                  className="pointer-events-auto absolute overflow-hidden rounded-2xl bg-black shadow-[0_6px_18px_rgba(0,0,0,0.18)] ring-2 ring-[#ef4444] active:scale-95"
                  style={{ left: NODE_X, top, width: NODE_SIZE, height: NODE_SIZE }}
                  aria-label={copy.globe.videoBranchPlayAria(video.title ?? "")}
                >
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="size-full object-cover opacity-90"
                      draggable={false}
                    />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#ef4444] text-white shadow-md">
                      <Play className="size-3.5 fill-white" aria-hidden />
                    </span>
                  </span>
                </button>
              );
            })}
      </div>

      {player ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPlayer(null)}
        >
          <div
            className="relative w-full max-w-[520px] overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPlayer(null)}
              className="absolute right-2 top-2 z-[2] flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md active:scale-95"
              aria-label={copy.globe.resourceReelCloseAria}
            >
              <X className="size-4" aria-hidden />
            </button>
            <div className="aspect-video w-full">
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
              <div className="px-3 py-2">
                <p className="line-clamp-2 text-[13px] font-medium text-white">
                  {player.title}
                </p>
                {player.channelTitle ? (
                  <p className="mt-0.5 text-[11px] text-white/60">
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

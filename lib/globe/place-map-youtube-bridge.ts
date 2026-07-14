/**
 * Discovery / place review video → play YouTube anchored on the globe pin.
 */

export const PLACE_MAP_YOUTUBE_OPEN = "rimvio:place-map-youtube-open";
export const PLACE_MAP_YOUTUBE_CLOSE = "rimvio:place-map-youtube-close";

export type PlaceMapYoutubePlayback = {
  readonly embedUrl: string;
  readonly videoId: string;
  readonly title: string | null;
  readonly channelTitle?: string | null;
  readonly thumbnailUrl?: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly placeLabel?: string | null;
};

export function isPlaceMapYoutubePlayback(
  value: unknown,
): value is PlaceMapYoutubePlayback {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as PlaceMapYoutubePlayback;
  return (
    typeof row.embedUrl === "string" &&
    row.embedUrl.trim().length > 0 &&
    typeof row.videoId === "string" &&
    row.videoId.trim().length > 0 &&
    typeof row.lat === "number" &&
    Number.isFinite(row.lat) &&
    typeof row.lng === "number" &&
    Number.isFinite(row.lng)
  );
}

export function dispatchPlaceMapYoutubeOpen(
  detail: PlaceMapYoutubePlayback,
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!isPlaceMapYoutubePlayback(detail)) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<PlaceMapYoutubePlayback>(PLACE_MAP_YOUTUBE_OPEN, {
      detail: {
        ...detail,
        embedUrl: detail.embedUrl.trim(),
        videoId: detail.videoId.trim(),
        title: detail.title?.trim() || null,
        channelTitle: detail.channelTitle?.trim() || null,
        thumbnailUrl: detail.thumbnailUrl?.trim() || null,
        placeLabel: detail.placeLabel?.trim() || null,
      },
    }),
  );
}

export function dispatchPlaceMapYoutubeClose(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(PLACE_MAP_YOUTUBE_CLOSE));
}

export function subscribePlaceMapYoutubeOpen(
  listener: (detail: PlaceMapYoutubePlayback) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<PlaceMapYoutubePlayback>).detail;
    if (isPlaceMapYoutubePlayback(detail)) {
      listener(detail);
    }
  };
  window.addEventListener(PLACE_MAP_YOUTUBE_OPEN, handler);
  return () => window.removeEventListener(PLACE_MAP_YOUTUBE_OPEN, handler);
}

export function subscribePlaceMapYoutubeClose(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(PLACE_MAP_YOUTUBE_CLOSE, listener);
  return () => window.removeEventListener(PLACE_MAP_YOUTUBE_CLOSE, listener);
}

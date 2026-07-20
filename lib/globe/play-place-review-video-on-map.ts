import type { PlaceReviewVideo } from "@/lib/globe/place-review-video";
import { dispatchPlaceMapYoutubeOpen } from "@/lib/globe/place-map-youtube-bridge";
import { resolveVideoMapAnchor } from "@/lib/globe/resolve-video-map-anchor";

/** Shared entry — any domain place clip opens pin-anchored on the globe. */
export function playPlaceReviewVideoOnMap(input: {
  video: Pick<
    PlaceReviewVideo,
    "embedUrl" | "videoId" | "title" | "channelTitle" | "thumbnailUrl"
  >;
  lat: number | null | undefined;
  lng: number | null | undefined;
  placeLabel?: string | null;
}): boolean {
  const anchor = resolveVideoMapAnchor({
    title: input.video.title,
    placeLabel: input.placeLabel,
    lat: input.lat,
    lng: input.lng,
  });
  const embedUrl = input.video.embedUrl?.trim() ?? "";
  const videoId = input.video.videoId?.trim() ?? "";
  if (!anchor || !embedUrl || !videoId) {
    return false;
  }
  dispatchPlaceMapYoutubeOpen({
    embedUrl,
    videoId,
    title: input.video.title ?? null,
    channelTitle: input.video.channelTitle ?? null,
    thumbnailUrl: input.video.thumbnailUrl ?? null,
    lat: anchor.lat,
    lng: anchor.lng,
    placeLabel: input.placeLabel ?? anchor.placeLabel,
  });
  return true;
}

import type { PlaceReviewVideo } from "@/lib/globe/place-review-video";
import { dispatchPlaceMapYoutubeOpen } from "@/lib/globe/place-map-youtube-bridge";

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
  const lat = input.lat;
  const lng = input.lng;
  const embedUrl = input.video.embedUrl?.trim() ?? "";
  const videoId = input.video.videoId?.trim() ?? "";
  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !embedUrl ||
    !videoId
  ) {
    return false;
  }
  dispatchPlaceMapYoutubeOpen({
    embedUrl,
    videoId,
    title: input.video.title ?? null,
    channelTitle: input.video.channelTitle ?? null,
    thumbnailUrl: input.video.thumbnailUrl ?? null,
    lat,
    lng,
    placeLabel: input.placeLabel ?? null,
  });
  return true;
}

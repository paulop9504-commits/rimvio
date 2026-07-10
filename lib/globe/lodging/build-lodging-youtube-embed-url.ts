import {
  LODGING_YOUTUBE_CLIP_MAX_SECONDS,
  LODGING_YOUTUBE_SHORTS_MAX_SECONDS,
} from "@/lib/globe/lodging/lodging-youtube-preview-types";

export function isLodgingYouTubeShort(durationSeconds: number | null | undefined): boolean {
  return (
    durationSeconds != null &&
    durationSeconds > 0 &&
    durationSeconds <= LODGING_YOUTUBE_SHORTS_MAX_SECONDS
  );
}

export function buildLodgingYouTubeEmbedUrl(input: {
  videoId: string;
  durationSeconds: number | null;
}): {
  embedUrl: string;
  startSec: number;
  endSec: number | null;
  isShort: boolean;
} {
  const videoId = input.videoId.trim();
  const isShort = isLodgingYouTubeShort(input.durationSeconds);

  if (isShort) {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "0",
      playsinline: "1",
      modestbranding: "1",
      rel: "0",
      loop: "1",
      playlist: videoId,
    });
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`,
      startSec: 0,
      endSec: input.durationSeconds,
      isShort: true,
    };
  }

  const endSec = Math.min(
    input.durationSeconds ?? LODGING_YOUTUBE_CLIP_MAX_SECONDS,
    LODGING_YOUTUBE_CLIP_MAX_SECONDS,
  );
  const params = new URLSearchParams({
    start: "0",
    end: String(Math.max(1, endSec)),
    autoplay: "1",
    mute: "1",
    controls: "0",
    playsinline: "1",
    modestbranding: "1",
    rel: "0",
  });

  return {
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`,
    startSec: 0,
    endSec,
    isShort: false,
  };
}

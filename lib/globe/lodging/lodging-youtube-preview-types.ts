/** Gated YouTube preview for lodging hero — Shorts or short embed segment only. */
export type LodgingYouTubePreview = {
  videoId: string;
  title: string | null;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string | null;
  confidence: number;
  isShort: boolean;
  startSec: number;
  endSec: number | null;
  durationSeconds: number | null;
};

export const LODGING_YOUTUBE_CONFIDENCE_GATE = 0.95;

export const LODGING_YOUTUBE_SHORTS_MAX_SECONDS = 60;

export const LODGING_YOUTUBE_CLIP_MAX_SECONDS = 12;

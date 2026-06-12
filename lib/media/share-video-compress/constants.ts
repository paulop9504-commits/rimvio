/** Skip re-encode when already small MP4. */
export const SHARE_VIDEO_SKIP_BELOW_BYTES = 4 * 1024 * 1024;

/** Target output size for bridge / globe share uploads. */
export const SHARE_VIDEO_TARGET_MAX_BYTES = 12 * 1024 * 1024;

export const SHARE_VIDEO_MAX_WIDTH = 1280;
export const SHARE_VIDEO_MAX_HEIGHT = 720;

export const FFMPEG_CORE_CDN_VERSION = "0.12.6";

export const SHARE_VIDEO_CRF_STEPS = [28, 32, 35] as const;

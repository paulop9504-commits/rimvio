/** Caption placeholder when message is image-only (DB body NOT NULL). */
export const PEER_MESSAGE_IMAGE_PLACEHOLDER = "사진";

/** Caption placeholder when message is video-only. */
export const PEER_MESSAGE_VIDEO_PLACEHOLDER = "동영상";

export const PEER_CHAT_IMAGE_BUCKET = "peer-chat";

export const PEER_CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Client may compress before upload — server accepts trimmed mp4 up to bridge ceiling. */
export const PEER_CHAT_VIDEO_MAX_BYTES = 80 * 1024 * 1024;

export const PEER_CHAT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const PEER_CHAT_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/3gpp",
  "video/3gpp2",
]);

export const PEER_CHAT_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,video/3gpp,video/3gpp2";

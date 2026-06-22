import { isGlobeContextIngestMediaFile } from "@/lib/feed/ingest-globe-context-media";
import { isConstrainedMobileDevice } from "@/lib/platform/device";

const MAX_MOBILE_PICK_COUNT = 24;
const MAX_MOBILE_PHOTO_BYTES = 48 * 1024 * 1024;
const MAX_MOBILE_VIDEO_BYTES = 120 * 1024 * 1024;

export type IngestMediaValidationResult =
  | { ok: true; files: File[] }
  | { ok: false; message: string };

/** Client-side guard — size, count, MIME before heavy EXIF/ffmpeg work. */
export function validateIngestMediaFiles(
  files: readonly File[],
): IngestMediaValidationResult {
  const media = files.filter(isGlobeContextIngestMediaFile);
  if (media.length === 0) {
    return { ok: false, message: "올릴 수 있는 사진·동영상이 없어요" };
  }

  if (isConstrainedMobileDevice() && media.length > MAX_MOBILE_PICK_COUNT) {
    return {
      ok: false,
      message: `한 번에 ${MAX_MOBILE_PICK_COUNT}개까지 선택할 수 있어요`,
    };
  }

  if (isConstrainedMobileDevice()) {
    for (const file of media) {
      if (file.type.startsWith("video/") && file.size > MAX_MOBILE_VIDEO_BYTES) {
        return {
          ok: false,
          message: "동영상이 너무 커요 · 2분 이하·Wi-Fi에서 다시 시도해 주세요",
        };
      }
      if (file.type.startsWith("image/") && file.size > MAX_MOBILE_PHOTO_BYTES) {
        return {
          ok: false,
          message: "사진이 너무 커요 · 앨범에서 더 작은 사진을 골라 주세요",
        };
      }
    }
  }

  return { ok: true, files: [...media] };
}

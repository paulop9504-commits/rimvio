"use client";

import {
  BRIDGE_VIDEO_MAX_BYTES,
  formatBridgeMediaMaxMb,
} from "@/lib/experience-bridge/bridge-media-constants";
import { compressShareVideoFile } from "@/lib/media/share-video-compress/compress-share-video-file";
import { SHARE_VIDEO_MAX_DURATION_SEC } from "@/lib/media/share-video-compress/constants";
import { readVideoDurationSec } from "@/lib/media/share-video-compress/read-video-duration-sec";
import { shouldCompressShareVideo } from "@/lib/media/share-video-compress/should-compress-share-video";
import { isConstrainedMobileDevice } from "@/lib/platform/device";

export type ShareVideoPrepareProgress = {
  phase: "loading" | "compressing";
  ratio?: number;
};

export async function prepareShareVideoFile(input: {
  file: File;
  onProgress?: (progress: ShareVideoPrepareProgress) => void;
  maxDurationSec?: number;
  maxBytes?: number;
  targetMaxBytes?: number;
}): Promise<File> {
  const durationCap = input.maxDurationSec ?? SHARE_VIDEO_MAX_DURATION_SEC;
  const maxBytes = input.maxBytes ?? BRIDGE_VIDEO_MAX_BYTES;
  const durationSec = await readVideoDurationSec(input.file);
  const needsDurationTrim =
    durationSec != null && durationSec > durationCap + 0.5;

  if (
    !shouldCompressShareVideo({
      file: input.file,
      sizeBytes: input.file.size,
      durationSec,
      maxDurationSec: durationCap,
    })
  ) {
    return input.file;
  }

  if (typeof window === "undefined") {
    return input.file;
  }

  if (isConstrainedMobileDevice()) {
    if (input.file.size > maxBytes) {
      throw new Error(
        `${formatBridgeMediaMaxMb(maxBytes)} 이하·${durationCap}초 이내 동영상을 선택해 주세요.`,
      );
    }
    return input.file;
  }

  try {
    input.onProgress?.({ phase: "loading" });
    const compressed = await compressShareVideoFile(input.file, {
      onProgress: (ratio) => {
        input.onProgress?.({ phase: "compressing", ratio });
      },
      maxDurationSec: durationCap,
      targetMaxBytes: input.targetMaxBytes,
    });

    if (
      compressed.size < input.file.size ||
      input.file.type.trim().toLowerCase() !== "video/mp4" ||
      needsDurationTrim
    ) {
      return compressed;
    }

    return input.file;
  } catch (caught) {
    if (input.file.size > maxBytes) {
      const message =
        caught instanceof Error
          ? caught.message
          : "동영상 압축에 실패했어요.";
      throw new Error(
        `${message} ${formatBridgeMediaMaxMb(maxBytes)} 이하·${durationCap}초 이내 동영상을 선택하거나 Wi-Fi에서 다시 시도해 주세요.`,
      );
    }
    console.warn("[share-video-compress] fallback to original", caught);
    return input.file;
  }
}

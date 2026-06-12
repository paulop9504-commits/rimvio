"use client";

import { BRIDGE_VIDEO_MAX_BYTES } from "@/lib/experience-bridge/bridge-media-constants";
import { compressShareVideoFile } from "@/lib/media/share-video-compress/compress-share-video-file";
import { shouldCompressShareVideo } from "@/lib/media/share-video-compress/should-compress-share-video";

export type ShareVideoPrepareProgress = {
  phase: "loading" | "compressing";
  ratio?: number;
};

export async function prepareShareVideoFile(input: {
  file: File;
  onProgress?: (progress: ShareVideoPrepareProgress) => void;
}): Promise<File> {
  if (!shouldCompressShareVideo({ file: input.file, sizeBytes: input.file.size })) {
    return input.file;
  }

  if (typeof window === "undefined") {
    return input.file;
  }

  try {
    input.onProgress?.({ phase: "loading" });
    const compressed = await compressShareVideoFile(input.file, {
      onProgress: (ratio) => {
        input.onProgress?.({ phase: "compressing", ratio });
      },
    });

    if (
      compressed.size < input.file.size ||
      input.file.type.trim().toLowerCase() !== "video/mp4"
    ) {
      return compressed;
    }

    return input.file;
  } catch (caught) {
    if (input.file.size > BRIDGE_VIDEO_MAX_BYTES) {
      const message =
        caught instanceof Error
          ? caught.message
          : "동영상 압축에 실패했어요.";
      throw new Error(
        `${message} 더 짧은 동영상을 선택하거나 Wi-Fi에서 다시 시도해 주세요.`,
      );
    }
    console.warn("[share-video-compress] fallback to original", caught);
    return input.file;
  }
}

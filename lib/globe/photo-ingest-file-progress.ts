import { isConstrainedMobileDevice } from "@/lib/platform/device";

export type PhotoIngestFileStatus =
  | "queued"
  | "reading"
  | "ready"
  | "committing"
  | "done"
  | "error";

export type PhotoIngestFileItem = {
  key: string;
  fileName: string;
  previewUrl: string | null;
  isVideo: boolean;
  status: PhotoIngestFileStatus;
  detail?: string;
};

function inferIsVideo(file: File): boolean {
  if (file.type.startsWith("video/")) {
    return true;
  }
  return /\.(mp4|mov|m4v|webm|mkv|avi|3gp|3g2|qt|mpeg|mpg)$/iu.test(
    file.name.trim().toLowerCase(),
  );
}

export function buildPhotoIngestFileItems(files: readonly File[]): PhotoIngestFileItem[] {
  const allowPreview = !isConstrainedMobileDevice();
  return files.map((file, index) => {
    const isVideo = inferIsVideo(file);
    const canPreview =
      allowPreview && (file.type.startsWith("image/") || isVideo);
    return {
      key: `${file.name}:${file.size}:${file.lastModified}:${index}`,
      fileName: file.name.trim() || (isVideo ? `동영상 ${index + 1}` : `사진 ${index + 1}`),
      previewUrl: canPreview ? URL.createObjectURL(file) : null,
      isVideo,
      status: "queued" as const,
    };
  });
}

export function revokePhotoIngestPreviewUrls(
  items: readonly PhotoIngestFileItem[],
): void {
  for (const item of items) {
    if (item.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
}

export function patchPhotoIngestFileItem(
  items: readonly PhotoIngestFileItem[],
  index: number,
  patch: Partial<PhotoIngestFileItem>,
): PhotoIngestFileItem[] {
  return items.map((row, rowIndex) =>
    rowIndex === index ? { ...row, ...patch } : row,
  );
}

export function markPhotoIngestCommitProgress(
  items: readonly PhotoIngestFileItem[],
  done: number,
  total: number,
): PhotoIngestFileItem[] {
  return items.map((row, index) => {
    if (row.status === "error") {
      return row;
    }
    if (index < done) {
      return { ...row, status: "done", detail: undefined };
    }
    if (index === done && done < total) {
      return { ...row, status: "committing", detail: undefined };
    }
    if (row.status === "done") {
      return row;
    }
    return row;
  });
}

export function markPhotoIngestFileCommitting(
  items: readonly PhotoIngestFileItem[],
  fileIndex: number,
): PhotoIngestFileItem[] {
  return items.map((row, index) =>
    index === fileIndex && row.status !== "error"
      ? { ...row, status: "committing", detail: undefined }
      : row,
  );
}

export function markPhotoIngestFileDone(
  items: readonly PhotoIngestFileItem[],
  fileIndex: number,
): PhotoIngestFileItem[] {
  return items.map((row, index) =>
    index === fileIndex ? { ...row, status: "done", detail: undefined } : row,
  );
}

export function markPhotoIngestFileError(
  items: readonly PhotoIngestFileItem[],
  fileIndex: number,
  detail: string,
): PhotoIngestFileItem[] {
  return items.map((row, index) =>
    index === fileIndex ? { ...row, status: "error", detail } : row,
  );
}

export function summarizePhotoIngestProgress(items: readonly PhotoIngestFileItem[]): {
  done: number;
  failed: number;
  active: number;
  total: number;
  percent: number;
} {
  const total = items.length;
  const done = items.filter((row) => row.status === "done").length;
  const failed = items.filter((row) => row.status === "error").length;
  const active = items.filter(
    (row) => row.status === "reading" || row.status === "committing",
  ).length;
  const percent = total <= 0 ? 0 : Math.round(((done + failed) / total) * 100);
  return { done, failed, active, total, percent };
}

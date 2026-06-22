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
  status: PhotoIngestFileStatus;
  detail?: string;
};

export function buildPhotoIngestFileItems(files: readonly File[]): PhotoIngestFileItem[] {
  const allowPreview = !isConstrainedMobileDevice();
  return files.map((file, index) => ({
    key: `${file.name}:${file.size}:${file.lastModified}:${index}`,
    fileName: file.name.trim() || `사진 ${index + 1}`,
    previewUrl:
      allowPreview && file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    status: "queued" as const,
  }));
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
    if (index < done) {
      return { ...row, status: "done" };
    }
    if (index === done && done < total) {
      return { ...row, status: "committing" };
    }
    if (row.status === "done") {
      return row;
    }
    return { ...row, status: index < done ? "done" : row.status };
  });
}

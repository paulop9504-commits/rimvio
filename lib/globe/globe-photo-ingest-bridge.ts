"use client";

import { isGlobeHomePath as resolveGlobeHomePath } from "@/lib/surface-registry";

export const GLOBE_PHOTO_INGEST_REQUEST = "rimvio-globe-photo-ingest-request";

export type GlobePhotoIngestRequestDetail = {
  files: File[];
};

let pendingGlobePhotoIngest: File[] | null = null;

/** Bottom-nav capture → globe home photo walkthrough. */
export function requestGlobePhotoIngest(files: readonly File[]): void {
  if (typeof window === "undefined" || files.length === 0) {
    return;
  }
  pendingGlobePhotoIngest = [...files];
  window.dispatchEvent(
    new CustomEvent<GlobePhotoIngestRequestDetail>(GLOBE_PHOTO_INGEST_REQUEST, {
      detail: { files: pendingGlobePhotoIngest },
    }),
  );
}

export function subscribeGlobePhotoIngest(
  handler: (files: File[]) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<GlobePhotoIngestRequestDetail>).detail;
    const files = detail?.files ?? [];
    if (files.length > 0) {
      pendingGlobePhotoIngest = null;
      handler(files);
    }
  };
  window.addEventListener(GLOBE_PHOTO_INGEST_REQUEST, listener);

  if (pendingGlobePhotoIngest?.length) {
    const queued = pendingGlobePhotoIngest;
    pendingGlobePhotoIngest = null;
    queueMicrotask(() => handler(queued));
  }

  return () => window.removeEventListener(GLOBE_PHOTO_INGEST_REQUEST, listener);
}

export function isGlobeHomePath(pathname: string): boolean {
  return resolveGlobeHomePath(pathname);
}

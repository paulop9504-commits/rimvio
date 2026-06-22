"use client";

export const GLOBE_PHOTO_INGEST_REQUEST = "rimvio-globe-photo-ingest-request";

export type GlobePhotoIngestRequestDetail = {
  files: File[];
};

/** Bottom-nav capture → globe home photo walkthrough. */
export function requestGlobePhotoIngest(files: readonly File[]): void {
  if (typeof window === "undefined" || files.length === 0) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobePhotoIngestRequestDetail>(GLOBE_PHOTO_INGEST_REQUEST, {
      detail: { files: [...files] },
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
      handler(files);
    }
  };
  window.addEventListener(GLOBE_PHOTO_INGEST_REQUEST, listener);
  return () => window.removeEventListener(GLOBE_PHOTO_INGEST_REQUEST, listener);
}

export function isGlobeHomePath(pathname: string): boolean {
  const path = pathname.trim() || "/";
  return path === "/" || path.startsWith("/globe");
}

import { isConstrainedMobileDevice } from "@/lib/platform/device";

/** Per-pick album limit — Kakao-class multi-select on mobile. */
export const GLOBE_MEDIA_PICK_MAX_MOBILE = 50;
export const GLOBE_MEDIA_PICK_MAX_DESKTOP = 200;

export const GLOBE_MEDIA_PEEK_CONCURRENCY_MOBILE = 3;
export const GLOBE_MEDIA_PEEK_CONCURRENCY_DESKTOP = 6;

/** Independent spacetime clusters can commit in parallel. */
export const GLOBE_MEDIA_CLUSTER_COMMIT_CONCURRENCY_MOBILE = 1;
export const GLOBE_MEDIA_CLUSTER_COMMIT_CONCURRENCY_DESKTOP = 3;

/** Same-context force attach — files do not chain event ids. */
export const GLOBE_MEDIA_FORCE_ATTACH_CONCURRENCY_MOBILE = 2;
export const GLOBE_MEDIA_FORCE_ATTACH_CONCURRENCY_DESKTOP = 4;

export function resolveGlobeMediaPickMax(): number {
  return isConstrainedMobileDevice()
    ? GLOBE_MEDIA_PICK_MAX_MOBILE
    : GLOBE_MEDIA_PICK_MAX_DESKTOP;
}

export function resolveGlobeMediaPeekConcurrency(): number {
  return isConstrainedMobileDevice()
    ? GLOBE_MEDIA_PEEK_CONCURRENCY_MOBILE
    : GLOBE_MEDIA_PEEK_CONCURRENCY_DESKTOP;
}

export function resolveGlobeMediaClusterCommitConcurrency(): number {
  return isConstrainedMobileDevice()
    ? GLOBE_MEDIA_CLUSTER_COMMIT_CONCURRENCY_MOBILE
    : GLOBE_MEDIA_CLUSTER_COMMIT_CONCURRENCY_DESKTOP;
}

export function resolveGlobeMediaForceAttachConcurrency(): number {
  return isConstrainedMobileDevice()
    ? GLOBE_MEDIA_FORCE_ATTACH_CONCURRENCY_MOBILE
    : GLOBE_MEDIA_FORCE_ATTACH_CONCURRENCY_DESKTOP;
}

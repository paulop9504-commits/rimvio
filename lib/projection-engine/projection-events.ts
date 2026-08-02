/**
 * Projection Event bus — Globe / Workspace UI subscribe here.
 */

import type { ProjectionEvent } from "@/lib/projection-engine/projection-types";

export const REALITY_PROJECTION_EVENT =
  "rimvio:reality-projection-event" as const;

export const REALITY_PROJECTION_REFRESH =
  "rimvio:reality-projection-refresh" as const;

export type RealityProjectionRefreshDetail = {
  readonly workspaceId: string;
  readonly eventIds: readonly string[];
  readonly atIso: string;
  readonly draftOnly: true;
};

export function dispatchProjectionEvent(event: ProjectionEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REALITY_PROJECTION_EVENT, { detail: event }),
  );
}

export function dispatchProjectionRefresh(
  detail: RealityProjectionRefreshDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REALITY_PROJECTION_REFRESH, { detail }),
  );
}

export function subscribeProjectionEvents(
  listener: (event: ProjectionEvent) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<ProjectionEvent>).detail;
    if (detail?.draftOnly && detail.workspaceId) {
      listener(detail);
    }
  };
  window.addEventListener(REALITY_PROJECTION_EVENT, handler);
  return () => window.removeEventListener(REALITY_PROJECTION_EVENT, handler);
}

export function subscribeProjectionRefresh(
  listener: (detail: RealityProjectionRefreshDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<RealityProjectionRefreshDetail>).detail;
    if (detail?.draftOnly && detail.workspaceId) {
      listener(detail);
    }
  };
  window.addEventListener(REALITY_PROJECTION_REFRESH, handler);
  return () => window.removeEventListener(REALITY_PROJECTION_REFRESH, handler);
}

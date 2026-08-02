/**
 * Projection / Draft events — Globe reads Workspace Projection only.
 */

import type {
  WorkspaceDraftEventDetail,
  WorkspaceProjectionUpdateDetail,
} from "@/lib/workspace-command/types";

/** @deprecated prefer WORKSPACE_DRAFT_* — kept for listeners */
export const WORKSPACE_PROJECTION_UPDATED =
  "rimvio:workspace-projection-updated" as const;

export const WORKSPACE_DRAFT_CREATED =
  "rimvio:workspace-draft-created" as const;
export const WORKSPACE_DRAFT_UPDATED =
  "rimvio:workspace-draft-updated" as const;
export const WORKSPACE_DRAFT_APPLIED =
  "rimvio:workspace-draft-applied" as const;

export function dispatchWorkspaceProjectionUpdate(
  detail: WorkspaceProjectionUpdateDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_PROJECTION_UPDATED, { detail }),
  );
}

export function dispatchWorkspaceDraftEvent(
  name:
    | typeof WORKSPACE_DRAFT_CREATED
    | typeof WORKSPACE_DRAFT_UPDATED
    | typeof WORKSPACE_DRAFT_APPLIED,
  detail: WorkspaceDraftEventDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function subscribeWorkspaceProjectionUpdated(
  listener: (detail: WorkspaceProjectionUpdateDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceProjectionUpdateDetail>)
      .detail;
    if (detail?.draftOnly && detail.workspaceId) {
      listener(detail);
    }
  };
  window.addEventListener(WORKSPACE_PROJECTION_UPDATED, handler);
  return () =>
    window.removeEventListener(WORKSPACE_PROJECTION_UPDATED, handler);
}

export function subscribeWorkspaceDraftEvents(
  listener: (detail: WorkspaceDraftEventDetail & { event: string }) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceDraftEventDetail>).detail;
    if (detail?.draftOnly && detail.workspaceId) {
      listener({ ...detail, event: event.type });
    }
  };
  window.addEventListener(WORKSPACE_DRAFT_CREATED, handler);
  window.addEventListener(WORKSPACE_DRAFT_UPDATED, handler);
  window.addEventListener(WORKSPACE_DRAFT_APPLIED, handler);
  return () => {
    window.removeEventListener(WORKSPACE_DRAFT_CREATED, handler);
    window.removeEventListener(WORKSPACE_DRAFT_UPDATED, handler);
    window.removeEventListener(WORKSPACE_DRAFT_APPLIED, handler);
  };
}

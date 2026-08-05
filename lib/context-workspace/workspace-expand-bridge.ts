/**
 * Workspace Preview → Open Workspace (펼치기).
 * Chat embed is Preview; expand enters full Context Workspace.
 */

export const CONTEXT_WORKSPACE_EXPAND = "rimvio:context-workspace-expand";

export type ContextWorkspaceExpandDetail = {
  readonly contextEventId: string;
  readonly source:
    | "preview_expand"
    | "preview_map_tap"
    | "capsule_resume"
    | "trip_prep"
    | "nl_open"
    | "scout_patch"
    | "one_touch"
    | "workspace_invite_commit";
};

export function dispatchContextWorkspaceExpand(
  detail: ContextWorkspaceExpandDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const contextEventId = detail.contextEventId.trim();
  if (!contextEventId) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ContextWorkspaceExpandDetail>(CONTEXT_WORKSPACE_EXPAND, {
      detail: { ...detail, contextEventId },
    }),
  );
}

export function subscribeContextWorkspaceExpand(
  listener: (detail: ContextWorkspaceExpandDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ContextWorkspaceExpandDetail>).detail);
  };
  window.addEventListener(CONTEXT_WORKSPACE_EXPAND, handler);
  return () => window.removeEventListener(CONTEXT_WORKSPACE_EXPAND, handler);
}

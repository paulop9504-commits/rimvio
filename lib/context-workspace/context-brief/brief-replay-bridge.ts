/**
 * Context Brief → Workspace map Replay (camera along graph order).
 */

export const WORKSPACE_BRIEF_REPLAY = "rimvio:workspace-brief-replay";
export const WORKSPACE_BRIEF_REPLAY_STEP = "rimvio:workspace-brief-replay-step";

export type WorkspaceBriefReplayDetail = {
  readonly contextEventId: string;
  readonly nodeIds: readonly string[];
};

export type WorkspaceBriefReplayStepDetail = {
  readonly contextEventId: string;
  readonly stepIndex: number;
  readonly total: number;
  readonly nodeId: string | null;
  readonly done: boolean;
};

export function dispatchWorkspaceBriefReplay(
  detail: WorkspaceBriefReplayDetail,
): void {
  if (typeof window === "undefined") return;
  const contextEventId = detail.contextEventId.trim();
  if (!contextEventId || detail.nodeIds.length === 0) return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_BRIEF_REPLAY, {
      detail: {
        contextEventId,
        nodeIds: [...detail.nodeIds],
      } satisfies WorkspaceBriefReplayDetail,
    }),
  );
}

export function dispatchWorkspaceBriefReplayStep(
  detail: WorkspaceBriefReplayStepDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_BRIEF_REPLAY_STEP, {
      detail,
    }),
  );
}

export function subscribeWorkspaceBriefReplay(
  listener: (detail: WorkspaceBriefReplayDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceBriefReplayDetail>).detail;
    if (!detail?.contextEventId || !detail.nodeIds?.length) return;
    listener(detail);
  };
  window.addEventListener(WORKSPACE_BRIEF_REPLAY, handler);
  return () => window.removeEventListener(WORKSPACE_BRIEF_REPLAY, handler);
}

export function subscribeWorkspaceBriefReplayStep(
  listener: (detail: WorkspaceBriefReplayStepDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceBriefReplayStepDetail>)
      .detail;
    if (!detail?.contextEventId) return;
    listener(detail);
  };
  window.addEventListener(WORKSPACE_BRIEF_REPLAY_STEP, handler);
  return () => window.removeEventListener(WORKSPACE_BRIEF_REPLAY_STEP, handler);
}

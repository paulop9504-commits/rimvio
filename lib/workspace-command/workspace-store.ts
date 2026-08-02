/**
 * Active Workspace Draft store access — never Globe Reality / Global Objects.
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import {
  hasProvisionalContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";

export type ActiveWorkspaceSnapshot = {
  readonly workspaceId: string;
  readonly contextEventId: string;
  readonly status: ContextWorkspaceState["status"];
  readonly version: number;
  readonly draftOnly: true;
};

/**
 * Guard: Context Command runs only inside Active Workspace (editing|committing).
 */
export function assertActiveWorkspace(workspaceId: string): {
  readonly ok: true;
  readonly state: ContextWorkspaceState;
} | {
  readonly ok: false;
  readonly reasonKo: string;
} {
  const id = workspaceId.trim();
  if (!id) {
    return {
      ok: false,
      reasonKo: "Active Workspace가 없어요 · Globe에서는 명령을 실행하지 않아요",
    };
  }
  if (!hasProvisionalContextWorkspace(id)) {
    return {
      ok: false,
      reasonKo:
        "Active Workspace 안에서만 명령할 수 있어요 · Globe Reality는 읽기 전용",
    };
  }
  const state = readContextWorkspace(id);
  if (!state || state.status === "closed" || state.status === "committed") {
    return {
      ok: false,
      reasonKo: "닫혔거나 커밋된 Workspace에서는 Draft 명령을 받지 않아요",
    };
  }
  return { ok: true, state };
}

export function readActiveWorkspaceDraft(
  workspaceId: string,
): ActiveWorkspaceSnapshot | null {
  const gate = assertActiveWorkspace(workspaceId);
  if (!gate.ok) return null;
  return {
    workspaceId: gate.state.workspaceId || gate.state.contextEventId,
    contextEventId: gate.state.contextEventId,
    status: gate.state.status,
    version: gate.state.version,
    draftOnly: true,
  };
}

/**
 * Hard reject: Workspace Runtime must never write Globe / Global / source truth.
 */
export function assertWorkspaceMutationAllowed(op: string): void {
  const forbidden = [
    "globe_mutate",
    "reality_commit",
    "global_object",
    "source_rewrite",
    "stamp_globe",
    "commit_reality",
  ];
  if (forbidden.includes(op) || op === "commit") {
    throw new Error(
      "Workspace Command Runtime: Globe Reality / Global Object mutation forbidden",
    );
  }
}

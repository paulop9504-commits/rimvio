/**
 * Reality State Engine — unified UserSessionState FSM.
 *
 * Single source of truth for "where is the user right now?"
 * Replaces scattered surface/context/workspace/artifact parameter passing.
 */

export type UserSessionSurface = "globe" | "context" | "workspace" | "artifact";

export type UserSessionState = {
  readonly surface: UserSessionSurface;
  readonly activeContextId: string | null;
  readonly activeWorkspaceId: string | null;
  readonly selectedArtifactId: string | null;
  readonly focusNodeId: string | null;
  readonly currentIntent: string | null;
  readonly agentExecutionId: string | null;
  readonly commitPending: boolean;
  readonly updatedAt: string;
};

export type SessionTransitionKind =
  | "create_context"
  | "open_workspace"
  | "select_artifact"
  | "deselect_artifact"
  | "close_workspace"
  | "close_context"
  | "switch_context"
  | "switch_focus"
  | "set_intent"
  | "clear_intent"
  | "start_agent"
  | "finish_agent"
  | "start_commit"
  | "finish_commit";

export const INITIAL_SESSION_STATE: UserSessionState = {
  surface: "globe",
  activeContextId: null,
  activeWorkspaceId: null,
  selectedArtifactId: null,
  focusNodeId: null,
  currentIntent: null,
  agentExecutionId: null,
  commitPending: false,
  updatedAt: new Date().toISOString(),
};

function stamp(): string {
  return new Date().toISOString();
}

function deriveSurface(state: UserSessionState): UserSessionSurface {
  if (state.selectedArtifactId) return "artifact";
  if (state.activeWorkspaceId) return "workspace";
  if (state.activeContextId) return "context";
  return "globe";
}

/**
 * Pure state transition — no side effects.
 */
export function transitionSessionState(
  state: UserSessionState,
  kind: SessionTransitionKind,
  payload?: Partial<Pick<UserSessionState, "activeContextId" | "activeWorkspaceId" | "selectedArtifactId" | "focusNodeId" | "currentIntent" | "agentExecutionId">>,
): UserSessionState {
  const ts = stamp();

  switch (kind) {
    case "create_context": {
      const next: UserSessionState = {
        ...state,
        activeContextId: payload?.activeContextId ?? state.activeContextId,
        activeWorkspaceId: null,
        selectedArtifactId: null,
        focusNodeId: null,
        updatedAt: ts,
        surface: "context",
      };
      return next;
    }
    case "open_workspace": {
      const next: UserSessionState = {
        ...state,
        activeWorkspaceId: payload?.activeWorkspaceId ?? state.activeWorkspaceId,
        selectedArtifactId: null,
        updatedAt: ts,
        surface: "workspace",
      };
      return next;
    }
    case "select_artifact": {
      const next: UserSessionState = {
        ...state,
        selectedArtifactId: payload?.selectedArtifactId ?? state.selectedArtifactId,
        updatedAt: ts,
        surface: "artifact",
      };
      return next;
    }
    case "deselect_artifact": {
      const next: UserSessionState = {
        ...state,
        selectedArtifactId: null,
        updatedAt: ts,
        surface: deriveSurface({ ...state, selectedArtifactId: null }),
      };
      return next;
    }
    case "close_workspace": {
      const next: UserSessionState = {
        ...state,
        activeWorkspaceId: null,
        selectedArtifactId: null,
        focusNodeId: null,
        updatedAt: ts,
        surface: "context",
      };
      return next;
    }
    case "close_context": {
      return { ...INITIAL_SESSION_STATE, updatedAt: ts };
    }
    case "switch_context": {
      const next: UserSessionState = {
        ...INITIAL_SESSION_STATE,
        activeContextId: payload?.activeContextId ?? null,
        updatedAt: ts,
        surface: payload?.activeContextId ? "context" : "globe",
      };
      return next;
    }
    case "switch_focus": {
      return {
        ...state,
        focusNodeId: payload?.focusNodeId ?? null,
        updatedAt: ts,
      };
    }
    case "set_intent":
      return { ...state, currentIntent: payload?.currentIntent ?? null, updatedAt: ts };
    case "clear_intent":
      return { ...state, currentIntent: null, updatedAt: ts };
    case "start_agent":
      return { ...state, agentExecutionId: payload?.agentExecutionId ?? null, updatedAt: ts };
    case "finish_agent":
      return { ...state, agentExecutionId: null, updatedAt: ts };
    case "start_commit":
      return { ...state, commitPending: true, updatedAt: ts };
    case "finish_commit":
      return { ...state, commitPending: false, updatedAt: ts };
    default:
      return state;
  }
}

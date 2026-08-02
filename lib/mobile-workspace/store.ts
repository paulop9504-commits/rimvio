/**
 * Mobile Workspace state machine — Progressive Disclosure Callout.
 */

import type {
  MobileCalloutMode,
  MobileWorkspaceAction,
  MobileWorkspaceState,
} from "@/lib/mobile-workspace/types";

const listeners = new Set<() => void>();
let state: MobileWorkspaceState | null = null;

function emit(): void {
  for (const l of listeners) l();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function emptyMobileWorkspaceState(
  contextId: string,
  contextTitleKo = "Workspace",
): MobileWorkspaceState {
  return {
    contextId,
    contextTitleKo,
    anchorEntityId: null,
    entities: [],
    relations: [],
    activeEntityId: null,
    calloutMode: "compact",
    currentIntent: null,
    actionMenuEntityId: null,
    updatedAtIso: nowIso(),
  };
}

export function subscribeMobileWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMobileWorkspaceSnapshot(): MobileWorkspaceState | null {
  return state;
}

export function readMobileWorkspace(): MobileWorkspaceState | null {
  return state;
}

function nextCalloutMode(
  current: MobileCalloutMode,
  dir: "up" | "down",
): MobileCalloutMode {
  const order: MobileCalloutMode[] = ["compact", "expanded", "full"];
  const i = order.indexOf(current);
  if (dir === "up") return order[Math.min(order.length - 1, i + 1)]!;
  return order[Math.max(0, i - 1)]!;
}

export function dispatchMobileWorkspace(
  action: MobileWorkspaceAction,
): MobileWorkspaceState | null {
  switch (action.type) {
    case "clear": {
      state = null;
      emit();
      return null;
    }
    case "hydrate": {
      state = {
        contextId: action.contextId.trim(),
        contextTitleKo: action.contextTitleKo.trim() || "Workspace",
        anchorEntityId: action.anchorEntityId ?? null,
        entities: action.entities,
        relations: action.relations ?? [],
        activeEntityId: null,
        calloutMode: "compact",
        currentIntent: null,
        actionMenuEntityId: null,
        updatedAtIso: nowIso(),
      };
      emit();
      return state;
    }
    default:
      break;
  }

  if (!state) return null;

  switch (action.type) {
    case "set_active": {
      state = {
        ...state,
        activeEntityId: action.entityId,
        calloutMode: action.entityId ? "compact" : state.calloutMode,
        actionMenuEntityId: null,
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "set_callout_mode": {
      state = {
        ...state,
        calloutMode: action.mode,
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "expand_callout": {
      if (!state.activeEntityId) break;
      state = {
        ...state,
        calloutMode: nextCalloutMode(state.calloutMode, "up"),
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "collapse_callout": {
      if (!state.activeEntityId) break;
      const next = nextCalloutMode(state.calloutMode, "down");
      if (state.calloutMode === "compact") {
        state = {
          ...state,
          activeEntityId: null,
          actionMenuEntityId: null,
          updatedAtIso: nowIso(),
        };
      } else {
        state = {
          ...state,
          calloutMode: next,
          updatedAtIso: nowIso(),
        };
      }
      break;
    }
    case "close_callout": {
      state = {
        ...state,
        activeEntityId: null,
        calloutMode: "compact",
        actionMenuEntityId: null,
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "set_anchor": {
      state = {
        ...state,
        anchorEntityId: action.entityId,
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "apply_intent": {
      state = {
        ...state,
        currentIntent: action.intent,
        entities: action.entities ?? state.entities,
        relations: action.relations ?? state.relations,
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "open_action_menu": {
      state = {
        ...state,
        actionMenuEntityId: action.entityId,
        activeEntityId: action.entityId,
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "close_action_menu": {
      state = {
        ...state,
        actionMenuEntityId: null,
        updatedAtIso: nowIso(),
      };
      break;
    }
  }

  emit();
  return state;
}

export function clearMobileWorkspaceForTests(): void {
  state = null;
  emit();
}

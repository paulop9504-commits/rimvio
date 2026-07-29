/**
 * Reality State Engine — sessionStorage persistence + CustomEvent bus.
 */

import {
  INITIAL_SESSION_STATE,
  transitionSessionState,
  type SessionTransitionKind,
  type UserSessionState,
} from "@/lib/reality-state/session-state";

const STORAGE_KEY = "rimvio.session-state.v1";
const CHANGE_EVENT = "rimvio:session-state-change";

let cached: UserSessionState | null = null;

function persist(state: UserSessionState): void {
  cached = state;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota — keep in-memory only */
    }
  }
}

function emit(state: UserSessionState): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<UserSessionState>(CHANGE_EVENT, { detail: state }),
  );
}

export function readSessionState(): UserSessionState {
  if (cached) return cached;
  if (typeof sessionStorage !== "undefined") {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        cached = JSON.parse(raw) as UserSessionState;
        return cached;
      }
    } catch {
      /* corrupt — reset */
    }
  }
  cached = INITIAL_SESSION_STATE;
  return cached;
}

export function dispatchSessionTransition(
  kind: SessionTransitionKind,
  payload?: Parameters<typeof transitionSessionState>[2],
): UserSessionState {
  const prev = readSessionState();
  const next = transitionSessionState(prev, kind, payload);
  persist(next);
  emit(next);
  return next;
}

export function resetSessionState(): void {
  persist(INITIAL_SESSION_STATE);
  emit(INITIAL_SESSION_STATE);
}

export function subscribeSessionStateChange(
  listener: (state: UserSessionState) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    listener((e as CustomEvent<UserSessionState>).detail);
  };
  window.addEventListener(CHANGE_EVENT, handler);
  listener(readSessionState());
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

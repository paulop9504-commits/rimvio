/**
 * Active Workspace SDK frame session (client).
 */

import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";

const memory = new Map<string, WorkspaceSdkFrame>();
const EVENT = "rimvio:workspace-sdk-session";
const OPEN_EVENT = "rimvio:workspace-sdk-open";

export function writeWorkspaceSdkSession(frame: WorkspaceSdkFrame): void {
  const id = frame.contextEventId?.trim();
  if (!id) {
    return;
  }
  memory.set(id, frame);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT, { detail: { contextEventId: id } }),
    );
  }
}

export function readWorkspaceSdkSession(
  contextEventId: string,
): WorkspaceSdkFrame | null {
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  return memory.get(id) ?? null;
}

export function clearWorkspaceSdkSession(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  memory.delete(id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT, { detail: { contextEventId: id } }),
    );
  }
}

export function dispatchWorkspaceSdkOpen(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id || typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(OPEN_EVENT, { detail: { contextEventId: id } }),
  );
}

export function subscribeWorkspaceSdkSession(
  listener: (contextEventId: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onSession = (event: Event) => {
    const detail = (event as CustomEvent<{ contextEventId: string }>).detail;
    if (detail?.contextEventId) {
      listener(detail.contextEventId);
    }
  };
  const onOpen = (event: Event) => {
    const detail = (event as CustomEvent<{ contextEventId: string }>).detail;
    if (detail?.contextEventId) {
      listener(detail.contextEventId);
    }
  };
  window.addEventListener(EVENT, onSession);
  window.addEventListener(OPEN_EVENT, onOpen);
  return () => {
    window.removeEventListener(EVENT, onSession);
    window.removeEventListener(OPEN_EVENT, onOpen);
  };
}

export { OPEN_EVENT as WORKSPACE_SDK_OPEN_EVENT };

/**
 * Per-Context Capability layout SSOT — AI / human Open·Close·Resize·Move.
 */

import type { WorkspaceCapabilityLayout } from "@/lib/workspace-capability/types";

const EVENT = "rimvio:workspace-capability-layout";

const byContext = new Map<string, WorkspaceCapabilityLayout>();

export function readWorkspaceCapabilityLayout(
  contextEventId: string,
): WorkspaceCapabilityLayout | null {
  const id = contextEventId.trim();
  if (!id) return null;
  return byContext.get(id) ?? null;
}

export function writeWorkspaceCapabilityLayout(
  layout: WorkspaceCapabilityLayout,
): void {
  const id = layout.contextEventId.trim();
  if (!id) return;
  byContext.set(id, layout);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT, {
        detail: { contextEventId: id },
      }),
    );
  }
}

export function clearWorkspaceCapabilityLayout(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) return;
  byContext.delete(id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT, {
        detail: { contextEventId: id },
      }),
    );
  }
}

export function subscribeWorkspaceCapabilityLayout(
  listener: (contextEventId: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<{ contextEventId?: string }>).detail;
    const id = detail?.contextEventId?.trim();
    if (id) listener(id);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Reset between unit tests. */
export function resetWorkspaceCapabilityLayoutsForTests(): void {
  byContext.clear();
}

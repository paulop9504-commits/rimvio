/**
 * Session-scoped Loop Definition store (per platform).
 */

import type { LoopDefinition } from "@/lib/agent-os/loop-builder/types";

const STORE = new Map<string, LoopDefinition>();

export const LOOP_DEFINITION_UPDATED_EVENT = "rimvio:loop-definition-updated";

export function readLoopDefinition(platformId: string): LoopDefinition | null {
  return STORE.get(platformId) ?? null;
}

export function writeLoopDefinition(platformId: string, loop: LoopDefinition): LoopDefinition {
  STORE.set(platformId, loop);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(LOOP_DEFINITION_UPDATED_EVENT, { detail: { platformId, loop } }),
    );
  }
  return loop;
}

export function subscribeLoopDefinitionUpdates(
  platformId: string,
  listener: (loop: LoopDefinition) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ platformId: string; loop: LoopDefinition }>;
    if (custom.detail?.platformId === platformId && custom.detail.loop) {
      listener(custom.detail.loop);
    }
  };
  window.addEventListener(LOOP_DEFINITION_UPDATED_EVENT, handler);
  return () => window.removeEventListener(LOOP_DEFINITION_UPDATED_EVENT, handler);
}

export function resetLoopDefinitionsForTests(): void {
  STORE.clear();
}

import { readActiveRunState } from "@/lib/context-run/run-state-store";
import { buildComposerGraphId } from "@/lib/context-run/resolve-globe-composer-surface";

/** Active run graphId — never derive from supply ack eventId (breaks feed reducer). */
export function resolveActiveComposerGraphId(fallbackSeed: string): string {
  const active = readActiveRunState()?.graphId?.trim();
  if (active) {
    return active;
  }
  return buildComposerGraphId(null, fallbackSeed.trim());
}

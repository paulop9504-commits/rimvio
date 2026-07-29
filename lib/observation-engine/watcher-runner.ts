/**
 * Watcher runner — periodically polls ObservationWatchers and emits results.
 */

import type { ObservationWatcher } from "@/lib/observation-engine/types";
import { emitObservation } from "@/lib/observation-engine/observation-bus";

const activeTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

export function startWatcher(watcher: ObservationWatcher): void {
  if (activeTimers.has(watcher.watcherId)) return;

  const timer = setInterval(async () => {
    try {
      const observation = await watcher.check();
      if (observation) emitObservation(observation);
    } catch {
      // polling failures are silent — retry on next interval
    }
  }, watcher.intervalMs);

  activeTimers.set(watcher.watcherId, timer);
}

export function stopWatcher(watcherId: string): void {
  const timer = activeTimers.get(watcherId);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(watcherId);
  }
}

export function stopAllWatchers(): void {
  for (const [id] of activeTimers) stopWatcher(id);
}

export function getActiveWatcherIds(): readonly string[] {
  return [...activeTimers.keys()];
}

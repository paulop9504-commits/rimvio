/**
 * Hydrate agent-platform durable stores from Supabase (runtime SSOT).
 */

import {
  writeServerRegistry,
  writeServerGoalState,
  persistSandboxSessionSnapshot,
  readServerRegistry,
} from "./durable-store";
import {
  hydrateGoalStatesFromSupabase,
  hydrateRegistryFromSupabase,
  hydrateSandboxSessionsFromSupabase,
  isAgentPlatformSupabaseEnabled,
} from "./supabase-store";

type HydrateGlobal = typeof globalThis & {
  __rimvioAgentPlatformHydrated?: boolean;
  __rimvioAgentPlatformHydratePromise?: Promise<void>;
};

function g(): HydrateGlobal {
  return globalThis as HydrateGlobal;
}

export function isAgentPlatformHydrated(): boolean {
  return g().__rimvioAgentPlatformHydrated === true;
}

/** Load Supabase → memory cache once per warm isolate. */
export async function ensureAgentPlatformHydrated(): Promise<void> {
  if (g().__rimvioAgentPlatformHydrated) return;
  if (g().__rimvioAgentPlatformHydratePromise) {
    await g().__rimvioAgentPlatformHydratePromise;
    return;
  }

  g().__rimvioAgentPlatformHydratePromise = (async () => {
    if (!isAgentPlatformSupabaseEnabled()) {
      g().__rimvioAgentPlatformHydrated = true;
      return;
    }

    const [registry, goals, sessions] = await Promise.all([
      hydrateRegistryFromSupabase(),
      hydrateGoalStatesFromSupabase(),
      hydrateSandboxSessionsFromSupabase(),
    ]);

    if (registry.length > 0) {
      writeServerRegistry(registry);
    }
    for (const goal of goals) {
      writeServerGoalState(goal);
    }
    for (const session of sessions) {
      persistSandboxSessionSnapshot(session);
    }

    g().__rimvioAgentPlatformHydrated = true;
  })();

  await g().__rimvioAgentPlatformHydratePromise;
}

export function resetAgentPlatformHydrationForTests(): void {
  g().__rimvioAgentPlatformHydrated = false;
  g().__rimvioAgentPlatformHydratePromise = undefined;
}

export function readHydratedRegistrySize(): number {
  return readServerRegistry().length;
}

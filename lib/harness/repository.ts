import type { Harness } from "@/lib/rimvio-protocol/harness/schema";
import { assertHarness, validateHarness } from "@/lib/harness/validate";

export type HarnessRepository = {
  get(id: string): Promise<Harness | null>;
  list(): Promise<readonly Harness[]>;
  save(harness: Harness): Promise<Harness>;
  delete(id: string): Promise<boolean>;
};

/** In-memory repo for Phase 1 — replace with Supabase later without changing callers. */
export function createInMemoryHarnessRepository(
  seed: readonly Harness[] = [],
): HarnessRepository {
  const store = new Map<string, Harness>();
  for (const item of seed) {
    const checked = validateHarness(item);
    if (!checked.ok) {
      throw new Error(`seed_invalid: ${item.id}`);
    }
    store.set(checked.harness.id, checked.harness);
  }

  return {
    async get(id) {
      return store.get(id) ?? null;
    },
    async list() {
      return [...store.values()];
    },
    async save(harness) {
      const checked = assertHarness(harness);
      const now = new Date().toISOString();
      const next: Harness = {
        ...checked,
        updatedAt: now,
        createdAt: store.has(checked.id) ? (store.get(checked.id)?.createdAt ?? now) : checked.createdAt,
      };
      store.set(next.id, next);
      return next;
    },
    async delete(id) {
      return store.delete(id);
    },
  };
}

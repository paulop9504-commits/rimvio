/**
 * Request-scoped memo for Places / LiteAPI / YT surgical fetches.
 */

export function createResearchFetchCache() {
  const store = new Map<string, Promise<unknown>>();

  return {
    getOrCreate<T>(key: string, factory: () => Promise<T>): Promise<T> {
      const existing = store.get(key);
      if (existing) {
        return existing as Promise<T>;
      }
      const created = factory().catch((err) => {
        store.delete(key);
        throw err;
      });
      store.set(key, created);
      return created;
    },
    size(): number {
      return store.size;
    },
  };
}

export type ResearchFetchCache = ReturnType<typeof createResearchFetchCache>;

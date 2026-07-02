/** Client-side guard — skip duplicate fetches within a window. */
const lastRunAt = new Map<string, number>();

export function shouldSkipGlobeFetch(
  key: string,
  minIntervalMs: number,
  now = Date.now(),
): boolean {
  const last = lastRunAt.get(key) ?? 0;
  if (now - last < minIntervalMs) {
    return true;
  }
  lastRunAt.set(key, now);
  return false;
}

export function resetGlobeFetchMinIntervalForTests(): void {
  lastRunAt.clear();
}

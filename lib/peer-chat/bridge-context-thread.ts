/** Bridge Context Talk — solo or group thread scoped to one experience. */

export const BRIDGE_CONTEXT_THREAD_PREFIX = "peer-bridge-" as const;

function fnv1aHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Stable per experience — idempotent ensure on server. */
export function buildBridgeContextThreadId(eventId: string): string {
  const key = eventId.trim();
  if (!key) {
    throw new Error("event_id_required");
  }
  return `${BRIDGE_CONTEXT_THREAD_PREFIX}${fnv1aHash(key)}`;
}

export function isBridgeContextThreadId(threadId: string): boolean {
  return threadId.trim().startsWith(BRIDGE_CONTEXT_THREAD_PREFIX);
}

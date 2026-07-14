import { findLifeEventCandidate } from "@/lib/life-read-model";
import type { CapabilityInvocationRecord } from "@/lib/marketplace/marketplace-contract";
import { appendContextCapabilityInvocationToMetadata } from "@/lib/marketplace/context-capability-invocation-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** Persist capability invocation on Context metadata for hub timeline rollup. */
export function recordContextCapabilityInvocation(input: {
  contextEventId: string;
  record: CapabilityInvocationRecord;
}): boolean {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return false;
  }
  const event = findLifeEventCandidate(contextEventId);
  if (!event) {
    return false;
  }

  const metadata = appendContextCapabilityInvocationToMetadata({
    metadata: event.metadata ?? {},
    record: input.record,
  });

  commitEventUpsert({
    ...event,
    metadata,
    updatedAt: new Date().toISOString(),
  });

  return true;
}

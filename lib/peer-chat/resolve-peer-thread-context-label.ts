import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildBridgeContextThreadId } from "@/lib/peer-chat/bridge-context-thread";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type PeerThreadContextLabel = {
  eventId: string;
  title: string;
};

function eventActivityMs(event: EventCandidate): number {
  const raw = event.updatedAt ?? event.datetime ?? event.createdAt;
  const ms = Date.parse(raw ?? "");
  return Number.isNaN(ms) ? 0 : ms;
}

function eventTitle(event: EventCandidate): string {
  const title = event.title?.trim() || event.place?.trim();
  return title || "맥락";
}

/** Latest linked experience title per peer thread — client read model. */
export function buildPeerThreadContextIndex(
  events: readonly EventCandidate[],
): Map<string, PeerThreadContextLabel> {
  const index = new Map<string, { label: PeerThreadContextLabel; ms: number }>();

  const upsert = (threadId: string, event: EventCandidate) => {
    const key = threadId.trim();
    if (!key) {
      return;
    }
    const ms = eventActivityMs(event);
    const prev = index.get(key);
    if (prev && prev.ms > ms) {
      return;
    }
    index.set(key, {
      ms,
      label: { eventId: event.id, title: eventTitle(event) },
    });
  };

  for (const event of events) {
    try {
      upsert(buildBridgeContextThreadId(event.id), event);
    } catch {
      // skip invalid ids
    }
    const plan = readPlanContextFromEvent(event);
    if (plan?.peerThreadId?.trim()) {
      upsert(plan.peerThreadId, event);
    }
    const metaThread =
      typeof event.metadata?.planPeerThreadId === "string"
        ? event.metadata.planPeerThreadId.trim()
        : "";
    if (metaThread) {
      upsert(metaThread, event);
    }
  }

  const out = new Map<string, PeerThreadContextLabel>();
  for (const [threadId, row] of index) {
    out.set(threadId, row.label);
  }
  return out;
}

export function resolvePeerThreadContextFromEvents(
  threadId: string,
  events: readonly EventCandidate[],
): PeerThreadContextLabel | null {
  return buildPeerThreadContextIndex(events).get(threadId.trim()) ?? null;
}

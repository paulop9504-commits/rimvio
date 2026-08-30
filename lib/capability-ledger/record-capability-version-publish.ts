/**
 * Capability version publish events — economy attribution (P8).
 */

import { recordContributorPayout } from "@/lib/contributor-ledger/record-contributor-payout";
import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";

export type CapabilityVersionPublishEvent = {
  readonly eventId: string;
  readonly capabilityId: string;
  readonly platformId: string;
  readonly version: string;
  readonly contributorId: string;
  readonly publishedAtIso: string;
  readonly attributionKrw: number;
};

const events: CapabilityVersionPublishEvent[] = [];
let eventCounter = 0;

function nextEventId(): string {
  eventCounter += 1;
  return `cap-pub-${Date.now()}-${eventCounter}`;
}

export function readCapabilityVersionPublishEvents(): readonly CapabilityVersionPublishEvent[] {
  return events;
}

/** Record economy event when capability version is published to index. */
export function recordCapabilityVersionPublish(input: {
  readonly entry: CapabilityIndexEntry;
  readonly contributorId?: string | null;
  readonly attributionKrw?: number;
}): CapabilityVersionPublishEvent {
  const contributorId =
    input.contributorId?.trim() ||
    input.entry.ownerCreatorId?.trim() ||
    "rimvio-core";
  const version = String(input.entry.inputSchemaVersion ?? 1);
  const attributionKrw = input.attributionKrw ?? 500;

  const event: CapabilityVersionPublishEvent = {
    eventId: nextEventId(),
    capabilityId: input.entry.capabilityId,
    platformId: input.entry.platformId,
    version,
    contributorId,
    publishedAtIso: input.entry.publishedAtIso,
    attributionKrw,
  };
  events.push(event);

  recordContributorPayout({
    contributorId,
    kind: "capability_improvement",
    amountKrw: attributionKrw,
    summaryKo: `Capability publish · ${input.entry.capabilityId} v${version}`,
    capabilityId: input.entry.capabilityId,
    rewardFactors: { publish: 1, version: Number(version) || 1 },
  });

  return event;
}

export function resetCapabilityVersionPublishEventsForTests(): void {
  events.length = 0;
  eventCounter = 0;
}

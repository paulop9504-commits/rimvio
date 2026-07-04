/**
 * Life-state SSOT — sole write path for Event Candidate store.
 * Ingest adapters and client API apply must call only these functions.
 */
import type {
  EventCandidate,
  EventCandidateLifecycle,
  EventCandidateUpsertInput,
  EventCandidateWire,
} from "@/lib/events/event-candidate";
import {
  transitionEventLifecycle as storeTransition,
  upsertEventCandidate as storeUpsert,
} from "@/lib/events/event-store";
import { validateEventCandidateWire } from "@/lib/events/schema-lock/event-schema";
import { scheduleLifeEventVaultSync } from "@/lib/materialize/schedule-life-event-vault-sync";
import { materializeEntityEdges } from "@/lib/ontology/materialize-entity-edges";

export function commitEventUpsert(
  input: EventCandidateUpsertInput,
): EventCandidate {
  const committed = storeUpsert(input);
  materializeEntityEdges(committed);
  scheduleLifeEventVaultSync(committed);
  return committed;
}

export function commitEventLifecycle(
  id: string,
  lifecycle: EventCandidateLifecycle,
): EventCandidate | null {
  const committed = storeTransition(id, lifecycle);
  if (committed) {
    if (committed.lifecycle !== "archived") {
      materializeEntityEdges(committed);
    }
    scheduleLifeEventVaultSync(committed);
  }
  return committed;
}

/** Client/server — apply orchestrate or hydrate wire into Event SSOT. */
export function commitEventWireFromApi(
  patch: EventCandidateWire | null | undefined,
  enrich?: { sourceMessageId?: string | null },
): EventCandidate | null {
  if (!patch?.title?.trim()) {
    return null;
  }

  const wireIssues = validateEventCandidateWire(patch);
  if (wireIssues.length > 0) {
    console.warn(
      "[commit-truth] schema-lock rejected wire",
      wireIssues.map((i) => i.code).join(","),
    );
    return null;
  }

  const metadata = { ...patch.metadata };
  const sourceMessageId = enrich?.sourceMessageId?.trim();
  if (sourceMessageId) {
    metadata.sourceMessageId = sourceMessageId;
  }

  return commitEventUpsert({
    id: patch.id?.trim() || undefined,
    title: patch.title,
    category: patch.category,
    source: patch.source ?? "message",
    lifecycle: patch.lifecycle,
    datetime: patch.datetime,
    place: patch.place,
    containerId: patch.container_id,
    confidence: patch.confidence,
    metadata,
    lifecycleUpdatedAt: patch.lifecycle_updated_at,
  });
}

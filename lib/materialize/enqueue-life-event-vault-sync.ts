import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  findSyncQueueRowByObjectKey,
  listPendingSyncQueueRows,
  upsertSyncQueueRow,
} from "@/lib/materialize/materialize-db";
import type { VaultSyncQueueRow } from "@/lib/materialize/types";
import { lifeEventVaultKey } from "@/lib/vault/vault-object-keys";

function newQueueId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Queue encrypted life_event mirror after EventCandidate commit. */
export async function enqueueLifeEventVaultSync(
  event: EventCandidate,
): Promise<VaultSyncQueueRow | null> {
  const eventId = event.id.trim();
  if (!eventId) {
    return null;
  }

  const objectKey = lifeEventVaultKey(eventId);
  const nowIso = new Date().toISOString();
  const existing =
    (await findSyncQueueRowByObjectKey(objectKey)) ??
    (await listPendingSyncQueueRows(500)).find((row) => row.objectKey === objectKey) ??
    null;

  if (existing) {
    return upsertSyncQueueRow({
      ...existing,
      kind: "life_event",
      eventId,
      mediaContextId: null,
      status: "pending",
      lastError: null,
      updatedAtIso: nowIso,
    });
  }

  const row: VaultSyncQueueRow = {
    id: newQueueId(),
    objectKey,
    kind: "life_event",
    mediaContextId: null,
    eventId,
    status: "pending",
    attempts: 0,
    lastError: null,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };

  return upsertSyncQueueRow(row);
}

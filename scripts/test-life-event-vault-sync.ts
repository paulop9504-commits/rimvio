import assert from "node:assert/strict";
import { upsertEventCandidate } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { enqueueLifeEventVaultSync } from "../lib/materialize/enqueue-life-event-vault-sync";
import { buildLifeEventVaultSnapshot } from "../lib/materialize/life-event-vault-snapshot";
import {
  readSyncQueueMemory,
  resetMaterializeStoreForTests,
} from "../lib/materialize/materialize-db";
import { FEED_CAPTURES_META_KEY } from "../lib/feed/feed-capture-types";
import { lifeEventVaultKey } from "../lib/vault/vault-object-keys";

async function main() {
  resetMaterializeStoreForTests();

  const event = commitEventUpsert({
    id: "ec-vault-test-1",
    title: "제주 여행",
    category: "travel",
    source: "message",
    lifecycle: "active",
    datetime: "2026-07-01T09:00:00.000Z",
    place: "제주",
    confidence: 0.82,
    metadata: {
      feedCaptures: [],
      secretRawHtml: "<should-not-mirror>",
    },
  });

  assert.equal(event.id, "ec-vault-test-1");

  await enqueueLifeEventVaultSync(event);
  assert.equal(readSyncQueueMemory().length, 1);
  assert.equal(readSyncQueueMemory()[0]?.kind, "life_event");
  assert.equal(readSyncQueueMemory()[0]?.eventId, "ec-vault-test-1");
  assert.equal(
    readSyncQueueMemory()[0]?.objectKey,
    lifeEventVaultKey("ec-vault-test-1"),
  );

  const snapshot = buildLifeEventVaultSnapshot(
    upsertEventCandidate({
      ...event,
      metadata: {
        [FEED_CAPTURES_META_KEY]: [
          {
            id: "cap-1",
            kind: "photo",
            capturedAtIso: "2026-06-19T10:00:00.000Z",
            verified: true,
          },
        ],
        secretRawHtml: "<strip>",
      },
    }),
  );
  assert.equal(snapshot.captureCount, 1);
  assert.equal(snapshot.captureIds[0], "cap-1");
  assert.equal(snapshot.metadata?.secretRawHtml, undefined);
  assert.ok(Array.isArray(snapshot.metadata?.[FEED_CAPTURES_META_KEY]));

  console.log("test-life-event-vault-sync: ok");
}

void main();

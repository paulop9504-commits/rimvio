#!/usr/bin/env npx tsx
/**
 * Seed Learning Engine — sector registry · observe · promote gate · shared community.
 */
import assert from "node:assert/strict";
import {
  SEED_LEARNING_SECTOR_IDS,
  SEED_LEARNING_SECTOR_REGISTRY,
  assertSectorRegistryComplete,
  applySeedMentionEvents,
  evaluateSeedPromoteCandidates,
  listReadySeedPromoteCandidates,
  listSeedLearningRollup,
  listSeedLearningSectors,
  observeScoutSeedLearning,
  resetSeedLearningStoreForTests,
  SEED_PROMOTE_MIN_MENTIONS,
  dumpSeedPromoteCandidatesMarkdown,
  filterCommunityPromoteReady,
  SEED_PROMOTE_SHARED_MIN_MISS,
  SEED_PROMOTE_SHARED_MIN_MENTIONS,
  syncReadyPromotesToCatalogOverlay,
} from "../lib/seed-learning";
import { resolveEntities } from "../lib/entity-resolver";
import { resetPromotedCatalogOverlayForTests } from "../lib/entity-resolver/catalogs/promoted-overlay-store";
import {
  ingestSeedLearningSharedDeltas,
  listSeedLearningSharedRollup,
  resetSeedLearningSharedMemoryForTests,
} from "../lib/seed-learning/server";

assertSectorRegistryComplete();
assert.equal(
  SEED_LEARNING_SECTOR_REGISTRY.length,
  SEED_LEARNING_SECTOR_IDS.length,
);
assert.ok(listSeedLearningSectors("P0").length >= 6);
assert.ok(listSeedLearningSectors("P1").length >= 6);

resetSeedLearningStoreForTests();

{
  const r = observeScoutSeedLearning({
    message: "난바역 근처에 캡슐호텔 찾아줘",
  });
  assert.ok(r.eventCount >= 1);
  assert.ok(r.hitCount >= 1);
  const rollup = listSeedLearningRollup();
  assert.ok(
    rollup.some((row) => row.sectorId === "stations" && /난바/.test(row.token)),
  );
  assert.ok(
    rollup.some(
      (row) =>
        row.sectorId === "lodging_stay_types" && /캡슐/.test(row.token),
    ) || rollup.some((row) => /캡슐/.test(row.token)),
  );
}

resetSeedLearningStoreForTests();

{
  for (let i = 0; i < SEED_PROMOTE_MIN_MENTIONS; i++) {
    applySeedMentionEvents([
      {
        sectorId: "stations",
        token: "가상역",
        outcome: "miss",
        domain: "transit",
      },
    ]);
  }
  const ready = listReadySeedPromoteCandidates(listSeedLearningRollup());
  assert.ok(
    ready.some((row) => row.token === "가상역" && row.verdict === "ready"),
  );
  const all = evaluateSeedPromoteCandidates(listSeedLearningRollup());
  assert.equal(
    all.find((row) => row.token === "가상역")?.reason,
    "frequent_miss",
  );
  const md = dumpSeedPromoteCandidatesMarkdown(ready);
  assert.match(md, /가상역/);
  assert.match(md, /frequent-travel-geo/);
}

resetSeedLearningStoreForTests();
{
  observeScoutSeedLearning({ message: "신주쿠역 근처 라멘 맛집" });
  const rollup = listSeedLearningRollup();
  assert.ok(rollup.some((row) => row.sectorId === "stations"));
  assert.ok(
    rollup.some((row) => row.sectorId === "cuisine" && /라멘/.test(row.token)),
  );
}

resetSeedLearningStoreForTests();
{
  for (let i = 0; i < SEED_PROMOTE_MIN_MENTIONS; i++) {
    applySeedMentionEvents([
      {
        sectorId: "lodging_brands",
        token: "가상호텔체인",
        outcome: "miss",
        domain: "lodging",
      },
    ]);
  }
  resetPromotedCatalogOverlayForTests();
  const applied = syncReadyPromotesToCatalogOverlay();
  assert.ok(applied.applied >= 1, "ready lodging brand → overlay");
  const resolved = resolveEntities("가상호텔체인 예약해");
  assert.ok(
    resolved.entities.some((e) => /가상호텔체인/.test(e.label)),
    "overlay resolves promoted token",
  );
  resetPromotedCatalogOverlayForTests();
}

resetSeedLearningSharedMemoryForTests();

async function testSharedCommunity(): Promise<void> {
  const ingest = await ingestSeedLearningSharedDeltas([
    {
      sectorId: "stations",
      token: "공동역",
      hitDelta: 0,
      missDelta: SEED_PROMOTE_SHARED_MIN_MISS,
      domain: "transit",
    },
    {
      sectorId: "stations",
      token: "공동역",
      hitDelta: 0,
      missDelta:
        SEED_PROMOTE_SHARED_MIN_MENTIONS - SEED_PROMOTE_SHARED_MIN_MISS,
      domain: "transit",
    },
  ]);
  assert.ok(ingest.persisted >= 1);
  assert.equal(ingest.backend, "memory");

  const { entries, backend } = await listSeedLearningSharedRollup({
    sectorId: "stations",
  });
  assert.equal(backend, "memory");
  const row = entries.find((e) => e.token === "공동역");
  assert.ok(row);
  assert.ok(row!.missCount >= SEED_PROMOTE_SHARED_MIN_MISS);
  assert.ok(row!.mentionCount >= SEED_PROMOTE_SHARED_MIN_MENTIONS);

  const communityReady = filterCommunityPromoteReady(
    evaluateSeedPromoteCandidates(entries),
  );
  assert.ok(communityReady.some((c) => c.token === "공동역"));

  const thin = filterCommunityPromoteReady(
    evaluateSeedPromoteCandidates([
      {
        sectorId: "stations",
        token: "얇은역",
        hitCount: 0,
        missCount: 3,
        mentionCount: 3,
        lastHitAtIso: null,
        lastMissAtIso: new Date().toISOString(),
        lastSeenAtIso: new Date().toISOString(),
        sampleDomains: ["transit"],
        sampleGeoIds: [],
      },
    ]),
  );
  assert.equal(thin.length, 0);
}

void testSharedCommunity().then(() => {
  console.log(
    `test-seed-learning-engine: ok (${SEED_LEARNING_SECTOR_REGISTRY.length} sectors, P0=${listSeedLearningSectors("P0").length}, shared)`,
  );
});

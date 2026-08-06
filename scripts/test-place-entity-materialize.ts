/**
 * Placeholder → Place Entity: Tool burst + node photo/price pass-through.
 */
import assert from "node:assert/strict";
import {
  burstFillTripInventoryViaTools,
  clearContextWorkspace,
  clearWorkspaceChat,
  compileTripEntitySlots,
  materializeTripDraftStops,
  prepareTripWorkspaceDraft,
  prepareTripWorkspaceDraftAsync,
  resolveTripDayCount,
} from "../lib/context-workspace";

async function main() {
  const CTX = "test:place-entity-materialize";

  clearWorkspaceChat(CTX);
  clearContextWorkspace(CTX);

  const utterance = "오사카 4박5일 추천 일정";
  const dayCount = resolveTripDayCount({ nights: 4, days: 5 });
  const slots = compileTripEntitySlots({
    destinationKo: "오사카",
    stayLabelKo: "4박5일",
    days: 5,
    nights: 4,
  });

  const viaTools = await burstFillTripInventoryViaTools({
    destinationKo: "오사카",
    slots,
    dayCount,
    contextEventId: CTX,
  });
  assert.equal(viaTools.length, slots.length);
  assert.ok(viaTools.some((i) => i.picked != null));

  const materialized = materializeTripDraftStops({
    destinationKo: "오사카",
    utterance,
    slots,
    dayCount,
    inventories: viaTools,
  });
  assert.ok(materialized.stops.length >= 5);
  assert.ok(
    materialized.stops.some(
      (s) =>
        s.tags.includes("entity_resolved") ||
        s.tags.includes("fallback_seed") ||
        s.entityResolved === true,
    ),
  );

  const sync = prepareTripWorkspaceDraft({
    utterance,
    contextEventId: CTX,
    tripPrep: {
      destinationKo: "오사카",
      nights: 4,
      days: 5,
      checkInIso: null,
      checkOutIso: null,
    },
    expand: false,
    skipUserChat: true,
  });
  assert.ok(sync);
  assert.ok(sync!.nodes.length > 0);
  assert.ok(
    sync!.nodes.every(
      (n) => Number.isFinite(n.lat) && Number.isFinite(n.lng),
    ),
  );

  const enriched = await prepareTripWorkspaceDraftAsync({
    utterance,
    contextEventId: CTX,
    tripPrep: {
      destinationKo: "오사카",
      nights: 4,
      days: 5,
      checkInIso: null,
      checkOutIso: null,
    },
    expand: false,
    skipUserChat: true,
    enrichOnly: true,
  });
  assert.ok(enriched);
  assert.ok(enriched!.nodes.length > 0);
  assert.ok(
    enriched!.nodes.every(
      (n) => Number.isFinite(n.lat) && Number.isFinite(n.lng),
    ),
  );

  const withPhoto = materialized.stops.find((s) => s.thumbnailUrl);
  if (withPhoto) {
    const node = enriched!.nodes.find((n) => n.placeId === withPhoto.id);
    assert.ok(node);
    assert.equal(node!.thumbnailUrl, withPhoto.thumbnailUrl);
  }

  const withAmount = materialized.stops.find((s) => s.amountLabel);
  if (withAmount) {
    const node = enriched!.nodes.find((n) => n.placeId === withAmount.id);
    assert.ok(node);
    assert.equal(node!.amountLabel, withAmount.amountLabel);
  }

  console.log(
    "ok place-entity-materialize",
    `slots=${slots.length}`,
    `nodes=${enriched!.nodes.length}`,
    `resolved=${enriched!.nodes.filter((n) => n.tags.includes("entity_resolved")).length}`,
    `thumbs=${enriched!.nodes.filter((n) => n.thumbnailUrl).length}`,
    `priced=${enriched!.nodes.filter((n) => n.amountLabel).length}`,
  );

  clearWorkspaceChat(CTX);
  clearContextWorkspace(CTX);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

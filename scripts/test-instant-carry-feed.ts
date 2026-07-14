/**
 * Instant Carry feed model — Continuity hero + rows + dense + near (S3).
 * Run: npx tsx scripts/test-instant-carry-feed.ts
 */
import assert from "node:assert/strict";
import { writeContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { buildInstantCarryFeed } from "../lib/globe/instant-carry/build-instant-carry-feed";
import {
  clearInstantCarryEntityAnchors,
  readInstantCarryEntityAnchors,
  recordInstantCarryAnchorsFromUtterance,
} from "../lib/globe/instant-carry/instant-carry-entity-anchor-store";
import type { GlobeContextTrigger } from "../lib/globe/context-triggers/globe-context-trigger-types";

function trigger(
  partial: Partial<GlobeContextTrigger> & Pick<GlobeContextTrigger, "id" | "kind" | "title">,
): GlobeContextTrigger {
  return {
    eventId: partial.eventId ?? partial.id,
    body: partial.body ?? partial.title,
    emoji: partial.emoji ?? "·",
    ctaLabel: partial.ctaLabel ?? "열기",
    mediaPreviews: partial.mediaPreviews,
    personKey: partial.personKey,
    ...partial,
  };
}

const resume = {
  eventId: "ev-resume",
  title: "도쿄 말차 고르는 중",
  placeLabel: "도쿄역",
  kind: "context" as const,
  updatedAtIso: new Date().toISOString(),
};

const triggers: GlobeContextTrigger[] = [
  trigger({
    id: "t1",
    kind: "place_recall",
    title: "도쿄역 말차",
    body: "도쿄역 근처 말차",
    mediaPreviews: [
      {
        id: "m1",
        imageUrl: "https://example.com/a.jpg",
        mediaContextId: null,
        kind: "photo",
      },
      {
        id: "m2",
        imageUrl: "https://example.com/b.jpg",
        mediaContextId: null,
        kind: "photo",
      },
    ],
  }),
  trigger({
    id: "t2",
    kind: "place_recall",
    title: "도쿄역 카페",
    body: "도쿄역 옆",
  }),
  trigger({
    id: "t3",
    kind: "travel_recall",
    title: "오사카 여행",
    body: "첫날",
  }),
  trigger({
    id: "t4",
    kind: "travel_recall",
    title: "오사카 저녁",
    body: "둘째 날",
  }),
];

{
  const model = buildInstantCarryFeed({
    showResume: true,
    resume,
    triggers,
    lens: "traces",
  });
  assert.equal(model.hero?.kind, "resume");
  assert.equal(model.hero?.title, "도쿄 말차 고르는 중");
  assert.ok((model.hero?.progress ?? 0) > 0.2);
  assert.ok(model.thenThere.length >= 2);
  assert.ok(model.meaningLanes.some((lane) => lane.title.includes("도쿄역")));
  assert.ok(model.dense.length >= 2);
  assert.ok(
    model.nearLanes.some((lane) => lane.title.includes("도쿄역") && lane.posters.length >= 1),
    "S3 near lane should bind Tokyo Station to personal traces",
  );
  assert.equal(
    model.nearLanes.find((lane) => lane.title.includes("도쿄역"))?.seedQuery,
    "도쿄역 근처",
  );
}

{
  const model = buildInstantCarryFeed({
    showResume: false,
    resume: null,
    triggers,
    lens: "todo",
  });
  assert.equal(model.hero, null);
  assert.equal(model.thenThere.length, 0);
  assert.equal(model.nearLanes.length, 0);
}

{
  const model = buildInstantCarryFeed({
    showResume: false,
    resume: null,
    triggers,
    lens: "context",
  });
  assert.ok(model.meaningLanes.length >= 1);
  assert.equal(model.thenThere.length, 0);
  assert.ok(model.nearLanes.length >= 1);
}

{
  clearInstantCarryEntityAnchors();
  recordInstantCarryAnchorsFromUtterance("나리타 공항 근처 호텔");
  const anchors = readInstantCarryEntityAnchors();
  assert.ok(
    anchors.some((row) => /나리타|Narita/i.test(row.label) || row.kind === "Airport"),
    "scout-style utterance should record airport/station anchor",
  );

  writeContextConditionLastBatch("ev-s3-test", {
    batchId: "batch-s3",
    count: 1,
    summaryKo: "test",
    atIso: new Date().toISOString(),
    triggerMessage: "도쿄역 근처 말차",
  });
  assert.ok(
    readInstantCarryEntityAnchors().some(
      (row) => row.label.includes("도쿄") || row.id.toLowerCase().includes("tokyo"),
    ),
  );

  const nearOnly = buildInstantCarryFeed({
    showResume: false,
    resume: null,
    triggers: [],
    lens: "near",
  });
  assert.ok(nearOnly.nearLanes.length >= 1);
  assert.equal(nearOnly.thenThere.length, 0);
  clearInstantCarryEntityAnchors();
}

console.log("test-instant-carry-feed: ok");

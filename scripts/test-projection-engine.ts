#!/usr/bin/env npx tsx
/**
 * Projection Engine — Intent → Project → Ontology → Globe (no auto-Commit).
 */

import assert from "node:assert/strict";
import {
  PROJECTION_ENGINE_SYSTEM_PROMPT,
  PROJECTION_STAGE_PROGRESS_KO,
  compileRealityProjection,
  inferProjectionGoal,
} from "../lib/projection-engine";
import { narrateScoutPlan } from "../lib/globe/narrator-engine/narrate-scout-plan";
import type { ScoutNarrationPlan } from "../lib/globe/narrator-engine/types";

assert.ok(PROJECTION_ENGINE_SYSTEM_PROMPT.includes("Projection Engine"));
assert.ok(PROJECTION_ENGINE_SYSTEM_PROMPT.includes("Never execute automatically"));
assert.ok(PROJECTION_ENGINE_SYSTEM_PROMPT.includes("Projection is primary"));

{
  const goal = inferProjectionGoal("유성 뜨끈한 국물 맛집");
  assert.equal(goal.kind, "eat");
  assert.equal(goal.placeHint, "유성");
  assert.match(goal.summaryKo, /먹을/);
}

{
  const goal = inferProjectionGoal("I'm going to Osaka next month");
  assert.equal(goal.kind, "travel");
}

{
  const goal = inferProjectionGoal("노트북 하나 사야 해");
  assert.equal(goal.kind, "purchase");
}

{
  const projection = compileRealityProjection({
    utterance: "유성 국밥",
  });
  assert.equal(projection.version, 1);
  assert.equal(projection.goal.kind, "eat");
  assert.equal(projection.project.kind, "eat");
  assert.ok(projection.ontology.nodes.some((n) => n.kind === "Place"));
  assert.ok(projection.ontology.nodes.some((n) => n.kind === "Restaurant"));
  assert.ok(projection.ontology.relations.some((r) => r.kind === "located_in"));
  assert.ok(projection.clusters.some((c) => c.kind === "food"));
  assert.ok(projection.suggestedTasks.length >= 1);
  assert.equal(projection.projection.entities.length, 0);
  assert.equal(projection.commitCandidates.length, 0);
  assert.notEqual(projection.stage, "WAIT_COMMIT");
}

{
  const projection = compileRealityProjection({
    utterance: "오사카 3박 여행",
  });
  assert.equal(projection.project.kind, "travel");
  assert.ok(projection.ontology.nodes.some((n) => n.kind === "Hotel"));
  assert.ok(projection.suggestedTasks.some((t) => t.verb === "reserve"));
}

assert.equal(
  PROJECTION_STAGE_PROGRESS_KO.SEARCH,
  "🔎 검색 중…",
);
assert.equal(
  PROJECTION_STAGE_PROGRESS_KO.PROJECT_GLOBE,
  "🗺 Globe에 결과를 투영하는 중…",
);
assert.match(
  PROJECTION_STAGE_PROGRESS_KO.WAIT_COMMIT,
  /후보 위치를 표시했습니다/,
);

{
  const plan: ScoutNarrationPlan = {
    version: 1,
    mode: "Continue",
    intent: "Search",
    domain: "Eatery",
    entityLabelKo: "국밥",
    dropLabelsKo: [],
    keepLabelsKo: [],
    anchorLabelKo: "유성",
    sortHint: "rating",
  };
  const narration = narrateScoutPlan(plan);
  const texts = narration.progressSteps.map((s) => s.textKo);
  assert.ok(texts.some((t) => t.includes("검색 중")));
  assert.ok(texts.some((t) => t.includes("Globe에 결과를 투영")));
  assert.ok(texts.some((t) => t.includes("후보 위치를 표시")));
}

console.log("test-projection-engine: ok");

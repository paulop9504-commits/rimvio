#!/usr/bin/env npx tsx
/**
 * Resolution Pipeline — Intent → … → Execution (approval gate).
 */

import assert from "node:assert/strict";
import {
  buildResolutionTimeline,
  projectResolutionBundleAtPhase,
  runResolutionPipeline,
  RESOLUTION_PHASES,
} from "../lib/resolution";
import { compileIntentBlueprint } from "../lib/intent-engine";

{
  const blueprint = compileIntentBlueprint({
    text: "신혼여행인데 인디감성으로 가고 싶어",
  });
  const bundle = runResolutionPipeline({
    text: "신혼여행인데 인디감성으로 가고 싶어",
    blueprint,
  });

  assert.equal(bundle.version, 1);
  assert.ok(bundle.phases.intent.data.libraryIds.includes("travel.honeymoon"));
  assert.ok(bundle.phases.intent.data.libraryIds.includes("mood.indie"));
  assert.ok(bundle.phases.semantic.data.moods.includes("Romantic"));
  assert.ok(bundle.phases.semantic.data.moods.includes("Indie"));
  assert.ok(bundle.phases.context.data.missing.includes("destination"));
  assert.ok(
    bundle.phases.research.data.some((r) => r.engineId === "lodging_search"),
  );
  assert.ok(
    bundle.phases.simulation.data.some((s) => s.outcome === "would_ask"),
  );
  assert.equal(bundle.phases.decision.data.lodgingPriority, "aesthetic");
  assert.equal(bundle.phases.decision.data.foodBias, "cafe");
  assert.ok(
    bundle.phases.reality_planner.data.some((s) => s.requiresHuman),
  );
  assert.equal(bundle.phases.execution.data.status, "blocked");
  assert.equal(bundle.waitingApproval, true);
}

{
  const bundle = runResolutionPipeline({
    text: "신혼여행인데 인디감성으로",
    destinationLabel: "오사카",
    companionMode: "couple",
    hasActivePlan: true,
    contextEventId: "evt-test",
  });
  assert.equal(bundle.phases.context.data.destinationLabel, "오사카");
  assert.ok(
    bundle.phases.simulation.data.every(
      (s) => s.id === "sim.ask_destination" || s.outcome !== "would_block",
    ),
  );
  // destination present → execution waiting approval (human plan steps remain)
  assert.equal(bundle.phases.execution.data.status, "waiting_approval");
}

{
  const bundle = runResolutionPipeline({
    text: "신혼여행인데 인디감성으로",
  });
  const atResearch = projectResolutionBundleAtPhase(bundle, "research");
  assert.equal(atResearch.currentPhase, "research");
  assert.equal(atResearch.phases.intent.status, "done");
  assert.equal(atResearch.phases.semantic.status, "done");
  assert.equal(atResearch.phases.context.status, "done");
  assert.equal(atResearch.phases.research.status, "in_progress");
  assert.equal(atResearch.phases.decision.status, "pending");

  const timeline = buildResolutionTimeline(bundle, "decision");
  assert.equal(timeline.lanes.length, RESOLUTION_PHASES.length);
  assert.equal(timeline.lanes.find((l) => l.id === "decision")?.status, "in_progress");
  assert.equal(timeline.lanes.find((l) => l.id === "intent")?.status, "done");
  assert.equal(timeline.lanes.find((l) => l.id === "execution")?.status, "pending");
}

console.log("✓ resolution pipeline (intent→execution gate)");

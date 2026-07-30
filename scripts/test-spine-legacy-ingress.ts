/**
 * ADR-043 — all legacy generations enter Agent Spine.
 * Run: npx tsx scripts/test-spine-legacy-ingress.ts
 */

import assert from "node:assert/strict";
import { runNaturalLanguagePipeline } from "@/lib/context-run/run-natural-language-pipeline";
import { planRimvioEngineTurn } from "@/lib/engine";
import {
  readLastAgentSpineIngress,
  spineIngressFromLegacy,
} from "@/lib/workstream";

// Direct helper
const a = spineIngressFromLegacy({
  source: "action-chat",
  contextEventId: "ctx-spine-a",
  utterance: "오사카 여행",
});
assert.equal(a.source, "action-chat");
assert.equal(readLastAgentSpineIngress()?.contextEventId, "ctx-spine-a");

// context-run NL pipeline
runNaturalLanguagePipeline({
  utterance: "숙소 찾아줘",
  contextEventId: "ctx-spine-nl",
});
assert.equal(readLastAgentSpineIngress()?.source, "context-run");
assert.equal(readLastAgentSpineIngress()?.contextEventId, "ctx-spine-nl");

// engine
planRimvioEngineTurn({
  message: "호텔 준비해줘",
  event: {
    id: "ctx-spine-engine",
    title: "오사카",
    category: "travel",
    source: "message",
    lifecycle: "active",
    confidence: 0.9,
    lifecycleUpdatedAt: "2026-07-30T00:00:00.000Z",
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
  },
});
assert.equal(readLastAgentSpineIngress()?.source, "engine");
assert.equal(
  readLastAgentSpineIngress()?.contextEventId,
  "ctx-spine-engine",
);

console.log("OK — spine-legacy-ingress");

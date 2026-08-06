#!/usr/bin/env npx tsx
/**
 * Overseas light-trip dest — never attach Hawaii onto open Osaka.
 * Run: npx tsx scripts/test-overseas-trip-dest.ts
 */
import assert from "node:assert/strict";

import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { isNewTripGlobeIngressUtterance } from "@/lib/context-run/is-new-trip-globe-ingress-utterance";
import { shouldSpawnNewContext } from "@/lib/context-run/should-spawn-new-context";
import { planContextRun } from "@/lib/context-run/plan-context-run";
import { bindSituation } from "@/lib/context-run/bind-situation";
import { shouldAutoCommitContextCreate } from "@/lib/globe-ingress/should-auto-commit-context-create";
import type { PendingContextCreateDraft } from "@/lib/globe-ingress/pending-context-create-store";

for (const t of [
  "하와이로 간다",
  "하와이 가요",
  "괌 가요",
  "사이판 갈게",
  "발리로 갈게",
  "칸쿤 간다",
]) {
  assert.ok(extractTravelDestination(t), `dest: ${t}`);
  assert.equal(isNewTripGlobeIngressUtterance(t), true, `new trip: ${t}`);
  assert.equal(
    shouldSpawnNewContext({
      utterance: t,
      activeContextEventId: "osaka-evt",
      activeWorkspaceKind: "travel",
    }),
    true,
    `spawn off Osaka: ${t}`,
  );
  const plan = planContextRun(
    bindSituation({
      kind: "text",
      text: t,
      surface: "composer",
      layerMode: "personal",
      contextEventId: "osaka-evt",
    }),
  );
  assert.equal(plan.kind, "globe_ingress", `plan: ${t} → ${plan.kind}`);
}

assert.equal(extractTravelDestination("하와이로 간다"), "하와이");
assert.equal(extractTravelDestination("괌 가요"), "괌");

assert.equal(
  shouldAutoCommitContextCreate({
    graphId: "g",
    utterance: "하와이로 간다",
    travelSlots: { destination: "하와이" },
    anchorLabelKo: "하와이",
  } as PendingContextCreateDraft),
  true,
);

console.log("ok — overseas trip dest (Hawaii/Guam) spawns new Context, not Osaka");

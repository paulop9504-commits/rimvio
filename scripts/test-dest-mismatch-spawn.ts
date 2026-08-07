#!/usr/bin/env npx tsx
/**
 * Destination mismatch — Okinawa NL must not attach to open Osaka Workspace.
 * Run: npx tsx scripts/test-dest-mismatch-spawn.ts
 */
import assert from "node:assert/strict";
import {
  shouldSpawnNewContext,
  resolveIngressContextEventId,
} from "@/lib/context-run/should-spawn-new-context";
import {
  destinationsMatch,
  normalizeDestinationKey,
  utteranceConflictsActiveDestination,
} from "@/lib/context-run/destination-context-conflict";
import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { routeRimvioCommandMode } from "@/lib/rimvio-command/route-command-mode";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace";
import { emptyConstraintMemory } from "@/lib/agent-policy/constraint-memory";

const OSAKA = "ctx_osaka_hub";

assert.equal(normalizeDestinationKey("Okinawa"), "오키나와");
assert.equal(normalizeDestinationKey("나하"), "오키나와");
assert.equal(destinationsMatch("오키나와", "okinawa"), true);
assert.equal(destinationsMatch("오사카", "오키나와"), false);

assert.equal(extractTravelDestination("오키나와 여행지 찾아줘"), "오키나와");
assert.equal(extractTravelDestination("오키나와 숙소 보여줘"), "오키나와");

clearContextWorkspace(OSAKA);
openMapContextWorkspace({
  contextEventId: OSAKA,
  domain: "lodging",
  query: "오사카 숙소",
  summaryKo: "Osaka Trip",
  candidates: [],
});
{
  const opened = readContextWorkspace(OSAKA)!;
  writeContextWorkspace({
    ...opened,
    summaryKo: "오사카 여행",
    constraintMemory: {
      ...emptyConstraintMemory(),
      destinationKo: "오사카",
      updatedAtIso: new Date().toISOString(),
    },
    updatedAtIso: new Date().toISOString(),
  });
}

assert.equal(
  utteranceConflictsActiveDestination({
    utterance: "오키나와 여행지 추천해줘",
    activeContextEventId: OSAKA,
  }),
  true,
);

assert.equal(
  shouldSpawnNewContext({
    utterance: "오키나와 여행지 찾아줘",
    activeContextEventId: OSAKA,
    activeWorkspaceKind: "travel",
  }),
  true,
  "Okinawa seek must spawn off Osaka",
);

assert.equal(
  shouldSpawnNewContext({
    utterance: "오키나와 숙소 찾아줘",
    activeContextEventId: OSAKA,
    activeWorkspaceKind: "travel",
  }),
  true,
  "Okinawa lodging scout must not continue Osaka hub",
);

assert.equal(
  resolveIngressContextEventId({
    utterance: "오키나와 숙소 찾아줘",
    activeContextEventId: OSAKA,
    activeWorkspaceKind: "travel",
  }),
  null,
);

assert.equal(
  shouldSpawnNewContext({
    utterance: "숙소 찾아줘",
    activeContextEventId: OSAKA,
    activeWorkspaceKind: "travel",
  }),
  false,
  "bare lodging scout stays on Osaka",
);

const route = routeRimvioCommandMode({
  utterance: "오키나와 숙소 찾아줘",
  activeContextId: OSAKA,
  activeWorkspaceKind: "travel",
});
assert.equal(route.mode, "create");
assert.notEqual(route.reason, "active_domain_scout");

clearContextWorkspace(OSAKA);
console.log("test-dest-mismatch-spawn: ok");

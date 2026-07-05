#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resolveGlobeThreeFloorsStage,
  resolveRimvioUxSurfaceMode,
  shouldSuppressGlobePriorityChrome,
} from "../lib/globe/resolve-globe-three-floors-stage";
import { resolveBrainSurfaceClosureLine } from "../lib/globe/resolve-brain-surface-closure-line";

assert.equal(
  resolveGlobeThreeFloorsStage({ brainSurfaceVisible: true }),
  "replay",
);
assert.equal(
  resolveGlobeThreeFloorsStage({ showMapVideoReplay: true }),
  "replay",
);
assert.equal(
  resolveGlobeThreeFloorsStage({
    brainSurfaceVisible: true,
    showOntologyPeek: true,
    brainSurfaceDisclosureStage: "related",
  }),
  "context",
);
assert.equal(
  resolveGlobeThreeFloorsStage({
    brainSurfaceVisible: true,
    brainSurfaceDisclosureStage: "detail",
  }),
  "action",
);
assert.equal(
  resolveGlobeThreeFloorsStage({ fieldExecutionOpen: true }),
  "action",
);

assert.equal(resolveRimvioUxSurfaceMode({ fieldExecutionOpen: false }), "globe");
assert.equal(resolveRimvioUxSurfaceMode({ fieldExecutionOpen: true }), "field");

assert.equal(
  shouldSuppressGlobePriorityChrome({ showOntologyPeek: true }),
  true,
);
assert.equal(
  shouldSuppressGlobePriorityChrome({ brainSurfaceVisible: false }),
  false,
);

const line = resolveBrainSurfaceClosureLine({
  id: "a",
  label: "상하이",
  relationMemoKo: "올해 여름 정성이랑",
  previewBody: "올해 여름 정성이랑",
} as never);
assert.equal(line, "올해 여름 정성이랑");

console.log("test-globe-three-floors-stage: ok");

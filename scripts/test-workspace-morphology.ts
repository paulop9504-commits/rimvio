#!/usr/bin/env npx tsx
/**
 * Context Type → Morphology (ADR-033) — auto, never user-picked.
 */

import assert from "node:assert/strict";
import {
  CONTEXT_TYPE_DEFS,
  WORKSPACE_MORPHOLOGIES,
  listCatalogContextTypes,
  listLiveContextTypes,
  morphologyForSdkKind,
  resolveWorkspaceMorphology,
} from "../lib/workspace-morphology";
import { buildWorkspaceSdkFrame, listWorkspaceSdkRecipes } from "../lib/workspace-sdk";

assert.ok(WORKSPACE_MORPHOLOGIES.length >= 20);
assert.equal(listLiveContextTypes().length, 3);
assert.ok(listCatalogContextTypes().length >= 10);
assert.equal(
  CONTEXT_TYPE_DEFS.every((row) =>
    (WORKSPACE_MORPHOLOGIES as readonly string[]).includes(row.morphologyId),
  ),
  true,
);

assert.equal(morphologyForSdkKind("travel"), "spatial_timeline");
assert.equal(morphologyForSdkKind("used_goods"), "card_pipeline");
assert.equal(morphologyForSdkKind("driver"), "vehicle_dashboard");

{
  const resolved = resolveWorkspaceMorphology({ sdkKind: "travel" });
  assert.equal(resolved.contextTypeId, "travel");
  assert.equal(resolved.morphologyId, "spatial_timeline");
  assert.match(resolved.context.coreQuestionKo, /어디/);
}

for (const recipe of listWorkspaceSdkRecipes()) {
  const frame = buildWorkspaceSdkFrame({ kind: recipe.kind });
  assert.equal(frame.morphologyId, recipe.morphologyId);
  assert.equal(frame.morphologyId, morphologyForSdkKind(recipe.kind));
}

// Catalog manufacturing = B2B process_flow — doctrine only until recipe ships.
{
  const mfg = CONTEXT_TYPE_DEFS.find((row) => row.id === "manufacturing");
  assert.ok(mfg);
  assert.equal(mfg!.morphologyId, "process_flow");
  assert.equal(mfg!.ship, "catalog");
  assert.equal(mfg!.sdkKind, null);
}

console.log("ok — workspace-morphology");

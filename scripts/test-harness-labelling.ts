#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  appendLabellingAction,
  applySandboxSurface,
  canAdvanceLabellingStep,
  createSandboxLabellingDraft,
  setExtractFields,
  surfaceToRuntimeType,
  updateLabellingOverview,
} from "@/lib/harness/labelling";
import { validateHarness } from "@/lib/harness/validate";

function main() {
  let h = createSandboxLabellingDraft({
    name: "Test Search",
    surface: "web",
    now: "2026-09-06T08:00:00.000Z",
  });
  assert.equal(h.runtime.type, "BROWSER");
  assert.equal(h.runtime.environment, "sandbox");
  assert.equal(surfaceToRuntimeType("local"), "DESKTOP");

  h = updateLabellingOverview(h, {
    name: "Test Search",
    description: "demo",
    targetHost: "www.coupang.com",
  });
  assert.ok(h.nodes.some((n) => n.id === "n_trigger"));

  let gate = canAdvanceLabellingStep(h, 2);
  assert.equal(gate.ok, false);

  h = appendLabellingAction(h, {
    type: "CLICK",
    target: { selector: "#headerSearchKeyword" },
  });
  gate = canAdvanceLabellingStep(h, 2);
  assert.equal(gate.ok, true);

  h = setExtractFields(h, [{ name: "price", selector: ".price", type: "number" }]);
  const local = applySandboxSurface(h, "local", { resetActions: true });
  assert.equal(local.runtime.type, "DESKTOP");
  assert.equal(
    local.nodes.find((n) => n.id === "n_research")?.actions.length ?? -1,
    0,
  );

  h = appendLabellingAction(h, {
    type: "TYPE",
    target: { selector: "#headerSearchKeyword" },
    input: "{{keyword}}",
    variable: "keyword",
  });
  const checked = validateHarness(h);
  assert.equal(checked.ok, true, JSON.stringify(checked));

  console.log("test-harness-labelling: PASS");
}

main();

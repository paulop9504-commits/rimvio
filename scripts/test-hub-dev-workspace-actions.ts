/**
 * Dev Hub dead-UI wiring — invoke + workspace command + schema sample.
 */
import assert from "node:assert/strict";
import {
  paneForActivityId,
  paneForBlueprintCard,
} from "@/lib/hub/dev/hub-workspace-commands";
import {
  buildDevInvokeSampleInput,
  buildDevSchemaPreview,
} from "@/lib/hub/dev/dev-schema-preview";
import { invokeDevCapability, validateDevInvokeInput } from "@/lib/hub/dev/invoke-dev-capability";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";

assert.equal(paneForBlueprintCard("Capabilities"), "capabilities");
assert.equal(paneForBlueprintCard("Platform Health"), "status");
assert.equal(paneForActivityId("a2"), "issues");
assert.equal(paneForActivityId("a3"), "tests");

const searchAction = {
  id: "hotel.search",
  name: "hotel.search",
  description: "search",
  inputSchema: "hotel.search.request",
  outputSchema: "hotel.search.response",
  approvalRequired: false,
};

const sample = buildDevInvokeSampleInput(searchAction, {
  destination: "Namba Station",
  checkIn: "2026-06-15",
  checkOut: "2026-06-17",
  guests: 2,
});
assert.equal(sample.destination, "Namba Station");
assert.equal(sample.guests, 2);

const preview = buildDevSchemaPreview(searchAction);
assert.ok(preview.input);
assert.ok(preview.output);

const ok = validateDevInvokeInput(JSON.stringify(sample));
assert.equal(ok.ok, true);

const bad = validateDevInvokeInput("not-json");
assert.equal(bad.ok, false);

const notObject = validateDevInvokeInput("[]");
assert.equal(notObject.ok, false);

async function main(): Promise<void> {
  const draft = {
    ...createDefaultPlatformDraft(),
    actions: [searchAction],
  };
  const record = await invokeDevCapability({
    draft,
    action: searchAction,
    rawInput: JSON.stringify(sample),
  });
  assert.equal(record.capabilityId, "hotel.search");
  assert.ok(typeof record.latencyMs === "number");
  assert.ok(record.ok || Boolean(record.errorKo));
  console.log("test-hub-dev-workspace-actions: ok");
}

void main();

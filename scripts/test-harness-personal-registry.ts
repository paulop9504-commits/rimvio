/**
 * Personal Harness registry — parse / execute gate (no DB).
 */
import assert from "node:assert/strict";
import { buildSampleShoppingSearchHarness } from "../lib/harness/fixtures";
import {
  canExecutePersonalHarness,
  parseUserHarnessPatchBody,
  parseUserHarnessUpsertBody,
} from "../lib/harness/personal-registry";

function main() {
  const harness = buildSampleShoppingSearchHarness();

  const upsertOk = parseUserHarnessUpsertBody({
    harness,
    enabled: true,
    status: "draft",
    visibility: "private",
  });
  assert.equal(upsertOk.ok, true);
  if (upsertOk.ok) {
    assert.equal(upsertOk.input.status, "draft");
    assert.equal(upsertOk.input.visibility, "private");
    assert.equal(upsertOk.input.enabled, true);
  }

  const upsertBad = parseUserHarnessUpsertBody({ harness: { id: "x" } });
  assert.equal(upsertBad.ok, false);

  const patchOk = parseUserHarnessPatchBody({ enabled: false });
  assert.equal(patchOk.ok, true);
  if (patchOk.ok) {
    assert.equal(patchOk.patch.enabled, false);
  }

  const patchEmpty = parseUserHarnessPatchBody({});
  assert.equal(patchEmpty.ok, false);

  const execOn = canExecutePersonalHarness({ enabled: true, harness });
  assert.equal(execOn.ok, true);

  const execOff = canExecutePersonalHarness({ enabled: false, harness });
  assert.equal(execOff.ok, false);
  assert.ok(execOff.issues.includes("harness_disabled"));

  console.log("test-harness-personal-registry: ok");
}

main();

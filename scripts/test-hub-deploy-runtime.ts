import assert from "node:assert/strict";
import { createDefaultCapabilityDraft } from "@/lib/hub/capability/defaults";
import {
  planHubDeployTurn,
  prepareDraftForAgentPublish,
  publishDraftToHub,
  resolveDeployIntent,
  validateDraftManifest,
} from "@/lib/hub/deploy/hub-deploy-runtime";

assert.equal(resolveDeployIntent("배포해"), "deploy");
assert.equal(resolveDeployIntent("테스트 돌려"), "test");
assert.equal(resolveDeployIntent("오사카 여행 만들어"), "build");

const draft = createDefaultCapabilityDraft();
const prepared = prepareDraftForAgentPublish(draft, true);
assert.equal(validateDraftManifest(prepared).valid, true);

const plan = planHubDeployTurn("배포해", {
  mode: "capability",
  draft: prepared,
  testsPassed: true,
});
assert.equal(plan.intent, "deploy");
assert.ok(plan.workSteps.length >= 3);

void (async () => {
  const result = await publishDraftToHub("capability", prepared, true);
  assert.equal(result.success, true);
  assert.ok(result.platformId?.startsWith("platform."));
  console.log("test-hub-deploy-runtime: ok");
})();

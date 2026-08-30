/**
 * Experience OS — shared Resource API + blueprint + verification (no Playwright required).
 */

import assert from "node:assert/strict";
import {
  applyExperienceBlueprintToDraft,
  experienceBlueprintFromUtterance,
  experienceBlueprintFromTemplate,
  infrastructureForCapability,
  invokeExperienceResource,
  parseResourceOpFromUtterance,
  refineExperienceBlueprint,
  resetExperienceResources,
  runExperienceVerification,
} from "@/lib/hub/dev/experience-os";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { createOsakaStayPlatformDraft } from "@/lib/hub/dev/blueprint";
import { invokeHubWorkspaceTool } from "@/lib/hub/dev/hub-workspace-tools";
import { planHubAgentTurnRegex } from "@/lib/hub/dev/hub-agent-planner";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";

function executorFor(initial = createDefaultPlatformDraft()) {
  let draft = initial;
  const executor: DeployExecutorCallbacks = {
    mode: "platform",
    getDraft: () => draft,
    updateDraft: (patch) => {
      draft = { ...draft, ...patch };
    },
    runSandboxTest: async () => ({ passed: true }),
    onPublishSuccess: () => {},
    onGoToStep: () => {},
  };
  return { executor, getDraft: () => draft };
}

async function testBlueprintFromIdea() {
  const travel = experienceBlueprintFromUtterance("여행 예약 플랫폼 만들어줘");
  assert.equal(travel.templateId, "travel");
  assert.ok(travel.pages.includes("Search"));
  assert.ok(travel.data.includes("bookings"));
  assert.ok(travel.nodes.length > 4);

  const commerce = experienceBlueprintFromUtterance("온라인 쇼핑몰 만들어줘");
  assert.equal(commerce.templateId, "commerce");

  const refined = refineExperienceBlueprint(commerce, "의류 대신 중고 카메라 거래 플랫폼으로 바꿔줘");
  assert.equal(refined.templateId, "marketplace");

  const draft = applyExperienceBlueprintToDraft(experienceBlueprintFromTemplate("saas"));
  assert.ok(draft.actions.some((a) => a.name.startsWith("team.") || a.name.startsWith("project.")));
  assert.match(draft.dataCollectionsJson, /projects/);
}

async function testSharedResourceApi() {
  resetExperienceResources();
  const draft = createDefaultPlatformDraft();
  const created = await invokeExperienceResource(
    "database.createTable",
    { name: "products" },
    {
      draft,
      updateDraft: (patch) => Object.assign(draft, patch),
    },
  );
  assert.equal(created.ok, true);
  const listed = await invokeExperienceResource("database.listTables", {}, { draft });
  assert.equal(listed.ok, true);
  const tables = (listed.data as { tables: string[] }).tables;
  assert.ok(tables.includes("products"));

  const secret = await invokeExperienceResource("secret.set", { name: "STRIPE_SECRET_KEY" }, { draft });
  assert.equal(secret.ok, true);
  const secrets = await invokeExperienceResource("secret.list", {}, { draft });
  const names = (secrets.data as { secrets: Array<{ name: string }> }).secrets.map((s) => s.name);
  assert.ok(names.includes("STRIPE_SECRET_KEY"));
  assert.ok(!JSON.stringify(secrets.data).includes("sk_live"));
}

async function testCapabilityInfraAndVerify() {
  resetExperienceResources();
  const steps = infrastructureForCapability("payment.prepare");
  assert.ok(steps.some((s) => s.op === "secret.set"));
  assert.ok(steps.some((s) => s.op === "database.createTable"));

  const parsed = parseResourceOpFromUtterance("호텔 검색 기능 추가해줘");
  assert.equal(parsed?.op, "capability.compose");

  const draft = createOsakaStayPlatformDraft();
  const compose = await invokeExperienceResource("capability.compose", { capabilityId: "hotel.search" }, { draft });
  assert.equal(compose.ok, true);

  const report = await runExperienceVerification({ draft });
  assert.equal(typeof report.ok, "boolean");
  assert.ok(report.layers.some((l) => l.id === "smoke"));
  assert.ok(report.layers.some((l) => l.id === "e2e" && l.skipped));
}

async function testUiAndAgentSameTool() {
  resetExperienceResources();
  const { executor, getDraft } = executorFor();
  const snapshot = buildProjectSnapshot({ draft: getDraft() });
  const result = await invokeHubWorkspaceTool(
    "resource.apply",
    { utterance: "상품 테이블 만들어줘" },
    {
      getDraft,
      updateDraft: (patch) => executor.updateDraft(patch),
      snapshot,
      executor,
      connections: {},
    },
  );
  assert.equal(result.ok, true);
  assert.match(getDraft().dataCollectionsJson, /records|products|listings/);
}

async function testPlannerInfrastructure() {
  const draft = createDefaultPlatformDraft();
  const snapshot = buildProjectSnapshot({ draft });
  const inspect = {
    platformName: draft.name,
    capabilities: draft.actions.map((a) => a.name),
    files: [] as const,
    issues: snapshot.issues,
    commerce: draft.commerceNotes,
    connections: {},
    sources: snapshot.sources,
    capabilityCount: draft.actions.length,
  };
  const steps = planHubAgentTurnRegex("호텔 검색 기능 추가해줘", inspect as never, false);
  assert.ok(steps.some((s) => s.toolId === "resource.apply"));
  assert.ok(steps.some((s) => s.toolId === "verification.run"));
}

async function main() {
  await testBlueprintFromIdea();
  await testSharedResourceApi();
  await testCapabilityInfraAndVerify();
  await testUiAndAgentSameTool();
  await testPlannerInfrastructure();
  console.log("test-experience-os: ok");
}

void main();

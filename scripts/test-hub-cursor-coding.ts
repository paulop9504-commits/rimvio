import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  detectGoalChange,
  inferImplicitIntent,
  rememberOperatorFocus,
  resolveReferences,
  resolveOperatorTurn,
  writeOperatorMemory,
} from "../lib/hub/dev/conversation-memory";
import { parseLlmPlanJson, isKnownHubToolId } from "../lib/hub/dev/operator-llm-planner";
import {
  parseGitHubRepoFromUtterance,
  wantsRepoClone,
  sanitizeRepoError,
  isRepoRelPathAllowed,
  writeRepoFile,
  readRepoFile,
  deleteRepoFile,
  listRepoFiles,
  analyzeRepoImports,
  findRepoDefinition,
  transformRepoFile,
} from "../lib/hub/dev/coding-agent/repo-workspace";
import { discoverRepoTests, generateRepoTestFile, parseVerifyFailures } from "../lib/hub/dev/coding-agent/repo-verify";
import {
  detectVerifyRegression,
  planRegressionRepair,
  snapshotVerifyResults,
} from "../lib/hub/dev/coding-agent/regression-repair";
import { classifyIntent } from "../lib/agent/conversation/classify-intent";
import { invokeHubWorkspaceTool } from "../lib/hub/dev/hub-workspace-tools";
import { createDefaultPlatformDraft } from "../lib/hub/platform/defaults";
import { buildProjectSnapshot } from "../lib/hub/dev/dev-project-state";
import { setRepoSession } from "../lib/hub/dev/coding-agent/repo-session";
import type { DeployExecutorCallbacks } from "../lib/hub/deploy/hub-deploy-runtime";
import { capabilityCoverage } from "../lib/hub/dev/agent-capability-registry";

function testReferences() {
  writeOperatorMemory("p1", {
    platformId: "p1",
    currentGoal: "호텔 검색 고쳐",
    lastFiles: ["lib/hotel/search.ts"],
    lastCapabilities: ["hotel.search"],
    lastSymbols: ["searchHotels"],
    lastObjects: ["hotel.search"],
    lastUtterance: "hotel.search 가격 정렬",
    history: ["hotel.search 가격 정렬"],
    currentTask: "price sort",
    workInProgress: true,
  });
  const memory = rememberOperatorFocus("p1", { files: ["lib/hotel/search.ts"] });
  const ref = resolveReferences("그거 고쳐줘", memory);
  assert.equal(ref.hadReference, true);
  assert.match(ref.expandedUtterance, /lib\/hotel\/search\.ts/);

  const implicit = inferImplicitIntent("고쳐", memory);
  assert.equal(implicit.inferred, true);
  assert.match(implicit.expandedUtterance, /search/);

  const change = detectGoalChange({
    utterance: "말고 결제부터 만들어",
    memory,
    nextGoal: "결제 워크플로우 생성",
  });
  assert.equal(change.changed, true);

  const turn = resolveOperatorTurn({ utterance: "이 기능 테스트해", memory });
  assert.equal(turn.reference.hadReference, true);
}

function testClassify() {
  assert.equal(classifyIntent("owner/repo 클론해").intent, "modify");
  assert.equal(classifyIntent("그거 고쳐").intent, "modify");
  assert.equal(classifyIntent("lint 돌려").intent, "test");
  assert.equal(classifyIntent("타입 체크").intent, "test");
  assert.equal(classifyIntent("e2e 실행").intent, "test");
  assert.equal(classifyIntent("개발 서버 켜").intent, "modify");
  assert.equal(classifyIntent("깃허브 연결").intent, "connect");
}

function testLlmPlanParse() {
  const parsed = parseLlmPlanJson(`{
    "goalKo": "레포 클론 후 타입체크",
    "steps": [
      { "id": "1", "label": "클론", "toolId": "repo.clone", "args": { "utterance": "a/b" } },
      { "id": "2", "label": "타입", "toolId": "typecheck.run" },
      { "id": "3", "label": "bad", "toolId": "rm -rf" }
    ]
  }`);
  assert.ok(parsed);
  assert.equal(parsed.steps.length, 2);
  assert.equal(isKnownHubToolId("repo.clone"), true);
  assert.equal(isKnownHubToolId("rm -rf"), false);
}

function testRepoFiles() {
  assert.ok(wantsRepoClone("github.com/acme/app 클론해"));
  const parsed = parseGitHubRepoFromUtterance("clone https://github.com/acme/app");
  assert.ok(parsed);
  assert.equal(parsed.owner, "acme");
  assert.equal(parsed.httpsUrl, "https://github.com/acme/app.git");
  assert.match(sanitizeRepoError("fatal bearer ghp_SECRET123 clone"), /\*\*\*/);
  assert.equal(isRepoRelPathAllowed(".env.local"), false);
  assert.equal(isRepoRelPathAllowed("lib/hotel/search.ts"), true);
  assert.equal(isRepoRelPathAllowed("../etc/passwd"), false);

  const root = mkdtempSync(join(tmpdir(), "rimvio-repo-"));
  mkdirSync(join(root, "lib"), { recursive: true });
  writeFileSync(
    join(root, "lib", "hotel.ts"),
    `export function searchHotels() { return []; }\nimport { x } from "./x";\n`,
    "utf8",
  );
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node -e \"process.exit(0)\"" } }), "utf8");

  const created = writeRepoFile({
    root,
    path: "lib/new-file.ts",
    content: "export const n = 1;\n",
  });
  assert.ok(!("error" in created));
  assert.equal(created.created, true);
  assert.ok(readRepoFile(root, "lib/new-file.ts")?.content.includes("n = 1"));

  const transformed = transformRepoFile({
    root,
    path: "lib/new-file.ts",
    find: "n = 1",
    replace: "n = 2",
  });
  assert.ok(!("error" in transformed));
  assert.equal(readRepoFile(root, "lib/new-file.ts")?.content.includes("n = 2"), true);

  const def = findRepoDefinition({ root, symbol: "searchHotels" });
  assert.ok(def);
  assert.equal(analyzeRepoImports({ root, path: "lib/hotel.ts" }).includes("./x"), true);

  const discovered = discoverRepoTests({ root });
  const generated = generateRepoTestFile({ root, symbol: "searchHotels" });
  assert.ok(!("error" in generated));
  assert.ok(existsSync(join(root, generated.path)));
  assert.ok(discoverRepoTests({ root, query: "search" }).related.length >= 1);

  const deleted = deleteRepoFile(root, "lib/new-file.ts");
  assert.ok(!("error" in deleted));
  assert.equal(readRepoFile(root, "lib/new-file.ts"), null);
  assert.ok(listRepoFiles(root).includes("lib/hotel.ts"));
  assert.ok(discovered.files.length >= 0);
}

function testRegression() {
  const before = snapshotVerifyResults([
    { kind: "unit", ok: true, command: "npm test", exitCode: 0, stdout: "", stderr: "" },
  ]);
  const after = snapshotVerifyResults([
    {
      kind: "unit",
      ok: false,
      command: "npm test",
      exitCode: 1,
      stdout: "FAIL searchHotels",
      stderr: "error TS2322",
    },
  ]);
  const detected = detectVerifyRegression(before, after);
  assert.equal(detected.detected, true);
  const plan = planRegressionRepair({ after, newFailures: detected.newFailures });
  assert.equal(plan.detected, true);
  assert.ok(plan.steps.some((s) => s.toolId === "test.run"));
  assert.ok(parseVerifyFailures(after.results[0]!).length > 0);
}

async function testSandboxCreateDelete() {
  const draft = createDefaultPlatformDraft();
  draft.id = "cursor-coding-test";
  const snapshot = buildProjectSnapshot({ draft });
  const executor: DeployExecutorCallbacks = {
    mode: "platform",
    getDraft: () => draft,
    updateDraft: (patch) => Object.assign(draft, patch),
    runSandboxTest: async () => ({ passed: true }),
    onPublishSuccess: () => {},
    onGoToStep: () => {},
  };
  const ctx = {
    getDraft: () => draft,
    updateDraft: executor.updateDraft,
    snapshot,
    executor,
    connections: {},
  };

  const created = await invokeHubWorkspaceTool(
    "code.createFile",
    { path: "lib/demo/hello.ts", content: "export const hello = 1;\n" },
    ctx,
  );
  assert.equal(created.ok, true);

  const generated = await invokeHubWorkspaceTool("test.generate", { symbol: "hello" }, ctx);
  assert.equal(generated.ok, true);

  const deleted = await invokeHubWorkspaceTool("code.deleteFile", { path: "lib/demo/hello.ts" }, ctx);
  assert.equal(deleted.ok, true);

  const root = mkdtempSync(join(tmpdir(), "rimvio-sess-"));
  writeFileSync(join(root, "package.json"), '{"name":"x"}', "utf8");
  mkdirSync(join(root, "lib"), { recursive: true });
  writeFileSync(join(root, "lib", "a.ts"), "export const a = 1;\n", "utf8");
  setRepoSession({
    platformId: draft.id,
    root,
    remoteUrl: null,
    clonedAt: new Date().toISOString(),
  });
  const listed = await invokeHubWorkspaceTool("code.listFiles", {}, { ...ctx, repoRoot: root });
  assert.equal(listed.ok, true);
  const files = (listed.data as { files: string[] }).files;
  assert.ok(files.includes("lib/a.ts"));
}

async function main() {
  testReferences();
  testClassify();
  testLlmPlanParse();
  testRepoFiles();
  testRegression();
  await testSandboxCreateDelete();

  const coverage = capabilityCoverage({});
  assert.ok(coverage.planned < 20, `planned still high: ${coverage.planned}`);
  assert.ok(coverage.pctReady >= 70, `coverage ${coverage.pctReady}`);

  console.log(
    `ok hub-cursor-coding · ready ${coverage.pctReady}% · implemented ${coverage.implemented} · planned ${coverage.planned}`,
  );
}

void main();

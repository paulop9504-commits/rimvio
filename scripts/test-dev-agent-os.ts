/**
 * Rimvio Dev Agent OS — unit tests.
 */

import {
  RIMVIO_DEV_DEVELOPMENT_LOOP,
  classifyDevTask,
  decomposeProductIntent,
  buildDevAgentTaskPlan,
  mapDevPhaseToPlatformPhase,
  isDefinitionOfDoneComplete,
  emptyDefinitionOfDone,
  requiredDoneChecks,
  platformsAffectedByCapability,
} from "@/lib/hub/dev/dev-agent-os";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testDevelopmentLoop() {
  assert(RIMVIO_DEV_DEVELOPMENT_LOOP[0] === "understand", "loop starts at understand");
  assert(RIMVIO_DEV_DEVELOPMENT_LOOP.includes("connect"), "loop includes connect");
  assert(RIMVIO_DEV_DEVELOPMENT_LOOP.includes("fix"), "loop includes fix");
  assert(mapDevPhaseToPlatformPhase("build") === "act", "build → act");
  assert(mapDevPhaseToPlatformPhase("fix") === "replan", "fix → replan");
  assert(mapDevPhaseToPlatformPhase("deploy") === "commit", "deploy → commit");
}

function testTaskClassification() {
  const create = classifyDevTask("Food Platform 만들어줘");
  assert(create.taskKind === "create", "food create");
  assert(create.userIntent === "create", "create intent");

  const debug = classifyDevTask("주문이 안돼");
  assert(debug.taskKind === "debug", "debug task");
  assert(debug.userIntent === "test", "debug → test intent");

  const plan = classifyDevTask("여행 Platform 어떻게 만들면 좋을까?");
  assert(plan.taskKind === "plan", "plan task");
  assert(plan.userIntent === "question", "plan → question");

  const remove = classifyDevTask("Food Platform에서 지도 빼");
  assert(remove.taskKind === "remove", "remove task");
  assert(remove.userIntent === "modify", "remove → modify");

  const deploy = classifyDevTask("배포해");
  assert(deploy.taskKind === "deploy", "deploy task");
  assert(deploy.userIntent === "publish", "deploy → publish");

  const connect = classifyDevTask("Stripe 결제 API 붙여");
  assert(connect.taskKind === "connect", "connect task");
}

function testProductDecomposition() {
  const food = decomposeProductIntent({
    utterance: "배달앱처럼 음식 주문할 수 있게 만들어",
  });
  assert(food.platform.id === "food", "food platform");
  assert(food.capabilities.includes("cart"), "food has cart");
  assert(food.loops.includes("food_order_loop"), "food order loop");
  assert(food.workspaceFlow.includes("tracking"), "food tracking step");
  assert(food.stateKeys.includes("cart"), "cart state");

  const plan = buildDevAgentTaskPlan({
    utterance: "배달앱처럼 음식 주문할 수 있게 만들어",
  });
  assert(plan.taskKind === "create", "plan task kind");
  assert(plan.affectedPlatforms.includes("food"), "plan platform");
  assert(plan.tests.some((t) => t.startsWith("journey:")), "plan has journey test");
}

function testDefinitionOfDone() {
  const empty = emptyDefinitionOfDone();
  assert(!isDefinitionOfDoneComplete(empty, "create"), "empty create incomplete");

  const required = requiredDoneChecks("create", false);
  assert(required.includes("stateConnected"), "create requires state");
  assert(required.includes("userFlowTested"), "create requires journey test");

  const done = { ...empty };
  for (const key of required) {
    (done as Record<string, boolean>)[key] = true;
  }
  assert(isDefinitionOfDoneComplete(done, "create"), "filled create complete");
}

function testChangeImpact() {
  const affected = platformsAffectedByCapability("map", {
    platforms: [
      { id: "food", name: "Food", domain: "food", capabilities: ["map"], loops: [], integrations: [] },
      { id: "travel", name: "Travel", domain: "travel", capabilities: ["map"], loops: [], integrations: [] },
    ],
    capabilities: [
      { id: "map", name: "Map", reusable: true, usedByPlatforms: ["food", "travel"] },
    ],
    loops: [],
    integrations: [],
    workspaces: [],
  });
  assert(affected.length === 2, "map affects two platforms");
  assert(affected.includes("food") && affected.includes("travel"), "food and travel");
}

function main() {
  testDevelopmentLoop();
  testTaskClassification();
  testProductDecomposition();
  testDefinitionOfDone();
  testChangeImpact();
  console.log("test-dev-agent-os: all passed");
}

main();

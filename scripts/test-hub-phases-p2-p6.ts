/**
 * P2–P6 Hub Agent phases — observation, tool catalog, approval, events, connections.
 */

import { observeFullWorkspace } from "@/lib/agent/hub-observation";
import { evaluateToolApproval } from "@/lib/agent/approval";
import { applyControllerEventToLog, createEmptyAgentEventLog, activityEventsFromLog, changesFromLog } from "@/lib/agent/events";
import { getHubToolCatalogEntry, HUB_TOOL_CATALOG } from "@/lib/hub/dev/hub-tool-catalog";
import { listHubPlatformConnections, verifyHubPlatformConnection } from "@/lib/integrations/hub-platform";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testP2Observation() {
  const draft = createDefaultPlatformDraft();
  draft.name = "OsakaStay";
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search",
      inputSchema: "{}",
      outputSchema: "hotel.search.response.v1",
      approvalRequired: false,
    },
  ];
  const snapshot = buildProjectSnapshot({ draft });
  const obs = observeFullWorkspace({ draft, snapshot, connections: { stripe: false } });
  assert(obs.platform.platformName === "OsakaStay", "platform name");
  assert(obs.capabilities.names.includes("hotel.search"), "capabilities");
  assert(obs.lines.length >= 8, "observation lines");
}

function testP3ToolCatalog() {
  assert(HUB_TOOL_CATALOG.length >= 20, "catalog populated");
  const publish = getHubToolCatalogEntry("publish.request");
  assert(publish?.requiresApproval === true, "publish requires approval");
  assert(publish?.risk === "high", "publish high risk");
}

function testP4Approval() {
  const low = evaluateToolApproval({ toolId: "file.patch" });
  assert(low.decision === "auto", "file.patch auto");
  const high = evaluateToolApproval({ toolId: "publish.request" });
  assert(high.decision === "require_approval", "publish approval");
  const connect = evaluateToolApproval({ toolId: "connection.connect" });
  assert(connect.decision === "notify_user", "connect notify");
}

function testP5AgentEvents() {
  let log = createEmptyAgentEventLog();
  log = applyControllerEventToLog(log, { type: "intent", intent: "modify", executable: true });
  log = applyControllerEventToLog(log, {
    type: "tool",
    toolId: "file.patch",
    label: "Patch",
    status: "done",
  });
  log = applyControllerEventToLog(log, {
    type: "file_touch",
    paths: ["platform/actions/hotel.search.json"],
    touch: "modified",
  });
  const activity = activityEventsFromLog(log);
  assert(activity.length >= 2, "activity events");
  assert(changesFromLog(log).length === 1, "changes from events");
}

function testP6Connections() {
  const list = listHubPlatformConnections({ stripe: false, github: true });
  const stripe = list.connections.find((c) => c.id === "stripe");
  assert(stripe?.status === "not_connected", "stripe disconnected");
  assert(stripe?.detailKo.includes("연결"), "stripe detail");
  const verified = verifyHubPlatformConnection("stripe", { stripe: true });
  assert(verified.ok === true, "stripe verify when connected");
}

async function main() {
  testP2Observation();
  testP3ToolCatalog();
  testP4Approval();
  testP5AgentEvents();
  testP6Connections();
  console.log("test-hub-phases-p2-p6: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

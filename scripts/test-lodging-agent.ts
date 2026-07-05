import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  buildLodgingAgentContainer,
  classifyLodgingAgentTool,
  executeLodgingAgentTool,
  patchLodgingAgentGhostsToProjection,
  runLodgingAgentTurn,
  buildLodgingAgentTurnIngress,
} from "../lib/globe/lodging-agent";
import { resetProjectionStoreForTests } from "../lib/situation-projection/projection-store";
import { resolveLodgingMockForPlace } from "../lib/globe/context-hub/lodging-mock-inventory";

const event: EventCandidate = {
  id: "evt-japan",
  title: "東京 여행",
  category: "travel",
  datetime: "2026-07-05T00:00:00.000Z",
  place: "東京",
  metadata: {},
};

const hostRow = resolveLodgingMockForPlace("東京", { lat: 35.6762, lng: 139.6503 })[0]!;
const resourceId = `${event.id}:lodging:${hostRow.placeId}`;

function testRagContext() {
  const container = buildLodgingAgentContainer({
    event,
    row: hostRow,
    resourceId,
    userDisplayName: "지훈",
  });
  assert.ok(container.rag.memoryKo.includes("[Host Data]"));
  assert.ok(container.rag.memoryKo.includes("[Context Data]"));
  assert.ok(container.rag.memoryKo.includes("新宿"));
  assert.ok(container.systemPrompt.includes("지훈"));
  assert.ok(container.systemPrompt.includes("3km"));
}

function testToolClassify() {
  assert.deepEqual(classifyLodgingAgentTool("근처 카페 찾아줘"), {
    tool: "find_nearby",
    category: "cafe",
    radiusM: 500,
  });
  assert.deepEqual(classifyLodgingAgentTool("체크인 몇 시야?"), {
    tool: "ask_host",
    question: "체크인 몇 시야?",
  });
}

async function testMapPinWireShape() {
  resetProjectionStoreForTests();
  const container = buildLodgingAgentContainer({
    event,
    row: hostRow,
    resourceId,
  });
  const toolCall = classifyLodgingAgentTool("근처 맛집");
  const result = await executeLodgingAgentTool({
    container,
    event,
    toolCall,
    userMessage: "근처 맛집",
  });
  for (const pin of result.mapPins) {
    assert.ok(pin.text.trim());
    assert.ok(Number.isFinite(pin.lat));
    assert.ok(Number.isFinite(pin.lng));
    assert.ok(["eatery", "cafe", "place", "lodging", "info"].includes(pin.type));
  }
  patchLodgingAgentGhostsToProjection({
    event,
    hostPlaceId: hostRow.placeId,
    mapPins: result.mapPins,
    batchId: "test-batch",
  });
}

async function testRunTurn() {
  resetProjectionStoreForTests();
  const result = await runLodgingAgentTurn({
    event,
    row: hostRow,
    resourceId,
    message: "근처 카페 찾아줘",
    userDisplayName: "지훈",
  });
  assert.ok(result.replyText.trim());
  assert.equal(result.toolCalls.length, 1);
  const ingress = buildLodgingAgentTurnIngress({
    container: buildLodgingAgentContainer({ event, row: hostRow, resourceId }),
    userMessage: "근처 카페",
  });
  assert.equal(ingress.anchor.kind, "lodging");
  assert.equal(ingress.anchor.hostPlaceId, hostRow.placeId);
}

testRagContext();
testToolClassify();
void testMapPinWireShape()
  .then(() => testRunTurn())
  .then(() => {
    console.log("test-lodging-agent: ok");
  });

import assert from "node:assert/strict";
import { sandboxController } from "../lib/sandbox/controller";
import { formatEventForConsole } from "../lib/sandbox/events";

async function main() {
  const session = sandboxController.createSession({
    capability: "hotel.search",
    userRequest: "오사카 호텔 찾아줘",
    input: {
      location: "오사카, 일본",
      checkIn: "2024-06-01",
      checkOut: "2024-06-03",
    },
  });

  assert.equal(session.status, "idle");
  assert.equal(session.lifecycleStatus, "CREATED");
  assert.match(session.sessionId, /^sbx_/);
  assert.equal(session.executionId, session.sessionId);

  const result = await sandboxController.runCapability(session.sessionId);
  assert.equal(result.ok, true);

  const finished = sandboxController.getSession(session.sessionId);
  assert.ok(finished);
  assert.equal(finished.status, "success");
  assert.ok(finished.events.length > 0);
  assert.ok(finished.resultText.includes("hotels found") || finished.resultText.includes("8"));

  const formatted = formatEventForConsole(finished.events[0]);
  assert.ok(formatted.text.length > 0);

  assert.ok(finished.verification?.ok);

  console.log("sandbox controller ok", {
    sessionId: finished.sessionId,
    events: finished.events.length,
    result: finished.resultText,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

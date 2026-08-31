import assert from "node:assert/strict";
import { validateProductSearchInput } from "../lib/sandbox/capability/contracts";
import { createSandboxEvent } from "../lib/sandbox/events";
import { sandboxController } from "../lib/sandbox/controller";

async function main() {
  const invalid = validateProductSearchInput({ query: "" });
  assert.equal(invalid.ok, false);

  const valid = validateProductSearchInput({ query: "MacBook", limit: 5 });
  assert.equal(valid.ok, true);

  const session = sandboxController.createSession({
    capability: "product.search",
    userRequest: "MacBook search",
    input: { query: "" },
  });
  assert.equal(session.lifecycleStatus, "CREATED");
  assert.equal(session.executionId, session.sessionId);

  const queued = sandboxController.queueExecution(session.sessionId);
  assert.equal(queued.ok, false);

  const failed = sandboxController.getSession(session.sessionId);
  assert.ok(failed);
  assert.equal(failed?.lifecycleStatus, "FAILED");
  assert.equal(failed?.structuredError?.code, "INVALID_INPUT");

  const previous = sandboxController.createSession({
    capability: "product.search",
    userRequest: "retry source",
    input: { query: "MacBook", limit: 5 },
  });

  const retry = sandboxController.retrySession(previous.sessionId);
  assert.ok(retry);
  assert.equal(retry?.retryOf, previous.sessionId);
  assert.notEqual(retry?.sessionId, previous.sessionId);
  assert.ok(
    retry?.lifecycleStatus === "QUEUED" ||
      retry?.lifecycleStatus === "STARTING" ||
      retry?.lifecycleStatus === "RUNNING",
  );

  const event = createSandboxEvent("exec-1", "EXECUTION_STARTED", { capability: "product.search" }, {
    step: "request",
    action: "Execution started",
  });
  assert.equal(event.executionId, "exec-1");
  assert.equal(event.step, "request");

  console.log("sandbox execution lifecycle ok", {
    retryId: retry?.sessionId,
    invalidInput: failed?.structuredError?.code,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

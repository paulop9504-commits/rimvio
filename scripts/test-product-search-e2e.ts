import assert from "node:assert/strict";
import { isPlaywrightAvailable } from "../lib/sandbox/browser/playwright-runtime";
import { sandboxController, resolveSandboxBaseUrl } from "../lib/sandbox/controller";

async function isServerReachable(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/sandbox/shop/products?query=MacBook`);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const playwrightOk = await isPlaywrightAvailable();
  if (!playwrightOk) {
    console.log("skip product.search e2e — Playwright Chromium not installed");
    return;
  }

  const baseUrl = resolveSandboxBaseUrl();
  process.env.SANDBOX_BASE_URL = baseUrl;

  const serverOk = await isServerReachable(baseUrl);
  if (!serverOk) {
    console.log(`skip product.search e2e — server not reachable at ${baseUrl}`);
    console.log("Start dev server: npm run dev");
    return;
  }

  const session = sandboxController.createSession({
    capability: "product.search",
    userRequest: "Search MacBook",
    input: { query: "MacBook", limit: 5 },
  });

  const queued = sandboxController.queueExecution(session.sessionId);
  assert.equal(queued.ok, true);

  let finished = sandboxController.getSession(session.sessionId);
  const deadline = Date.now() + 90_000;
  while (
    finished &&
    finished.lifecycleStatus !== "COMPLETED" &&
    finished.lifecycleStatus !== "FAILED" &&
    finished.lifecycleStatus !== "CANCELLED" &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    finished = sandboxController.getSession(session.sessionId);
  }

  assert.ok(finished);
  if (finished.lifecycleStatus !== "COMPLETED") {
    console.error("product.search failed", {
      error: finished.error,
      structuredError: finished.structuredError,
      lastEvents: finished.events.slice(-5),
    });
  }
  assert.equal(finished.lifecycleStatus, "COMPLETED");
  assert.ok(finished.events.some((event) => event.type === "BROWSER_STARTED"));
  assert.ok(finished.events.some((event) => event.type === "DATA_EXTRACTED"));
  assert.ok(finished.latestScreenshot);

  const output = finished.output as { products: Array<{ name: string; price: string; url: string }> };
  assert.ok(Array.isArray(output.products));
  assert.ok(output.products.length > 0, "expected real extracted products");
  assert.ok(output.products.some((product) => product.name.toLowerCase().includes("macbook")));

  console.log("product.search e2e ok", {
    sessionId: finished.sessionId,
    products: output.products.length,
    sample: output.products[0]?.name,
    events: finished.events.length,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

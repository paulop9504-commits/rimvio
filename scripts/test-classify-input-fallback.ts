#!/usr/bin/env npx tsx
/**
 * classifyInput fallback — no domain cue → chat, not search.
 */
import assert from "node:assert/strict";

async function main() {
  // Mock fetch to force deterministic fallback
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("force_deterministic");
  }) as typeof fetch;

  const { classifyInput } = await import(
    "../lib/globe/context-condition-ai/dispatch/classify-input"
  );

  const chat = await classifyInput({ text: "오늘 좀 피곤하네" });
  assert.equal(chat.category, "chat");
  assert.equal(chat.source, "deterministic");

  const lodging = await classifyInput({ text: "게스트하우스 찾아줘" });
  assert.equal(lodging.category, "search");

  const findVerb = await classifyInput({ text: "근처 뭔가 보여줘" });
  assert.equal(findVerb.category, "search");

  globalThis.fetch = originalFetch;
  console.log("✓ classifyInput safer fallback");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

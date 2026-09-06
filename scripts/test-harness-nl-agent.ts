#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { generateHarnessFromUtterance } from "@/lib/harness/nl-agent";
import { validateHarness } from "@/lib/harness/validate";

function main() {
  const r = generateHarnessFromUtterance({
    utterance: "쿠팡에서 노트북을 검색하고 100만원 이하만 추려줘",
    surface: "web",
    now: "2026-09-06T10:00:00.000Z",
  });
  assert.equal(r.ok, true, r.issues.join("; "));
  assert.ok(r.harness);
  assert.equal(r.inferredHost, "www.coupang.com");
  assert.equal(r.budgetKrw, 1_000_000);
  assert.ok(r.harness!.constraints.some((c) => c.field === "price"));
  const v = validateHarness(r.harness!);
  assert.equal(v.ok, true);

  const local = generateHarnessFromUtterance({
    utterance: "로컬에서 메모장 열어줘",
    surface: "local",
    now: "2026-09-06T10:00:00.000Z",
  });
  assert.equal(local.ok, true);
  assert.equal(local.harness?.runtime.type, "DESKTOP");

  const short = generateHarnessFromUtterance({ utterance: "hi" });
  assert.equal(short.ok, false);

  console.log("test-harness-nl-agent: PASS");
}

main();

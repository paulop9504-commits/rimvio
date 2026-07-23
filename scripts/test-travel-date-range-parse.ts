#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  parseTravelDateRangeFromText,
  parseTravelSlotsFromMessage,
  parseDurationDaysFromText,
  computeWindowEndIso,
} from "@/lib/experience-run/travel-context-slots";
import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { buildPendingContextCreateDraft } from "@/lib/globe-ingress/build-pending-context-create-draft";
import { compileGlobeIngress } from "@/lib/globe-ingress/compile-globe-ingress";
import {
  resetPendingContextCreateForTests,
  writePendingContextCreate,
} from "@/lib/globe-ingress/pending-context-create-store";
import { tryPatchPendingContextCreate } from "@/lib/globe-ingress/try-patch-pending-context-create";
import type { RuleEngineDecision } from "@/lib/rule-engine/evaluate-utterance-rules";
import type { ContextPackV1 } from "@/lib/context-builder";

const REF = "2026-07-22";

{
  const range = parseTravelDateRangeFromText(
    "7월26일부터 8월1일까지 홍콩으로 놀러감 계획세워",
    REF,
  );
  assert.ok(range);
  assert.equal(range!.durationDays, 7);
  assert.match(range!.startIso, /^2026-07-26T/);
  assert.match(range!.endIso, /^2026-08-01T/);
}

{
  const range = parseTravelDateRangeFromText("7/26~8/1", REF);
  assert.ok(range);
  assert.equal(range!.durationDays, 7);
  assert.match(range!.startIso, /^2026-07-26T/);
  assert.match(range!.endIso, /^2026-08-01T/);
}

{
  // Must NOT treat 「26일」 inside 「7월26일」 as a 26-day stay.
  assert.equal(
    parseDurationDaysFromText("7월26일부터 8월1일까지 홍콩으로 놀러감"),
    null,
  );
  assert.equal(parseDurationDaysFromText("3일"), 3);
  assert.equal(parseDurationDaysFromText("4박5일"), 5);
}

{
  assert.equal(
    extractTravelDestination("7월26일부터 8월1일까지 홍콩으로 놀러감 계획세워"),
    "홍콩",
  );
}

{
  const slots = parseTravelSlotsFromMessage(
    "7월26일부터 8월1일까지 홍콩으로 놀러감 계획세워",
    REF,
  );
  assert.equal(slots.destination, "홍콩");
  assert.equal(slots.durationDays, 7);
  assert.ok(slots.anchorTimeIso?.startsWith("2026-07-26"));
  const end = computeWindowEndIso(slots.anchorTimeIso!, slots.durationDays!);
  const endLocal = new Date(end);
  assert.equal(endLocal.getMonth() + 1, 8);
  assert.equal(endLocal.getDate(), 1);
}

{
  const utterance = "7월26일부터 8월1일까지 홍콩으로 놀러감 계획세워";
  const compiled = compileGlobeIngress({
    text: utterance,
    existingContextId: "evt-hk-date",
  });
  const draft = buildPendingContextCreateDraft({
    graphId: "evt-hk-date",
    utterance,
    compiled,
    referenceDate: REF,
  });
  assert.equal(draft.titleKo, "홍콩 여행");
  assert.equal(draft.durationLabelKo, "6박7일");
  assert.equal(draft.dateLabelKo, "7/26 ~ 8/1");
  assert.equal(draft.travelSlots.destination, "홍콩");
}

{
  resetPendingContextCreateForTests();
  const wrongUtterance = "7월26일부터 여행 계획세워";
  // Simulate legacy wrong draft fields by writing a draft then correcting.
  const compiled = compileGlobeIngress({
    text: "홍콩으로 놀러감 계획세워",
    existingContextId: "evt-hk-fix",
  });
  const pending = buildPendingContextCreateDraft({
    graphId: "evt-hk-fix",
    utterance: "홍콩으로 놀러감 계획세워",
    compiled,
    referenceDate: REF,
  });
  writePendingContextCreate(pending);

  const pack = { version: 1 } as unknown as ContextPackV1;
  const ruleDecision = { matched: false } as unknown as RuleEngineDecision;
  const patched = tryPatchPendingContextCreate({
    utterance: "7/26~8/1",
    contextEventId: "evt-hk-fix",
    ruleDecision,
    pack,
  });
  assert.ok(patched);
  assert.match(patched!.assistantReplyKo, /7\/26\s*~\s*8\/1/);
  assert.match(patched!.assistantReplyKo, /6박7일|홍콩/);
  assert.ok(!patched!.assistantReplyKo.includes("25박26일"));
  assert.ok(!patched!.assistantReplyKo.includes("8/20"));
  void wrongUtterance;
}

console.log("test-travel-date-range-parse: ok");

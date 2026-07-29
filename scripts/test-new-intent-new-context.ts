#!/usr/bin/env npx tsx
/**
 * ADR-029 — New Intent → New Context (attach only when asked).
 */

import assert from "node:assert/strict";
import {
  isExplicitContextContinue,
  resolveIngressContextEventId,
  shouldSpawnNewContext,
} from "../lib/context-run/should-spawn-new-context";
import { planContextRun } from "../lib/context-run/plan-context-run";
import { bindSituation } from "../lib/context-run/bind-situation";

assert.equal(
  shouldSpawnNewContext({
    utterance: "오사카 4박 5일 여행 일정 짜줘",
    activeContextEventId: "ctx-dunsan-food",
  }),
  true,
);

assert.equal(
  shouldSpawnNewContext({
    utterance: "이 맥락에 이어서 일정 짜줘",
    activeContextEventId: "ctx-dunsan-food",
  }),
  false,
);

assert.equal(isExplicitContextContinue("기존 맥락에 연결해서 해줘"), true);

assert.equal(
  resolveIngressContextEventId({
    utterance: "오사카 4박 5일 여행 갈 거야",
    activeContextEventId: "ctx-old",
  }),
  null,
);

assert.equal(
  resolveIngressContextEventId({
    utterance: "이 맥락에서 이어서 해줘",
    activeContextEventId: "ctx-old",
  }),
  "ctx-old",
);

{
  const plan = planContextRun(
    bindSituation({
      kind: "text",
      text: "오사카 4박 5일 여행 갈 거야",
      surface: "composer",
      layerMode: "personal",
      contextEventId: "ctx-should-not-attach",
    }),
  );
  assert.equal(plan.kind, "globe_ingress");
  // compile used null existing — context id must not reuse open hub
  assert.ok(plan.globeIngress);
  assert.notEqual(
    plan.globeIngress!.context.contextId,
    "ctx-should-not-attach",
  );
}

{
  const plan = planContextRun(
    bindSituation({
      kind: "text",
      text: "이 맥락에 이어서 오사카 일정도 짜줘",
      surface: "composer",
      layerMode: "personal",
      contextEventId: "ctx-keep",
    }),
  );
  if (plan.kind === "globe_ingress" && plan.globeIngress) {
    assert.equal(plan.globeIngress.context.contextId, "ctx-keep");
  }
}

assert.equal(
  shouldSpawnNewContext({
    utterance: "숙소 찾아줘",
    activeContextEventId: "ctx-tokyo",
    activeWorkspaceKind: "travel",
  }),
  false,
);

assert.equal(
  resolveIngressContextEventId({
    utterance: "숙소 찾아줘",
    activeContextEventId: "ctx-tokyo",
    activeWorkspaceKind: "travel",
  }),
  "ctx-tokyo",
);

assert.equal(
  shouldSpawnNewContext({
    utterance: "숙소 찾아줘",
    activeContextEventId: null,
  }),
  true,
);

console.log("ok — new-intent-new-context");

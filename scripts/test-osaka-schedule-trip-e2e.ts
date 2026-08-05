/**
 * 「내일모래 4박5일 오사카로 여행가는데 일정좀 짜줘」
 * → globe_ingress → Continuum Day1–5 skeleton (not Workspace Agent rewrite).
 *
 * Run: npx tsx scripts/test-osaka-schedule-trip-e2e.ts
 */

import assert from "node:assert/strict";
import { planContextRun } from "@/lib/context-run/plan-context-run";
import { bindSituation } from "@/lib/context-run/bind-situation";
import { interpretMessyForGlobeComposer } from "@/lib/messy-prompt-interpreter/adapters/globe-composer-adapter";
import { shouldPrepareTripWorkspaceDraft } from "@/lib/context-workspace/prepare-trip-workspace-draft";
import { parseDurationDaysFromText } from "@/lib/experience-run/travel-context-slots";
import { prepareWorkspaceResources } from "@/lib/workspace-kind/prepare-workspace-resources";
import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { isNewTripGlobeIngressUtterance } from "@/lib/context-run/is-new-trip-globe-ingress-utterance";

const memory = new Map<string, string>();
const storage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memory.set(k, v);
  },
  removeItem: (k: string) => {
    memory.delete(k);
  },
  clear: () => memory.clear(),
};
Object.assign(globalThis, {
  localStorage: storage,
  sessionStorage: storage,
  window: {
    localStorage: storage,
    sessionStorage: storage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: (fn: () => void, _ms?: number) => {
      fn();
      return 0;
    },
    clearTimeout: () => {},
  },
});

const UTT = "내일모래 4박5일 오사카로 여행가는데 일정좀 짜줘";

void (async () => {
  // Cursor: typed NL unchanged
  const messy = await interpretMessyForGlobeComposer({
    messyInput: UTT,
    useLlm: false,
  });
  assert.equal(messy.dispatchText, UTT);

  // Routing
  assert.equal(isNewTripGlobeIngressUtterance(UTT), true);
  assert.equal(isWorkspaceAgentWorkUtterance(UTT), false);
  assert.equal(shouldPrepareTripWorkspaceDraft(UTT), true);
  assert.equal(parseDurationDaysFromText(UTT), 5);

  // 「내일모래」 = +2 — referenceDate is YYYY-MM-DD string
  const startIso = parseRelativeDateTimeFromText(UTT, "2026-08-06");
  assert.ok(startIso && !startIso.includes("NaN"), `startIso=${startIso}`);
  assert.ok(
    startIso!.startsWith("2026-08-08"),
    `expected +2 days from Aug 6, got ${startIso}`,
  );

  const plan = planContextRun(
    bindSituation({
      kind: "text",
      text: UTT,
      surface: "composer",
      layerMode: "personal",
    }),
  );
  assert.equal(plan.kind, "globe_ingress", `got ${plan.kind}`);

  // Continuum Day skeleton
  const prepared = prepareWorkspaceResources({
    utterance: UTT,
    contextEventId: "ctx-osaka-schedule-e2e",
    titleOverrideKo: "오사카 4박5일",
  });
  assert.ok(prepared?.workspace, "workspace prepared");
  const ws = prepared!.workspace!;
  const draftDays = ws.realityDraft?.days?.length ?? 0;
  const taggedDays = new Set(
    ws.nodes
      .flatMap((n) => n.tags)
      .map((t) => /^day[_-]?(\d+)$/iu.exec(t)?.[1])
      .filter(Boolean),
  );
  assert.ok(
    draftDays >= 5 || taggedDays.size >= 5,
    `expected Day1–5, draftDays=${draftDays} tagged=${[...taggedDays].join(",")}`,
  );
  assert.ok(
    /오사카/u.test(ws.summaryKo ?? "") ||
      /오사카/u.test(ws.realityDraft?.destinationKo ?? "") ||
      /오사카/u.test(ws.query ?? ""),
    "Osaka destination",
  );
  assert.ok((ws.nodes?.length ?? 0) >= 1, "timeline/map skeleton nodes");

  console.log("OK — osaka-schedule-trip-e2e (NL · globe_ingress · Day1–5)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

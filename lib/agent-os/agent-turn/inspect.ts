/**
 * Inspect — read current application/workspace before planning.
 * Reuses observeHubWorkspace / observeFullWorkspace. No invented capabilities.
 */

import { observeFullWorkspace } from "@/lib/agent/hub-observation";
import { observeHubWorkspace } from "@/lib/hub/dev/hub-workspace-observe";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { AgentTurnInspection, AgentTurnUnderstand } from "@/lib/agent-os/agent-turn/types";

const EXPECTED_BY_DOMAIN: Readonly<Record<string, readonly string[]>> = {
  delivery_marketplace: [
    "order.create",
    "order.status",
    "menu.list",
    "restaurant.list",
    "payment.prepare",
  ],
  lodging: ["hotel.search", "booking.prepare"],
  commerce_payment: ["payment.prepare", "payment.commit"],
  commerce_order: ["order.create", "order.status"],
};

export function inspectCurrentState(input: {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly connections?: Readonly<Record<string, boolean>>;
  readonly understand?: AgentTurnUnderstand | null;
}): AgentTurnInspection {
  const state = observeHubWorkspace({
    draft: input.draft,
    snapshot: input.snapshot,
    connections: input.connections,
  });
  const full = observeFullWorkspace({
    draft: input.draft,
    snapshot: input.snapshot,
    connections: input.connections,
  });

  const expected = input.understand?.domain
    ? (EXPECTED_BY_DOMAIN[input.understand.domain] ?? [])
    : [];
  const have = new Set(state.capabilities.map((c) => c.toLowerCase()));
  const missingCapabilities = expected.filter((id) => {
    const tail = id.split(".").pop() ?? id;
    return ![...have].some((c) => c === id.toLowerCase() || c.includes(tail));
  });

  return {
    type: "application_state",
    platformName: state.platformName,
    entities: state.dataEntities,
    capabilities: state.capabilities,
    missingCapabilities,
    connections: state.connections,
    testsPassed: state.testsPassed,
    testsTotal: state.testsTotal,
    lines: full.lines,
  };
}

export function hasCapability(inspection: AgentTurnInspection, needle: string): boolean {
  const n = needle.toLowerCase();
  return inspection.capabilities.some((c) => c.toLowerCase().includes(n));
}

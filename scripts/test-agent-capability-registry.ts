/**
 * Registry coverage smoke test — 100 capabilities SSOT.
 */

import {
  RIMVIO_AGENT_CAPABILITIES,
  PHASE_1_CAPABILITY_IDS,
  capabilityCoverage,
  getAgentCapability,
} from "@/lib/hub/dev/agent-capability-registry";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  assert(RIMVIO_AGENT_CAPABILITIES.length === 100, "100 capabilities");
  assert(getAgentCapability(1)?.slug === "intent_understanding", "cap 1");
  assert(getAgentCapability(100)?.slug === "audit_trail", "cap 100");

  for (const id of PHASE_1_CAPABILITY_IDS) {
    const cap = getAgentCapability(id);
    assert(cap != null, `phase1 cap ${id} exists`);
    assert(cap.phase === 1, `cap ${id} phase 1`);
  }

  const p1 = capabilityCoverage({ phase: 1 });
  assert(p1.total === 40, "phase 1 has 40 caps (A-D)");
  assert(p1.pctReady > 0, "phase 1 has progress");

  console.log("test-agent-capability-registry: ok", {
    phase1: p1,
    overall: capabilityCoverage({}),
  });
}

main();

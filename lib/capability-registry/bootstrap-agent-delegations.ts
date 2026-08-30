/**
 * Default agent delegation specs — required for Reality Pipeline agent_delegate stage.
 */

import { registerAgentDelegation } from "@/lib/capability-registry/agent-delegation";

let bootstrapped = false;

export function ensureAgentDelegationsRegistered(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  registerAgentDelegation({
    agentId: "lodging",
    domain: "travel",
    can: ["BOOK_HOTEL", "SEARCH", "MAP"],
    cannot: [],
    maxConcurrent: 3,
  });
  registerAgentDelegation({
    agentId: "flight",
    domain: "travel",
    can: ["BOOK_FLIGHT", "SEARCH"],
    cannot: [],
    maxConcurrent: 2,
  });
  registerAgentDelegation({
    agentId: "eatery",
    domain: "travel",
    can: ["SEARCH", "CONFIRM_PLACE", "MAP"],
    cannot: [],
    maxConcurrent: 3,
  });
  registerAgentDelegation({
    agentId: "route",
    domain: "travel",
    can: ["NAVIGATE", "MAP"],
    cannot: [],
    maxConcurrent: 2,
  });
  registerAgentDelegation({
    agentId: "booking",
    domain: "travel",
    can: ["BOOK_HOTEL", "BOOK_FLIGHT"],
    cannot: [],
    maxConcurrent: 1,
  });
  registerAgentDelegation({
    agentId: "weather",
    domain: "travel",
    can: ["SEARCH"],
    cannot: [],
    maxConcurrent: 2,
  });
}

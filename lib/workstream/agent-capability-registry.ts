/**
 * Agent Capability Registry — one Runtime, many capabilities (ADR-045).
 * Do not invent BookingRuntime / ResearchRuntime packages — register here.
 */

export const AGENT_CAPABILITY_IDS = [
  "booking",
  "search",
  "trip",
  "marketplace",
  "research",
  "vision",
  "calendar",
  "lodging",
  "eatery",
  "transit",
  "weather",
  "payment",
  "map",
] as const;

export type AgentCapabilityId = (typeof AGENT_CAPABILITY_IDS)[number];

export type AgentCapabilityRegistration = {
  readonly id: AgentCapabilityId;
  readonly labelKo: string;
  /** Legacy package path this capability wraps — not a second runtime. */
  readonly wrapsPackage: string;
  readonly priority: number;
};

const CAPABILITIES: AgentCapabilityRegistration[] = [
  {
    id: "booking",
    labelKo: "예약",
    wrapsPackage: "lib/booking-runtime",
    priority: 10,
  },
  {
    id: "search",
    labelKo: "검색",
    wrapsPackage: "lib/search-engine",
    priority: 10,
  },
  {
    id: "trip",
    labelKo: "여행",
    wrapsPackage: "lib/workstream",
    priority: 10,
  },
  {
    id: "marketplace",
    labelKo: "마켓",
    wrapsPackage: "lib/engine",
    priority: 6,
  },
  {
    id: "research",
    labelKo: "리서치",
    wrapsPackage: "lib/research-engine",
    priority: 7,
  },
  {
    id: "vision",
    labelKo: "비전",
    wrapsPackage: "lib/observation-engine",
    priority: 5,
  },
  {
    id: "calendar",
    labelKo: "캘린더",
    wrapsPackage: "lib/integrations",
    priority: 8,
  },
  {
    id: "lodging",
    labelKo: "숙소",
    wrapsPackage: "lib/globe/lodging",
    priority: 9,
  },
  {
    id: "eatery",
    labelKo: "맛집",
    wrapsPackage: "lib/globe/eatery",
    priority: 8,
  },
  {
    id: "transit",
    labelKo: "교통",
    wrapsPackage: "lib/globe",
    priority: 7,
  },
  {
    id: "weather",
    labelKo: "날씨",
    wrapsPackage: "lib/agent-orchestrator",
    priority: 4,
  },
  {
    id: "payment",
    labelKo: "결제",
    wrapsPackage: "lib/booking-runtime",
    priority: 9,
  },
  {
    id: "map",
    labelKo: "지도",
    wrapsPackage: "lib/globe",
    priority: 6,
  },
];

const byId = new Map(CAPABILITIES.map((c) => [c.id, c]));

export function listAgentCapabilities(): readonly AgentCapabilityRegistration[] {
  return CAPABILITIES.slice().sort((a, b) => b.priority - a.priority);
}

export function getAgentCapability(
  id: AgentCapabilityId,
): AgentCapabilityRegistration | null {
  return byId.get(id) ?? null;
}

/** Map Judge scope domains → Registry capabilities. */
export function capabilitiesForScopeDomains(
  domains: readonly string[],
): readonly AgentCapabilityId[] {
  const out: AgentCapabilityId[] = [];
  for (const d of domains) {
    if (d === "lodging") out.push("lodging", "search");
    else if (d === "eatery") out.push("eatery", "search");
    else if (d === "search") out.push("search");
    else if (d === "booking" || d === "commit") out.push("booking", "payment");
    else if (d === "schedule") out.push("trip", "calendar");
    else if (d === "transit") out.push("transit", "map");
    else if (d === "flight") out.push("trip", "search");
    else if (d === "context_graph") out.push("trip");
    else if (d === "weather") out.push("weather");
  }
  return [...new Set(out)];
}

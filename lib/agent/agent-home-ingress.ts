/**
 * Agent home → Hub / Market / Automation ingress.
 * Routes through Field dashboard SSOT — no parallel `/hub` page.
 *
 * @see lib/nav/field-dashboard-ingress.ts
 */

import { copy } from "@/lib/copy/human-ko";
import {
  buildFieldDashboardSearchParams,
  clearFieldDashboardSearchParams,
  openFieldDashboardIngressForced,
  parseFieldDashboardIngressFromSearchParams,
} from "@/lib/nav/field-dashboard-ingress";
import type { FieldDashboardIngress } from "@/lib/nav/field-dashboard-types";

export type AgentHomeHubLinkId = "hub" | "market" | "automation";

export type AgentHomeMarketHubId = "shopping" | "travel" | "work";

const AGENT_HUB_LINK_TAB: Record<
  AgentHomeHubLinkId,
  NonNullable<FieldDashboardIngress["tab"]>
> = {
  hub: "queue",
  market: "mine",
  automation: "trades",
};

/** Sidebar Hub · Market · Automation — opens Field sheet at the right tab. */
export function openAgentHomeHubLink(
  link: AgentHomeHubLinkId,
  input?: { primaryEventId?: string | null; highlightTradeId?: string | null },
): void {
  openFieldDashboardIngressForced({
    tab: AGENT_HUB_LINK_TAB[link],
    primaryEventId: input?.primaryEventId?.trim() || null,
    highlightTradeId: input?.highlightTradeId?.trim() || null,
  });
}

/** Inspector recommended Hub cards — market vertical shortcuts. */
export function openAgentHomeMarketHub(
  hub: AgentHomeMarketHubId,
  input?: {
    primaryEventId?: string | null;
    onTravelCompose?: (seedText: string) => void;
  },
): void {
  switch (hub) {
    case "shopping":
      openFieldDashboardIngressForced({ tab: "mine" });
      return;
    case "work":
      openFieldDashboardIngressForced({ tab: "trades" });
      return;
    case "travel":
      if (input?.onTravelCompose) {
        input.onTravelCompose(copy.globe.agentHomeTaskTravelSeed);
        return;
      }
      openFieldDashboardIngressForced({
        tab: "queue",
        primaryEventId: input?.primaryEventId?.trim() || null,
      });
      return;
  }
}

export function buildAgentHomeHubSearchParams(
  link: AgentHomeHubLinkId,
  input?: { primaryEventId?: string | null; highlightTradeId?: string | null },
): URLSearchParams {
  return buildFieldDashboardSearchParams({
    tab: AGENT_HUB_LINK_TAB[link],
    primaryEventId: input?.primaryEventId?.trim() || null,
    highlightTradeId: input?.highlightTradeId?.trim() || null,
  });
}

export function parseAgentHomeFieldIngressFromSearchParams(
  params: URLSearchParams,
): FieldDashboardIngress | null {
  return parseFieldDashboardIngressFromSearchParams(params);
}

export function clearAgentHomeFieldSearchParams(params: URLSearchParams): void {
  clearFieldDashboardSearchParams(params);
}

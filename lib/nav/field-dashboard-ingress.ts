import { dispatchOpenFieldSheet } from "@/lib/nav/field-sheet-bridge";
import type {
  FieldDashboardIngress,
  FieldDashboardTab,
} from "@/lib/nav/field-dashboard-types";

const FIELD_DASHBOARD_TABS = new Set<FieldDashboardTab>(["trades", "discovery"]);

/** Canonical opener — globe pills, hub handoffs, bottom nav all land here. */
export function openFieldDashboardIngress(request?: FieldDashboardIngress): void {
  dispatchOpenFieldSheet(request);
}

/** Pill: “진행 중 N” → trades tab, optional handshake focus. */
export function openFieldTradesIngress(highlightTradeId?: string | null): void {
  openFieldDashboardIngress({
    tab: "trades",
    highlightTradeId: highlightTradeId ?? null,
  });
}

/** Pill: “맞는 매물” → discovery tab, optional context event scope. */
export function openFieldDiscoveryIngress(primaryEventId?: string | null): void {
  openFieldDashboardIngress({
    tab: "discovery",
    primaryEventId: primaryEventId ?? null,
  });
}

/** Bottom-nav 맞춤 — full dashboard SSOT; auto tab from active trades. */
export function openFieldDashboardFromBottomNav(input?: {
  tab?: FieldDashboardTab;
  highlightTradeId?: string | null;
}): void {
  openFieldDashboardIngress({
    tab: input?.tab,
    highlightTradeId: input?.highlightTradeId ?? null,
    bypassDiscoveryGate: true,
  });
}

export function parseFieldDashboardTab(
  raw: string | null | undefined,
): FieldDashboardTab | undefined {
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.trim() as FieldDashboardTab;
  return FIELD_DASHBOARD_TABS.has(trimmed) ? trimmed : undefined;
}

/**
 * Deep link query on globe home:
 * `/?openField=1&fieldTab=trades&highlightTrade=<handshakeId>&fieldEvent=<eventId>`
 */
export function parseFieldDashboardIngressFromSearchParams(
  params: URLSearchParams,
): FieldDashboardIngress | null {
  if (params.get("openField") !== "1") {
    return null;
  }

  return {
    tab: parseFieldDashboardTab(params.get("fieldTab")),
    highlightTradeId: params.get("highlightTrade")?.trim() || null,
    primaryEventId: params.get("fieldEvent")?.trim() || null,
  };
}

export function clearFieldDashboardSearchParams(params: URLSearchParams): void {
  params.delete("openField");
  params.delete("fieldTab");
  params.delete("highlightTrade");
  params.delete("fieldEvent");
}

export function buildFieldDashboardSearchParams(
  ingress: FieldDashboardIngress,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("openField", "1");
  if (ingress.tab) {
    params.set("fieldTab", ingress.tab);
  }
  if (ingress.highlightTradeId?.trim()) {
    params.set("highlightTrade", ingress.highlightTradeId.trim());
  }
  if (ingress.primaryEventId?.trim()) {
    params.set("fieldEvent", ingress.primaryEventId.trim());
  }
  return params;
}

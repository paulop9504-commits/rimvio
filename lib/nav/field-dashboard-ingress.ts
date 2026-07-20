import { dispatchOpenFieldSheet } from "@/lib/nav/field-sheet-bridge";
import type {
  FieldDashboardIngress,
  FieldDashboardTab,
} from "@/lib/nav/field-dashboard-types";
import { isGlobeContextConditionPanelOpen } from "@/lib/globe/context-condition-ai/globe-context-condition-panel-bridge";

/**
 * Field product ingress — 밖 지구 통로 (중고·모임 등 자원 찾기 · 외부 대화).
 * Not mounted from `/metrics` (Context Ops tier).
 * @see lib/dev/rimvio-surface-tiers.ts
 */

const FIELD_DASHBOARD_TABS = new Set<FieldDashboardTab>([
  "queue",
  "trades",
  "mine",
]);

/**
 * Canonical opener — globe pills, hub handoffs, bottom nav all land here.
 * When 맥락 AI PromptFrame is open, skip auto-open so surfaces do not stack
 * (caller should toast / in-thread CTA instead). Pass `force: true` for
 * explicit user taps (bottom nav).
 */
export function openFieldDashboardIngress(
  request?: FieldDashboardIngress & { force?: boolean },
): void {
  if (
    request?.force !== true &&
    typeof window !== "undefined" &&
    isGlobeContextConditionPanelOpen()
  ) {
    return;
  }
  const { force: _force, ...ingress } = request ?? {};
  void _force;
  dispatchOpenFieldSheet(ingress);
}

/** Explicit user ingress — always opens even if Context AI is visible. */
export function openFieldDashboardIngressForced(
  request?: FieldDashboardIngress,
): void {
  openFieldDashboardIngress({ ...(request ?? {}), force: true });
}

/** Pill: “진행 중 N” → trades tab, optional handshake focus. */
export function openFieldTradesIngress(highlightTradeId?: string | null): void {
  openFieldDashboardIngress({
    tab: "trades",
    highlightTradeId: highlightTradeId ?? null,
  });
}

/** Pill: “맞는 매물” → queue (discovery demoted; browse via Globe). */
export function openFieldDiscoveryIngress(primaryEventId?: string | null): void {
  openFieldDashboardIngress({
    tab: "queue",
    primaryEventId: primaryEventId ?? null,
  });
}

/** Bottom-nav 맞춤 — Reality Control Center (queue) SSOT. */
export function openFieldDashboardFromBottomNav(input?: {
  tab?: FieldDashboardTab;
  highlightTradeId?: string | null;
}): void {
  openFieldDashboardIngressForced({
    tab: input?.tab ?? "queue",
    highlightTradeId: input?.highlightTradeId ?? null,
  });
}

/** Globe utility · legacy manage entry — same sheet, mine tab. */
export function openFieldMineIngress(): void {
  openFieldDashboardIngressForced({ tab: "mine" });
}

export function parseFieldDashboardTab(
  raw: string | null | undefined,
): FieldDashboardTab | undefined {
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed === "discovery") {
    return "queue";
  }
  return FIELD_DASHBOARD_TABS.has(trimmed as FieldDashboardTab)
    ? (trimmed as FieldDashboardTab)
    : undefined;
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

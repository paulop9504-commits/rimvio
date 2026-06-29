/**
 * Field dashboard sheet tabs — SSOT for trades vs discovery ingress.
 *
 * Surface tier: **Field = product**. Do not mount from `/metrics` (Context Ops).
 * @see lib/dev/rimvio-surface-tiers.ts
 */
export type FieldDashboardTab = "trades" | "discovery";

/**
 * Opens the global Field dashboard sheet at a specific tab / trade row.
 * Globe pills and bottom nav must use this shape — no parallel stores.
 */
export type FieldDashboardIngress = {
  primaryEventId?: string | null;
  /** Omit to auto-pick trades when active sessions exist, else discovery. */
  tab?: FieldDashboardTab;
  /** `MarketTradeSessionView.handshakeId` — scroll + highlight in trades tab. */
  highlightTradeId?: string | null;
  /**
   * Bottom-nav 맞춤 opens dashboard even on personal globe layer.
   * Globe utility / pills may omit (discovery gate still applies).
   */
  bypassDiscoveryGate?: boolean;
};

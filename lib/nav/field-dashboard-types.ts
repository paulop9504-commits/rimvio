/**
 * Field dashboard — **밖 지구 통로** (external resource find + external people trades).
 *
 * Surface tier: **Field = product**. Do not mount from `/metrics` (Context Ops).
 * @see lib/dev/rimvio-surface-tiers.ts
 */
export type FieldDashboardTab = "trades" | "discovery" | "mine";

/**
 * Opens the global Field dashboard sheet at a specific tab / trade row.
 * Globe pills and bottom nav must use this shape — no parallel stores.
 */
export type FieldDashboardIngress = {
  primaryEventId?: string | null;
  /** Omit → trades if sessions exist, else discovery (browse). */
  tab?: FieldDashboardTab;
  /** `MarketTradeSessionView.handshakeId` — scroll + highlight in trades tab. */
  highlightTradeId?: string | null;
};

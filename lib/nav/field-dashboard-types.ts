/**
 * Field dashboard — **Reality Control Center** (Pending Reality · Commit Gate).
 * Secondary lenses: trades (execution FSM) · mine (published listings/seeking).
 * Surface tier: **Field = product**. Do not mount from `/metrics` (Context Ops).
 * @see lib/dev/rimvio-surface-tiers.ts
 * @see lib/reality-queue/
 */
export type FieldDashboardTab = "queue" | "trades" | "mine";

/**
 * Opens the global Field dashboard sheet at a specific tab / trade row.
 * Globe pills and bottom nav must use this shape — no parallel stores.
 */
export type FieldDashboardIngress = {
  primaryEventId?: string | null;
  /** Omit → queue (Reality Control Center). */
  tab?: FieldDashboardTab;
  /** `MarketTradeSessionView.handshakeId` — scroll + highlight in trades tab. */
  highlightTradeId?: string | null;
};

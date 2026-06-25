/** localStorage keys — SSOT for preference memory layer. */
export const MARKET_PREFERENCE_MEMORY_STORAGE_KEY =
  "rimvio-market-preference-memory.v1" as const;

export const MARKET_SLOT_IMPORTANCE_STORAGE_KEY =
  "rimvio-market-slot-importance.v1" as const;

/** Legacy name kept for older cached client bundles. */
export const MARKET_SUGGESTION_PREFERENCE_KEY =
  MARKET_PREFERENCE_MEMORY_STORAGE_KEY;

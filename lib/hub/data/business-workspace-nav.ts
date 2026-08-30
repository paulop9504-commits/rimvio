/**
 * Business contributor workspace panes (ADR-066).
 */

export type DataBusinessPane = "overview" | "inventory" | "pricing" | "policy" | "earnings";

export type DataBusinessNavItem = {
  readonly id: DataBusinessPane;
  readonly label: string;
  readonly icon: string;
};

export const DATA_BUSINESS_NAV: readonly DataBusinessNavItem[] = [
  { id: "overview", label: "Overview", icon: "layout" },
  { id: "inventory", label: "Inventory", icon: "box" },
  { id: "pricing", label: "Pricing", icon: "tag" },
  { id: "policy", label: "Policy", icon: "file" },
  { id: "earnings", label: "Earnings", icon: "wallet" },
];

export function parseDataBusinessPane(raw: string | null): DataBusinessPane {
  const map: Record<string, DataBusinessPane> = {
    overview: "overview",
    inventory: "inventory",
    pricing: "pricing",
    price: "pricing",
    policy: "policy",
    earnings: "earnings",
  };
  if (raw && raw in map) return map[raw]!;
  return "overview";
}

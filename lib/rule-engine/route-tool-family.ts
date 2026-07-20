/**
 * Tool Router — Intent → Tool family.
 */

import type { IntentFamily, ToolFamily } from "@/lib/rule-engine/constitution";

const ROUTES: Readonly<Partial<Record<IntentFamily, ToolFamily>>> = {
  Search: "maps",
  Navigate: "maps",
  Reserve: "booking",
  Purchase: "payment",
  Calendar: "calendar",
  Compare: "graph",
  Pin: "graph",
  Delete: "graph",
  Move: "graph",
  Revise: "graph",
  Filter: "graph",
  Group: "graph",
  Ungroup: "graph",
  Highlight: "graph",
  Note: "graph",
  Share: "graph",
  Simulate: "graph",
  Create: "graph",
  Analyze: "ranking",
  Predict: "ranking",
  Unknown: "none",
};

export function routeToolFamily(intent: IntentFamily): ToolFamily {
  return ROUTES[intent] ?? "none";
}

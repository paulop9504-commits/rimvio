import type { CausalGraphEdge, CausalGraphNode } from "@/lib/event-os/causal-trace-types";

export const CAUSAL_GRAPH_VERSION = "v1" as const;

export function baseRelationGraph(): {
  version: typeof CAUSAL_GRAPH_VERSION;
  nodes: CausalGraphNode[];
  edges: CausalGraphEdge[];
} {
  return {
    version: CAUSAL_GRAPH_VERSION,
    nodes: [
      "UI_Button",
      "Candidate_State",
      "Validation_Layer",
      "Event_SSOT",
      "Timeline",
      "Action_Projection",
      "UI_Layer",
    ],
    edges: [
      { from: "UI_Button", to: "Candidate_State", label: "user intent" },
      { from: "Candidate_State", to: "Validation_Layer", label: "validate" },
      { from: "Validation_Layer", to: "Event_SSOT", label: "commit gate" },
      { from: "Event_SSOT", to: "Timeline", label: "derive" },
      { from: "Timeline", to: "Action_Projection", label: "project" },
      { from: "Action_Projection", to: "UI_Layer", label: "overlay render" },
    ],
  };
}

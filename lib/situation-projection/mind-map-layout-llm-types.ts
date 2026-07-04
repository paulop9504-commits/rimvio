import type { ProjectionSurfaceKind } from "@/lib/situation-projection/types";

/** Normalized node position from LLM — x/y are 0–100 percent of viewport. */
export type LlmMindMapNodePosition = {
  id: string;
  x: number;
  y: number;
};

/** Strict wire returned by the mind-map layout LLM pass. */
export type LlmMindMapLayoutWire = {
  positions: readonly LlmMindMapNodePosition[];
  pillOrder?: readonly string[];
  surfaceKind?: ProjectionSurfaceKind;
};

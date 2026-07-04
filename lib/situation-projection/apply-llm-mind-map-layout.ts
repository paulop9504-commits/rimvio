import { computeMindMapLayout } from "@/lib/situation-projection/compute-mind-map-layout";
import type { LlmMindMapLayoutWire } from "@/lib/situation-projection/mind-map-layout-llm-types";
import { validateLlmMindMapLayoutWire } from "@/lib/situation-projection/parse-llm-mind-map-layout-wire";
import type {
  MindMapLayout,
  MindMapNodeLayout,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";

export type { LlmMindMapLayoutWire };

function mergeLlmPositionsIntoLayout(
  base: MindMapLayout,
  wire: LlmMindMapLayoutWire,
): MindMapLayout {
  const baseById = new Map(base.nodes.map((node) => [node.id, node]));
  const nodes: MindMapNodeLayout[] = wire.positions.map((position) => {
    const existing = baseById.get(position.id);
    const width = existing?.width ?? 96;
    const height = existing?.height ?? 34;
    return {
      id: position.id,
      x: (position.x / 100) * base.width - width / 2,
      y: (position.y / 100) * base.height - height / 2,
      width,
      height,
    };
  });

  const lastY = nodes.reduce((max, node) => Math.max(max, node.y + node.height), 0);
  const height = Math.max(base.height, lastY + 24);

  return {
    width: base.width,
    height,
    nodes,
  };
}

function reorderPills(
  manifest: SituationProjectionManifest,
  pillOrder: readonly string[] | undefined,
): SituationProjectionManifest["pills"] {
  if (!pillOrder?.length) {
    return manifest.pills;
  }

  const order = new Map(pillOrder.map((id, index) => [id, index]));
  return [...manifest.pills].sort((left, right) => {
    const leftIndex = order.get(left.id) ?? left.priority;
    const rightIndex = order.get(right.id) ?? right.priority;
    return leftIndex - rightIndex;
  });
}

/**
 * Apply deterministic layout, then optional LLM positions / pill order / surfaceKind.
 * LLM may only rearrange projection UI — never add solid nodes or truth.
 */
export function applyLlmMindMapLayout(
  manifest: SituationProjectionManifest,
  llmOutput?: LlmMindMapLayoutWire | null,
): SituationProjectionManifest {
  const deterministicLayout = manifest.mindMapLayout ?? computeMindMapLayout(manifest);

  if (!llmOutput?.positions?.length) {
    return {
      ...manifest,
      mindMapLayout: deterministicLayout,
      layoutSource: manifest.layoutSource ?? "deterministic",
    };
  }

  if (validateLlmMindMapLayoutWire(llmOutput, manifest).length > 0) {
    return {
      ...manifest,
      mindMapLayout: deterministicLayout,
      layoutSource: "deterministic",
    };
  }

  const mindMapLayout = mergeLlmPositionsIntoLayout(deterministicLayout, llmOutput);
  const pills = reorderPills(manifest, llmOutput.pillOrder);

  return {
    ...manifest,
    pills,
    surfaceKind: llmOutput.surfaceKind ?? manifest.surfaceKind,
    mindMapLayout,
    layoutSource: "llm",
  };
}

/** Resolve layout for render — always returns a layout object. */
export function resolveMindMapLayout(
  manifest: SituationProjectionManifest,
): MindMapLayout {
  return manifest.mindMapLayout ?? computeMindMapLayout(manifest);
}

import { resolveProjectionNodeSemantic } from "@/lib/situation-projection/ontology-semantic";
import type {
  ProjectionNode,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";

export const PROJECTION_DISPLAY_MODES = ["default", "brain_focus"] as const;

export type ProjectionDisplayMode = (typeof PROJECTION_DISPLAY_MODES)[number];

export function isProjectionNodeVisibleInDisplayMode(
  node: ProjectionNode,
  mode: ProjectionDisplayMode,
): boolean {
  if (mode === "default") {
    return true;
  }

  const semantic = resolveProjectionNodeSemantic(node);
  return semantic.ontologyRole === "root" || node.kind === "ghost";
}

export function selectProjectionDisplayManifest(
  manifest: SituationProjectionManifest,
  mode: ProjectionDisplayMode,
): SituationProjectionManifest {
  if (mode === "default") {
    return manifest;
  }

  const visibleNodes = manifest.nodes.filter((node) =>
    isProjectionNodeVisibleInDisplayMode(node, mode),
  );
  const nodes =
    visibleNodes.length > 0 ? visibleNodes : manifest.nodes.slice(0, 1);
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const links = manifest.links.filter(
    (link) =>
      visibleNodeIds.has(link.fromId) && visibleNodeIds.has(link.toId),
  );

  return {
    ...manifest,
    nodes,
    links,
    // Brain focus is a view-only filter, so the layout should be recomputed
    // for the reduced node set instead of reusing sparse full-graph positions.
    mindMapLayout: undefined,
  };
}

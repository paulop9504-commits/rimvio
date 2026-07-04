import {
  resolveProjectionNodePresentation,
  type ProjectionPresentationKey,
} from "@/lib/situation-projection/projection-node-presentation";
import type { ProjectionNode } from "@/lib/situation-projection/types";

export type ProjectionSurfaceFilterKey = "all" | ProjectionPresentationKey;

export type ProjectionSurfaceFilterOption = {
  key: ProjectionSurfaceFilterKey;
  labelKo: string;
  count: number;
};

const FILTER_ORDER: ProjectionPresentationKey[] = [
  "lodging",
  "eatery",
  "activity",
  "info",
  "transit",
  "ticket",
  "flight",
  "people",
  "records",
  "cost",
  "thread",
  "generic",
];

export function buildProjectionSurfaceFilterOptions(
  nodes: readonly ProjectionNode[],
): ProjectionSurfaceFilterOption[] {
  const bucket = new Map<
    ProjectionPresentationKey,
    { labelKo: string; count: number }
  >();
  for (const node of nodes) {
    const presentation = resolveProjectionNodePresentation(node);
    if (presentation.key === "root") {
      continue;
    }
    const current = bucket.get(presentation.key);
    if (current) {
      current.count += 1;
      continue;
    }
    bucket.set(presentation.key, {
      labelKo: presentation.categoryLabelKo,
      count: 1,
    });
  }
  const ordered = FILTER_ORDER.flatMap((key) => {
    const match = bucket.get(key);
    return match ? [{ key, ...match }] : [];
  });
  return [{ key: "all", labelKo: "전체", count: nodes.length }, ...ordered];
}

export function isProjectionNodeVisibleForSurface(input: {
  node: ProjectionNode;
  activeFilter: ProjectionSurfaceFilterKey;
  allowAuxiliary: boolean;
}): boolean {
  const presentation = resolveProjectionNodePresentation(input.node);
  if (presentation.key === "root") {
    return true;
  }
  if (
    input.activeFilter !== "all" &&
    presentation.key !== input.activeFilter
  ) {
    return false;
  }
  if (input.node.kind !== "ghost") {
    return input.activeFilter === "all";
  }
  if (input.activeFilter === "all") {
    return input.node.emphasis === "focus" || input.node.emphasis === "main";
  }
  if (!input.allowAuxiliary && input.node.emphasis === "aux") {
    return false;
  }
  return true;
}

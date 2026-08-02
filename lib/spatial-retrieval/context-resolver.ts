/**
 * Context Resolver — bind command to Active Workspace Context.
 */

import type {
  SpatialContextRef,
  SpatialDiscoveryIntent,
} from "@/lib/spatial-retrieval/types";

function slugContextId(titleKo: string, workspaceId: string): string {
  const fromTitle = titleKo
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  if (fromTitle === "osaka_trip" || /osaka/.test(fromTitle)) return "osaka_trip";
  if (fromTitle.length >= 2) return fromTitle.slice(0, 48);
  return workspaceId.trim() || "context";
}

export function resolveSpatialContext(input: {
  readonly workspaceId: string;
  readonly contextTitleKo?: string | null;
  readonly intent: SpatialDiscoveryIntent;
}): SpatialContextRef {
  const workspaceId = input.workspaceId.trim();
  const titleKo =
    input.contextTitleKo?.trim() ||
    (input.intent.rawText.includes("오사카")
      ? "Osaka Trip"
      : "Active Workspace");
  return {
    workspaceId,
    contextId: slugContextId(titleKo, workspaceId),
    titleKo,
  };
}

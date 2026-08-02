/**
 * Spatial Retrieval Pipeline runner
 *
 * User Command → Intent → Context → Anchor → Query → Retrieval → Relations → Projection → Callout
 */

import {
  resolveSpatialAnchorDetailed,
} from "@/lib/spatial-retrieval/anchor-resolver";
import { buildSpatialCalloutSeeds } from "@/lib/spatial-retrieval/callout-renderer";
import { resolveSpatialContext } from "@/lib/spatial-retrieval/context-resolver";
import { retrieveSpatialEntities } from "@/lib/spatial-retrieval/entity-retrieval";
import { parseSpatialDiscoveryIntent } from "@/lib/spatial-retrieval/intent-parser";
import { generateSpatialRelations } from "@/lib/spatial-retrieval/relationship-generator";
import { buildSpatialQuery } from "@/lib/spatial-retrieval/spatial-query-builder";
import type {
  SpatialRetrievalInput,
  SpatialRetrievalLogLine,
  SpatialRetrievalResult,
} from "@/lib/spatial-retrieval/types";
import { projectSpatialPins } from "@/lib/spatial-retrieval/workspace-projection";

function pushLog(
  logs: SpatialRetrievalLogLine[],
  stage: SpatialRetrievalLogLine["stage"],
  message: string,
  enabled: boolean,
): void {
  logs.push({ stage, message });
  if (enabled) {
    console.log(`[SpatialRetrieval:${stage}] ${message}`);
  }
}

/**
 * Run Spatial Retrieval Pipeline.
 *
 * Completion for "난바 호텔 기준 맛집 찾아줘":
 *   Intent · SPATIAL_DISCOVERY
 *   anchorEntity = Namba Hotel
 *   targetEntity = Restaurant
 *   relation = Nearby
 */
export function runSpatialRetrieval(
  input: SpatialRetrievalInput,
): SpatialRetrievalResult {
  const logs: SpatialRetrievalLogLine[] = [];
  const logEnabled = input.log !== false;
  const text = input.text.trim();

  // 1. Intent Parser
  const intent = parseSpatialDiscoveryIntent(text);
  if (!intent) {
    pushLog(logs, "intent", "Intent 파싱 실패", logEnabled);
    return {
      ok: false,
      reasonKo: "SPATIAL_DISCOVERY Intent로 해석할 수 없어요",
      stage: "intent",
      logs,
      intent: null,
    };
  }

  pushLog(
    logs,
    "intent",
    `Intent 생성 · type=${intent.type} · targetEntity=${intent.targetEntity} · anchorEntity=${intent.anchorEntity} · relation=${intent.relation}`,
    logEnabled,
  );

  // 2. Context Resolver
  const context = resolveSpatialContext({
    workspaceId: input.workspaceId,
    contextTitleKo: input.contextTitleKo,
    intent,
  });
  pushLog(
    logs,
    "context",
    `Context · ${context.titleKo} (${context.workspaceId})`,
    logEnabled,
  );

  // 3. Anchor Resolver (priority → Entity Resolver result; never chat-ask)
  const anchorResolved = resolveSpatialAnchorDetailed({
    intent,
    contextId: context.contextId,
    candidates: input.candidates,
  });
  if (!anchorResolved.ok) {
    pushLog(
      logs,
      "anchor",
      `Anchor ambiguous · project ${anchorResolved.candidates.length} candidates (askUser=false)`,
      logEnabled,
    );
    for (const c of anchorResolved.candidates) {
      pushLog(
        logs,
        "projection",
        `anchor_candidate · ${c.titleKo} (${c.entityId})`,
        logEnabled,
      );
    }
    return {
      ok: false,
      reasonKo: "기준 장소 후보를 지도에 표시했어요",
      stage: "anchor",
      logs,
      intent,
      anchorCandidates: anchorResolved.candidates,
      askUser: false,
    };
  }

  const { anchor, resolver, source } = anchorResolved;

  // Completion logs (product acceptance)
  pushLog(
    logs,
    "anchor",
    `Entity Resolver · source=${source} · anchorId=${resolver.anchorId} · type=${resolver.type} · contextId=${resolver.contextId}`,
    logEnabled,
  );
  pushLog(logs, "anchor", `anchorEntity = ${anchor.labelKo}`, logEnabled);
  pushLog(
    logs,
    "anchor",
    `targetEntity = ${capitalizeEntity(intent.targetEntity)}`,
    logEnabled,
  );
  pushLog(
    logs,
    "anchor",
    `relation = ${capitalizeRelation(intent.relation)}`,
    logEnabled,
  );

  // 4. Spatial Query Builder
  const query = buildSpatialQuery({ intent, anchor });
  pushLog(
    logs,
    "query",
    `Spatial Query · near ${anchor.labelKo} · r=${query.radiusMeters}m · target=${query.targetEntity}`,
    logEnabled,
  );

  // 5. Entity Retrieval
  const entities = retrieveSpatialEntities({ query });
  pushLog(
    logs,
    "retrieval",
    `Entity Retrieval · ${entities.length}개 발견`,
    logEnabled,
  );

  // 6. Relationship Generator
  const relations = generateSpatialRelations({
    anchor,
    entities,
    relation: intent.relation,
  });
  pushLog(
    logs,
    "relations",
    `Relationship · ${relations.length} edges (${intent.relation})`,
    logEnabled,
  );

  // 7. Workspace Projection
  const pins = projectSpatialPins({ anchor, entities });
  pushLog(
    logs,
    "projection",
    `Projection · pins=${pins.length} (anchor+discovered)`,
    logEnabled,
  );

  // 8. Callout Renderer seeds
  const callouts = buildSpatialCalloutSeeds({ anchor, entities });
  pushLog(
    logs,
    "callout",
    `Callout seeds · ${callouts.length} · mode=Discover`,
    logEnabled,
  );

  const summaryKo = [
    "Spatial Retrieval",
    `Intent · ${intent.type}`,
    `anchorEntity = ${anchor.labelKo}`,
    `targetEntity = ${capitalizeEntity(intent.targetEntity)}`,
    `relation = ${capitalizeRelation(intent.relation)}`,
    `entities · ${entities.length}`,
  ].join("\n");

  return {
    ok: true,
    intent,
    context,
    anchor,
    resolver,
    query,
    entities,
    relations,
    pins,
    callouts,
    logs,
    summaryKo,
  };
}

function capitalizeEntity(e: string): string {
  if (e === "restaurant") return "Restaurant";
  if (e === "cafe") return "Cafe";
  if (e === "hotel") return "Hotel";
  if (e === "attraction") return "Attraction";
  return e.charAt(0).toUpperCase() + e.slice(1);
}

function capitalizeRelation(r: string): string {
  if (r === "nearby") return "Nearby";
  if (r === "route") return "Route";
  if (r === "within") return "Within";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

/**
 * Spatial Retrieval Pipeline runner
 *
 * Intent → Context → Anchor → Spatial Query Engine → Retrieval (Context Score) →
 * Reality Graph → Projection Events → Map/Marker/Callout
 */

import { resolveSpatialAnchorDetailed } from "@/lib/spatial-retrieval/anchor-resolver";
import {
  buildSpatialCalloutSeeds,
  formatContextAwareCalloutSketch,
} from "@/lib/spatial-retrieval/callout-renderer";
import { resolveSpatialContext } from "@/lib/spatial-retrieval/context-resolver";
import { retrieveSpatialEntities } from "@/lib/spatial-retrieval/entity-retrieval";
import { parseSpatialDiscoveryIntent } from "@/lib/spatial-retrieval/intent-parser";
import { emitSpatialProjectionEvents } from "@/lib/spatial-retrieval/projection-events";
import {
  buildRealityEntities,
  extractRealityRelationships,
  formatRealityGraphSketch,
  generateSpatialRelations,
} from "@/lib/spatial-retrieval/reality-graph";
import {
  buildSpatialQuery,
  toSpatialQueryEngineOutput,
} from "@/lib/spatial-retrieval/spatial-query-builder";
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
 *   Spatial Query · center/radius/category/ranking
 *   Reality Graph · Hotel ─Nearby─ Restaurants
 *   Map pins auto-added via Projection Events
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

  // 3. Anchor Resolver
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

  // 4. Spatial Query Engine
  const query = buildSpatialQuery({ intent, anchor });
  const engineOut = toSpatialQueryEngineOutput(query);
  pushLog(
    logs,
    "query",
    `Spatial Query · center=${engineOut.center ? `${engineOut.center.lat},${engineOut.center.lng}` : "null"} · radius=${engineOut.radius} · category=${engineOut.category} · ranking=[${engineOut.ranking.join(",")}]`,
    logEnabled,
  );

  // 5. Entity Retrieval + Context Score (not distance-only)
  const entities = retrieveSpatialEntities({ query });
  pushLog(
    logs,
    "retrieval",
    `Entity Retrieval · ${entities.length}개 · Context Score ranked`,
    logEnabled,
  );
  for (const e of entities.slice(0, 3)) {
    pushLog(
      logs,
      "retrieval",
      `  ${e.titleKo} · score=${e.contextScore?.total ?? "?"} · ${e.metersFromAnchor}m`,
      logEnabled,
    );
  }

  // 6. Reality Graph (entities + relationships — not POI list)
  const realityEntities = buildRealityEntities({
    anchor,
    entities,
    contextId: context.contextId,
  });
  const relations = generateSpatialRelations({
    anchor,
    entities,
    relation: intent.relation,
  });
  const realityRelationships = extractRealityRelationships(relations);
  pushLog(
    logs,
    "reality_graph",
    `Reality Graph · nodes=${realityEntities.length} · edges=${realityRelationships.length}`,
    logEnabled,
  );
  if (logEnabled) {
    console.log(
      formatRealityGraphSketch({
        anchorLabel: anchor.labelKo,
        relation: intent.relation,
        targets: entities.map((e) => e.titleKo),
      }),
    );
  }

  // 7. Workspace Projection (pins)
  const pins = projectSpatialPins({ anchor, entities });
  pushLog(
    logs,
    "projection",
    `Projection · pins=${pins.length} (anchor+discovered) · auto map update`,
    logEnabled,
  );

  // 8. Context Aware Callout (not Restaurant Card)
  const callouts = buildSpatialCalloutSeeds({
    anchor,
    entities,
    context,
    relation: intent.relation,
    constraints: intent.constraints,
    realityRelationships,
  });
  pushLog(
    logs,
    "callout",
    `Context Aware Callout · ${callouts.length} · mode=discovery`,
    logEnabled,
  );
  if (logEnabled && callouts[0]) {
    console.log(formatContextAwareCalloutSketch(callouts[0]));
  }

  // 9. Projection Event pipeline → Workspace auto-update
  const projectionEvents = emitSpatialProjectionEvents({
    realityEntities,
    relationships: realityRelationships,
    pins,
    callouts,
  });
  for (const ev of projectionEvents) {
    if (
      ev.stage === "entity_created" ||
      ev.stage === "map_update" ||
      ev.stage === "relationship_layer_update" ||
      ev.stage === "callout_created"
    ) {
      pushLog(logs, "projection", ev.message, logEnabled);
    }
  }

  const summaryKo = [
    "Spatial Retrieval",
    `Intent · ${intent.type}`,
    `anchorEntity = ${anchor.labelKo}`,
    `targetEntity = ${capitalizeEntity(intent.targetEntity)}`,
    `relation = ${capitalizeRelation(intent.relation)}`,
    `Spatial Query · r=${query.radius} · ranking=${query.ranking.join("+")}`,
    `Reality Graph · ${realityEntities.length} nodes · ${realityRelationships.length} edges`,
    `Callout · ${callouts.length} discovery`,
  ].join("\n");

  return {
    ok: true,
    intent,
    context,
    anchor,
    resolver,
    query,
    entities,
    realityEntities,
    relations,
    realityRelationships,
    pins,
    callouts,
    projectionEvents,
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
  if (r === "walking_distance") return "Walking Distance";
  if (r === "route_along") return "Route Along";
  if (r === "same_area") return "Same Area";
  if (r === "inside") return "Inside";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

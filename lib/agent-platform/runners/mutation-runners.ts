/**
 * Agent Platform runners — workspace · API · graph mutations (non-browser).
 */

import { observePreferenceFromUtterance } from "@/lib/workstream/preference-graph";
import { prepareHotelReservation } from "@/lib/prepare-layer";
import { applyWorkspacePatch } from "@/lib/context-workspace/workspace-patch/apply-workspace-patch";
import type { WorkspacePatch } from "@/lib/context-workspace/workspace-patch/types";
import { readContextWorkspace, writeContextWorkspace } from "@/lib/context-workspace/workspace-store";
import type { InvokeCapabilityInput } from "../types";

export type RunnerContext = InvokeCapabilityInput & {
  readonly contextEventId: string;
};

export type RunnerResult = {
  readonly ok: boolean;
  readonly output: Record<string, unknown>;
  readonly errorKo?: string;
};

function requireString(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function ensureEditingWorkspace(contextEventId: string): void {
  const prev = readContextWorkspace(contextEventId);
  if (prev && (prev.status === "editing" || prev.status === "committing")) {
    return;
  }
  const now = new Date().toISOString();
  writeContextWorkspace({
    version: 1,
    workspaceId: `ws:${contextEventId}`,
    contextEventId,
    domain: "poi",
    status: "editing",
    query: "",
    summaryKo: "Agent Platform Workspace",
    nodes: [],
    filter: {},
    selectedIds: [],
    compareIds: [],
    surfacePrimary: "embedded_preview",
    openedAtIso: now,
    updatedAtIso: now,
    committedAtIso: null,
    lastChangeKo: null,
    lastWhy: null,
    history: [],
    future: [],
    relationshipEdges: [],
    compilerIr: null,
  });
}

function applyPatch(
  contextEventId: string,
  patch: WorkspacePatch,
  utterance?: string | null,
) {
  ensureEditingWorkspace(contextEventId);
  return applyWorkspacePatch({ contextEventId, patch, utterance });
}

function nodeCount(contextEventId: string): number {
  return readContextWorkspace(contextEventId)?.nodes.length ?? 0;
}

/** Bridge browser hotel.search sandbox output → Workspace lodging nodes for rank/select steps. */
export function ingestHotelSearchSandboxOutput(
  contextEventId: string,
  output: Record<string, unknown> | null,
): { readonly ok: boolean; readonly nodeCount: number } {
  const hotelsFound = typeof output?.hotelsFound === "number" ? output.hotelsFound : 0;
  if (hotelsFound <= 0) {
    return { ok: false, nodeCount: nodeCount(contextEventId) };
  }
  ensureEditingWorkspace(contextEventId);
  const prev = readContextWorkspace(contextEventId);
  if (!prev) {
    return { ok: false, nodeCount: 0 };
  }
  if (prev.nodes.some((node) => node.kind === "lodging")) {
    return { ok: true, nodeCount: prev.nodes.length };
  }

  const location =
    output && typeof output.location === "string" ? output.location : "오사카";
  const count = Math.min(3, hotelsFound);
  const nodes = Array.from({ length: count }, (_, index) => {
    const id = `hotel-${index + 1}`;
    return {
      id,
      kind: "lodging" as const,
      placeId: `lodging-${id}`,
      title: `${location} Hotel ${index + 1}`,
      summaryKo: `${location} 숙소 후보`,
      lat: 34.6937 + index * 0.001,
      lng: 135.5023 + index * 0.001,
      rating: 4.2 - index * 0.1,
      priceBand: 3 - index,
      amountLabel: `${(120_000 - index * 15_000).toLocaleString("ko-KR")}원 / 1박`,
      thumbnailUrl: null,
      tags: ["lodging", "sandbox"],
      visible: true,
      selected: index === 0,
      bookmarked: false,
      source: "agent-platform:hotel.search",
    };
  });

  writeContextWorkspace({
    ...prev,
    domain: "lodging",
    nodes: [...prev.nodes, ...nodes],
    selectedIds: nodes[0] ? [nodes[0].id] : prev.selectedIds,
    updatedAtIso: new Date().toISOString(),
    lastChangeKo: `호텔 ${count}곳 · Sandbox 검색 반영`,
  });

  return { ok: true, nodeCount: prev.nodes.length + nodes.length };
}

export async function runWorkspaceCapability(
  capabilityId: string,
  ctx: RunnerContext,
): Promise<RunnerResult> {
  const workspaceId = requireString(ctx.input, "workspaceId") ?? ctx.contextEventId;
  const patch = ctx.input.patch as WorkspacePatch | undefined;

  switch (capabilityId) {
    case "workspace.inspect": {
      const workspace = readContextWorkspace(workspaceId);
      return {
        ok: true,
        output: {
          workspaceId,
          nodeCount: workspace?.nodes.length ?? 0,
          title: workspace?.summaryKo ?? workspace?.query ?? null,
        },
      };
    }
    case "workspace.entity.create": {
      const entityPatch: WorkspacePatch = patch ?? {
        kind: "create_entity",
        domain: (ctx.input.domain as "lodging" | "eatery" | "poi" | "amenity") ?? "poi",
        query: requireString(ctx.input, "name") ?? requireString(ctx.input, "query") ?? "New Entity",
      };
      const result = applyPatch(workspaceId, entityPatch, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, patchApplied: result.record?.kind ?? null, nodeCount: nodeCount(workspaceId) },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.entity.update": {
      const entityId = requireString(ctx.input, "entityId");
      if (!entityId) {
        return { ok: false, output: {}, errorKo: "entityId가 필요해요." };
      }
      const entityPatch: WorkspacePatch = patch ?? {
        kind: "update_entity",
        entityId,
        fields: (ctx.input.fields as Record<string, unknown>) ?? {},
      };
      const result = applyPatch(workspaceId, entityPatch, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, entityId, patchApplied: result.record?.kind ?? null },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.entity.select": {
      const entityId = requireString(ctx.input, "entityId");
      if (!entityId) {
        return { ok: false, output: {}, errorKo: "entityId가 필요해요." };
      }
      const result = applyPatch(workspaceId, {
        kind: "update_entity",
        entityId,
        fields: { selected: ctx.input.selected !== false },
      }, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, entityId, selected: true, nodeCount: nodeCount(workspaceId) },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.node.sort": {
      const sortBy = (ctx.input.sortBy as "price" | "rating" | "value") ?? "value";
      const result = applyPatch(workspaceId, { kind: "filter_entity", filter: { sortBy } }, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, sortBy, nodeCount: nodeCount(workspaceId) },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.node.filter": {
      const keepTopN = typeof ctx.input.keepTopN === "number" ? ctx.input.keepTopN : 5;
      const result = applyPatch(workspaceId, { kind: "filter_entity", filter: { keepTopN } }, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, keepTopN, nodeCount: nodeCount(workspaceId) },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.constraints.remember": {
      const utterance = requireString(ctx.input, "utterance") ?? ctx.userRequest ?? "";
      const prefs = observePreferenceFromUtterance(utterance);
      const result = applyPatch(workspaceId, {
        kind: "spatial_constraint",
        nearLabelKo: utterance,
      }, utterance);
      return {
        ok: result.ok,
        output: {
          workspaceId,
          remembered: utterance.length > 0,
          preferenceEdges: prefs.edges.length,
          patchApplied: result.record?.kind ?? null,
        },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.anchor.set": {
      const utterance = requireString(ctx.input, "utterance") ?? ctx.userRequest ?? "";
      const result = applyPatch(workspaceId, {
        kind: "spatial_constraint",
        nearLabelKo: utterance,
      }, utterance);
      return {
        ok: result.ok,
        output: { workspaceId, anchorSet: true, patchApplied: result.record?.kind ?? null },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.focus.set": {
      const focusId = requireString(ctx.input, "focusId") ?? requireString(ctx.input, "entityId");
      if (!focusId) {
        return { ok: false, output: {}, errorKo: "focusId가 필요해요." };
      }
      const result = applyPatch(workspaceId, {
        kind: "update_entity",
        entityId: focusId,
        fields: { selected: true },
      }, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, focusId, patchApplied: result.record?.kind ?? null },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.entity.bookmark": {
      const entityId = requireString(ctx.input, "entityId");
      if (!entityId) {
        return { ok: false, output: {}, errorKo: "entityId가 필요해요." };
      }
      const result = applyPatch(workspaceId, {
        kind: "update_entity",
        entityId,
        fields: { bookmarked: ctx.input.bookmarked !== false },
      }, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, entityId, bookmarked: true },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.reality.prepare": {
      const entityId = requireString(ctx.input, "entityId") ?? "lodging-1";
      const prepared = prepareHotelReservation({
        entityId,
        hotelTitle: requireString(ctx.input, "title") ?? "숙소",
        utterance: ctx.userRequest ?? "",
        workspaceId,
        guests: typeof ctx.input.guests === "number" ? ctx.input.guests : 2,
      });
      return {
        ok: prepared.ok,
        output: prepared.ok
          ? {
              workspaceId,
              entityId,
              prepareId: prepared.prepare.prepareId,
              stage: prepared.prepare.status,
              prepare: true,
            }
          : { workspaceId, entityId },
        errorKo: prepared.ok ? undefined : prepared.reasonKo,
      };
    }
    case "workspace.network.absorb": {
      const needId = requireString(ctx.input, "needId") ?? "rail_network";
      const providerId = requireString(ctx.input, "providerId") ?? "cached_overlay";
      const result = applyPatch(workspaceId, {
        kind: "absorb_network",
        needId,
        providerId,
        lineCount: typeof ctx.input.lineCount === "number" ? ctx.input.lineCount : 1,
        stationCount: typeof ctx.input.stationCount === "number" ? ctx.input.stationCount : 1,
        visibility: "show",
      }, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, needId, providerId, patchApplied: result.record?.kind ?? null },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "workspace.patch.apply": {
      if (!patch) {
        return { ok: false, output: {}, errorKo: "patch 객체가 필요해요." };
      }
      const result = applyPatch(workspaceId, patch, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, patchApplied: result.record?.kind ?? null, nodeCount: nodeCount(workspaceId) },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    default:
      return { ok: false, output: {}, errorKo: `workspace runner 없음: ${capabilityId}` };
  }
}

export async function runGraphCapability(
  capabilityId: string,
  ctx: RunnerContext,
): Promise<RunnerResult> {
  const workspaceId = requireString(ctx.input, "workspaceId") ?? ctx.contextEventId;
  const fromId = requireString(ctx.input, "fromId") ?? requireString(ctx.input, "sourceId");
  const toId = requireString(ctx.input, "toId") ?? requireString(ctx.input, "targetId");

  switch (capabilityId) {
    case "graph.connect":
    case "graph.relation.near":
    case "graph.relation.route": {
      if (!fromId || !toId) {
        return { ok: false, output: {}, errorKo: "fromId와 toId가 필요해요." };
      }
      const relation =
        capabilityId === "graph.relation.near"
          ? "near"
          : capabilityId === "graph.relation.route"
            ? "route"
            : ((ctx.input.relation as string) ?? "related");
      const graphRelation =
        relation === "near"
          ? "nearby"
          : relation === "route"
            ? "route"
            : "compare";
      const result = applyPatch(workspaceId, {
        kind: "connect_entity",
        fromId,
        toId,
        relation: graphRelation,
      }, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, fromId, toId, relation, patchApplied: result.record?.kind ?? null },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "graph.node.add": {
      const name = requireString(ctx.input, "name") ?? "Graph Node";
      const result = applyPatch(workspaceId, {
        kind: "create_entity",
        domain: "poi",
        query: name,
      }, ctx.userRequest);
      return {
        ok: result.ok,
        output: { workspaceId, name, nodeCount: nodeCount(workspaceId) },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "graph.context.bind": {
      const contextId = requireString(ctx.input, "contextId") ?? workspaceId;
      return { ok: true, output: { workspaceId, contextId, bound: true } };
    }
    default:
      return { ok: false, output: {}, errorKo: `graph runner 없음: ${capabilityId}` };
  }
}

export async function runApiCapability(
  capabilityId: string,
  ctx: RunnerContext,
): Promise<RunnerResult> {
  const url = requireString(ctx.input, "url");
  const method =
    capabilityId === "api.http.post"
      ? "POST"
      : capabilityId === "api.http.put"
        ? "PUT"
        : capabilityId === "api.http.delete"
          ? "DELETE"
          : "GET";

  switch (capabilityId) {
    case "api.http.get":
    case "api.http.post":
    case "api.http.put":
    case "api.http.delete": {
      if (!url) {
        return { ok: false, output: {}, errorKo: "url이 필요해요." };
      }
      if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
        try {
          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body:
              method === "GET" || method === "DELETE"
                ? undefined
                : JSON.stringify(ctx.input.body ?? {}),
          });
          const text = await res.text();
          let json: unknown = null;
          try {
            json = JSON.parse(text);
          } catch {
            json = { raw: text.slice(0, 2000) };
          }
          return {
            ok: res.ok,
            output: { status: res.status, body: json },
            errorKo: res.ok ? undefined : `HTTP ${res.status}`,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "fetch_failed";
          return { ok: false, output: {}, errorKo: message };
        }
      }
      return {
        ok: true,
        output: { prepare: true, method, url, note: "External URL requires approval gate in production." },
      };
    }
    case "api.transform.json": {
      const data = ctx.input.data;
      return { ok: true, output: { transformed: data ?? null, keys: data && typeof data === "object" ? Object.keys(data as object) : [] } };
    }
    case "api.validate.schema": {
      const schemaId = requireString(ctx.input, "schemaId") ?? "unknown";
      const valid = ctx.input.payload != null;
      return { ok: valid, output: { schemaId, valid }, errorKo: valid ? undefined : "payload가 비어 있어요." };
    }
    case "api.supabase.query": {
      return {
        ok: true,
        output: {
          prepare: true,
          query: ctx.input.query ?? null,
          note: "Supabase query routed through service role in server invoke.",
        },
      };
    }
    default:
      return { ok: false, output: {}, errorKo: `api runner 없음: ${capabilityId}` };
  }
}

export async function runLodgingCompositeCapability(
  capabilityId: string,
  ctx: RunnerContext,
): Promise<RunnerResult> {
  const workspaceId = requireString(ctx.input, "workspaceId") ?? ctx.contextEventId;
  switch (capabilityId) {
    case "hotel.filter": {
      const keepTopN = typeof ctx.input.keepTopN === "number" ? ctx.input.keepTopN : 5;
      return runWorkspaceCapability("workspace.node.filter", { ...ctx, input: { ...ctx.input, keepTopN, workspaceId } });
    }
    case "hotel.rank": {
      const sortBy = (ctx.input.sortBy as "price" | "rating" | "value") ?? "value";
      return runWorkspaceCapability("workspace.node.sort", { ...ctx, input: { ...ctx.input, sortBy, workspaceId } });
    }
    case "hotel.compare": {
      return runGraphCapability("graph.connect", {
        ...ctx,
        input: {
          ...ctx.input,
          workspaceId,
          fromId: requireString(ctx.input, "fromId") ?? "hotel-a",
          toId: requireString(ctx.input, "toId") ?? "hotel-b",
          relation: "compare",
        },
      });
    }
    case "hotel.nearby": {
      const utterance = requireString(ctx.input, "nearLabelKo") ?? requireString(ctx.input, "location") ?? ctx.userRequest ?? "";
      return runWorkspaceCapability("workspace.anchor.set", { ...ctx, input: { utterance, workspaceId } });
    }
    default:
      return { ok: false, output: {}, errorKo: `lodging composite runner 없음: ${capabilityId}` };
  }
}

export async function runTravelCapability(
  capabilityId: string,
  ctx: RunnerContext,
): Promise<RunnerResult> {
  const workspaceId = requireString(ctx.input, "workspaceId") ?? ctx.contextEventId;
  const utterance = requireString(ctx.input, "utterance") ?? ctx.userRequest ?? "";

  switch (capabilityId) {
    case "trip.destination.resolve":
    case "trip.dates.resolve":
    case "trip.plan": {
      const result = applyPatch(workspaceId, {
        kind: "spatial_constraint",
        nearLabelKo: utterance || capabilityId,
      }, utterance);
      return {
        ok: result.ok,
        output: { workspaceId, resolved: capabilityId, utterance },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    case "eatery.search": {
      ensureEditingWorkspace(workspaceId);
      const anchorLabel =
        readContextWorkspace(workspaceId)?.nodes.find((n) => n.selected)?.title ?? null;
      const discoveryUtterance =
        anchorLabel && !/근처|주변|near|기준/iu.test(utterance)
          ? `${anchorLabel} 근처 ${utterance || "맛집"}`
          : utterance || ctx.userRequest || "맛집";
      const { applySpatialDiscoveryToWorkspace } = await import(
        "@/lib/spatial-retrieval/apply-spatial-discovery-to-workspace"
      );
      const spatial = applySpatialDiscoveryToWorkspace({
        utterance: discoveryUtterance,
        contextEventId: workspaceId,
      });
      if (spatial.handled && spatial.entityCount > 0) {
        return {
          ok: true,
          output: {
            workspaceId,
            entityCount: spatial.entityCount,
            relationCount: spatial.relationCount,
            anchorTitleKo: spatial.anchorTitleKo,
            provider: "spatial_retrieval",
          },
        };
      }
      return runWorkspaceCapability("workspace.entity.create", {
        ...ctx,
        input: { workspaceId, domain: "eatery", query: utterance || "맛집" },
      });
    }
    case "transit.absorb": {
      ensureEditingWorkspace(workspaceId);
      const { tryApplyRealityAbsorbFromUtterance } = await import(
        "@/lib/reality-provider/run-reality-absorb"
      );
      const absorbUtterance =
        utterance ||
        ctx.userRequest ||
        (typeof ctx.input.needId === "string" ? `${ctx.input.needId} absorb` : "JR 노선 흡수");
      const absorb = tryApplyRealityAbsorbFromUtterance({
        utterance: absorbUtterance,
        contextEventId: workspaceId,
      });
      if (!absorb) {
        return {
          ok: false,
          output: { workspaceId, needId: ctx.input.needId ?? null },
          errorKo: "교통 absorb Need를 인식하지 못했어요.",
        };
      }
      const ok = absorb.workspacePatched || absorb.mapProjected;
      return {
        ok,
        output: {
          workspaceId,
          needId: absorb.needId,
          providerId: absorb.providerId,
          workspacePatched: absorb.workspacePatched,
          mapProjected: absorb.mapProjected,
          provider: "reality_provider",
        },
        errorKo: ok ? undefined : absorb.statusKo,
      };
    }
    case "poi.discover":
      return runWorkspaceCapability("workspace.entity.create", {
        ...ctx,
        input: { workspaceId, domain: "poi", query: utterance || "POI" },
      });
    case "route.plan":
    case "itinerary.build": {
      const result = applyPatch(workspaceId, { kind: "create_draft", labelKo: utterance || capabilityId }, utterance);
      return {
        ok: result.ok,
        output: { workspaceId, draft: capabilityId },
        errorKo: result.ok ? undefined : result.statusKo,
      };
    }
    default:
      return { ok: false, output: {}, errorKo: `travel runner 없음: ${capabilityId}` };
  }
}

export async function runSystemCapability(
  capabilityId: string,
  ctx: RunnerContext,
): Promise<RunnerResult> {
  switch (capabilityId) {
    case "agent.verify": {
      const targetId = String(ctx.input.targetCapabilityId ?? ctx.input.capabilityId ?? "");
      const output = ctx.input.output as Record<string, unknown> | null;
      if (!targetId || !output) {
        return { ok: false, output: {}, errorKo: "targetCapabilityId와 output이 필요해요." };
      }
      const { verifyCapabilityOutput } = await import("../pipeline/verify-output");
      const verified = verifyCapabilityOutput({ capabilityId: targetId, output });
      return {
        ok: verified.ok,
        output: { verified: verified.ok, errors: verified.errors, capabilityId: targetId },
        errorKo: verified.ok ? undefined : verified.errors.join(" · "),
      };
    }
    case "agent.repair": {
      const targetId = String(ctx.input.targetCapabilityId ?? "");
      const errors = Array.isArray(ctx.input.errors) ? (ctx.input.errors as string[]) : [];
      const { planCapabilityRepair } = await import("../pipeline/repair-invoke");
      const plan = planCapabilityRepair({
        capabilityId: targetId,
        currentInput: (ctx.input.currentInput as Record<string, unknown>) ?? {},
        errors,
        attempt: typeof ctx.input.attempt === "number" ? ctx.input.attempt : 1,
      });
      return {
        ok: Boolean(plan),
        output: plan ?? { repair: false },
        errorKo: plan ? undefined : "repair_plan_unavailable",
      };
    }
    case "agent.plan":
      return { ok: true, output: { planned: true, utterance: ctx.userRequest ?? "" } };
    case "capability.discover": {
      const query = requireString(ctx.input, "query") ?? ctx.userRequest ?? "";
      const { searchRegistry } = await import("../pipeline/publish");
      const hits = searchRegistry(query).slice(0, 8);
      return { ok: true, output: { query, hitCount: hits.length, hits: hits.map((h) => h.capabilityId) } };
    }
    case "capability.publish": {
      const targetId = requireString(ctx.input, "capabilityId");
      if (!targetId) {
        return { ok: false, output: {}, errorKo: "capabilityId가 필요해요." };
      }
      const { publishCatalogCapability } = await import("../pipeline/publish");
      const result = publishCatalogCapability(targetId, requireString(ctx.input, "platformId") ?? undefined);
      return {
        ok: result.ok,
        output: { capabilityId: targetId, indexSize: result.indexSize },
        errorKo: result.errorKo,
      };
    }
    case "capability.invoke": {
      const targetId = requireString(ctx.input, "capabilityId");
      if (!targetId) {
        return { ok: false, output: {}, errorKo: "capabilityId가 필요해요." };
      }
      const { invokePublishedCapability } = await import("../pipeline/invoke");
      const nested = await invokePublishedCapability({
        capabilityId: targetId,
        input: (ctx.input.nestedInput as Record<string, unknown>) ?? {},
        userRequest: ctx.userRequest,
        contextEventId: ctx.contextEventId,
        parentExecutionId: null,
        syncGoal: false,
      });
      return {
        ok: nested.ok,
        output: { nested: nested.output, executionId: nested.executionId },
        errorKo: nested.errorKo,
      };
    }
    case "goal.state.read": {
      const { readPersistedGoalState } = await import("../persistence/goal-state");
      const goal = readPersistedGoalState(ctx.contextEventId);
      return { ok: true, output: { goal } };
    }
    case "goal.state.sync": {
      const { syncPersistedGoalState, createInitialGoalState } = await import("../persistence/goal-state");
      const goal = syncPersistedGoalState(
        createInitialGoalState({
          contextEventId: ctx.contextEventId,
          goalKo: requireString(ctx.input, "goalKo") ?? ctx.userRequest ?? "목표",
          utterance: ctx.userRequest,
          capabilityId: requireString(ctx.input, "capabilityId"),
        }),
      );
      return { ok: true, output: { goal } };
    }
    case "sandbox.session.create": {
      const { sandboxController } = await import("@/lib/sandbox/server");
      const cap = requireString(ctx.input, "capabilityId") ?? requireString(ctx.input, "capability") ?? "hotel.search";
      const session = sandboxController.createSession({
        capability: cap,
        userRequest: ctx.userRequest,
        input: ctx.input,
      });
      return { ok: true, output: { sessionId: session.sessionId, capabilityId: cap } };
    }
    case "execution.stop": {
      const { sandboxController } = await import("@/lib/sandbox/server");
      const sessionId = requireString(ctx.input, "sessionId");
      if (!sessionId) {
        return { ok: false, output: {}, errorKo: "sessionId가 필요해요." };
      }
      const stopped = await sandboxController.stopSession(sessionId);
      return { ok: Boolean(stopped), output: { sessionId, stopped: Boolean(stopped) } };
    }
    case "execution.retry": {
      const { sandboxController } = await import("@/lib/sandbox/server");
      const sessionId = requireString(ctx.input, "sessionId");
      if (!sessionId) {
        return { ok: false, output: {}, errorKo: "sessionId가 필요해요." };
      }
      const retried = sandboxController.retrySession(sessionId);
      return { ok: Boolean(retried), output: { sessionId, newSessionId: retried?.sessionId ?? null } };
    }
    case "execution.resume": {
      const { resumeCompositeLoop } = await import("../pipeline/run-composite-loop");
      const { invokePublishedCapability: invokeOne } = await import("../pipeline/invoke");
      const { readPersistedGoalState } = await import("../persistence/goal-state");
      const goal = readPersistedGoalState(ctx.contextEventId);
      if (goal?.compositeLoopId) {
        const resumed = await resumeCompositeLoop({
          contextEventId: ctx.contextEventId,
          userRequest: ctx.userRequest,
          platformId: requireString(ctx.input, "platformId") ?? undefined,
        });
        return {
          ok: resumed?.ok ?? false,
          output: {
            resumed: true,
            compositeLoopId: goal.compositeLoopId,
            goalPercent: resumed?.goalPercent ?? goal.percent,
            stepsCompleted: resumed?.stepsCompleted ?? 0,
            totalSteps: resumed?.totalSteps ?? 0,
          },
          errorKo: resumed?.ok ? undefined : resumed?.workLogKo ?? "resume_failed",
        };
      }
      const nextCap = goal?.pendingCapabilityIds[0];
      if (!nextCap) {
        return { ok: false, output: { resumed: false }, errorKo: "재개할 pending capability가 없어요." };
      }
      const result = await invokeOne({
        capabilityId: nextCap,
        input: { workspaceId: ctx.contextEventId, ...(ctx.input.nestedInput as Record<string, unknown> ?? {}) },
        userRequest: ctx.userRequest,
        contextEventId: ctx.contextEventId,
        syncGoal: true,
        toolLoop: false,
      });
      return {
        ok: result.ok,
        output: {
          resumed: true,
          capabilityId: nextCap,
          goalPercent: result.goalPercent ?? goal?.percent ?? 0,
          executionId: result.executionId,
        },
        errorKo: result.errorKo,
      };
    }
    default:
      return { ok: false, output: {}, errorKo: `system runner 없음: ${capabilityId}` };
  }
}

export function isWorkspaceCapability(capabilityId: string): boolean {
  return capabilityId.startsWith("workspace.");
}

export function isGraphCapability(capabilityId: string): boolean {
  return capabilityId.startsWith("graph.");
}

export function isApiCapability(capabilityId: string): boolean {
  return capabilityId.startsWith("api.");
}

export function isSystemCapability(capabilityId: string): boolean {
  return (
    capabilityId.startsWith("agent.") ||
    capabilityId.startsWith("capability.") ||
    capabilityId.startsWith("goal.") ||
    capabilityId.startsWith("execution.") ||
    capabilityId.startsWith("sandbox.")
  );
}

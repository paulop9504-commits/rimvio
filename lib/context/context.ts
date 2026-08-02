/**
 * Reality Context — Rimvio basic Reality Unit.
 *
 * Flow:
 *   User Intent → Context Blueprint → Context Instance
 *
 * Context holds current Reality State (not storage-only).
 */

import { compileGlobeIngress } from "@/lib/globe-ingress/compile-globe-ingress";
import { extractTripContextIntelligence } from "@/lib/globe-ingress/extract-trip-context-intelligence";
import {
  assertContextStatusTransition,
  contextStatusLabelKo,
  type RealityContextStatus,
} from "@/lib/context/context-state";

export const REALITY_CONTEXT_ENTITY_KINDS = [
  "Hotel",
  "Flight",
  "Route",
  "Restaurant",
  "Place",
  "Event",
  "Person",
  "Payment",
] as const;

export type RealityContextEntityKind =
  (typeof REALITY_CONTEXT_ENTITY_KINDS)[number];

export type RealityContextEntityRef = {
  readonly entityId: string;
  readonly kind: RealityContextEntityKind | string;
  readonly titleKo: string;
  readonly status?: "discovered" | "candidate" | "prepared" | "committed";
};

export type RealityContextConstraint = {
  readonly id: string;
  readonly key: string;
  readonly value: unknown;
  readonly labelKo?: string | null;
};

export type RealityContextLocation = {
  readonly labelKo: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
};

export type RealityContextTimeRange = {
  readonly startIso: string | null;
  readonly endIso: string | null;
  readonly labelKo: string | null;
};

/**
 * Current Reality State carried by the Context Instance.
 * Updated as Workspace / Graph / Prepare / Commit progress.
 */
export type RealityContextRealityState = {
  readonly phase: string;
  readonly blueprintId: string | null;
  readonly workspaceId: string | null;
  readonly entityCount: number;
  readonly constraintCount: number;
  readonly statusLabelKo: string;
  readonly updatedAtIso: string;
};

/**
 * Context Model — Reality Unit SSOT for this layer.
 */
export type RealityContext = {
  readonly id: string;
  readonly titleKo: string;
  readonly purpose: string;
  readonly location: RealityContextLocation;
  readonly timeRange: RealityContextTimeRange;
  readonly status: RealityContextStatus;
  readonly entities: readonly RealityContextEntityRef[];
  readonly constraints: readonly RealityContextConstraint[];
  /** Live Reality State — not a dump of past facts only */
  readonly realityState: RealityContextRealityState;
  readonly sourceIntent: string | null;
  readonly blueprintId: string | null;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function parseLooseDateRange(
  text: string,
): { startIso: string | null; endIso: string | null; labelKo: string | null } {
  // 8/10~8/13 · 8.10-8.13 · 2026-08-10
  const m = text.match(
    /(\d{1,2})\s*[/.]\s*(\d{1,2})\s*[~～\-–]\s*(\d{1,2})\s*[/.]\s*(\d{1,2})/u,
  );
  if (m) {
    const y = new Date().getFullYear();
    const startIso = `${y}-${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
    const endIso = `${y}-${m[3]!.padStart(2, "0")}-${m[4]!.padStart(2, "0")}`;
    return {
      startIso,
      endIso,
      labelKo: `${Number(m[1])}/${Number(m[2])}~${Number(m[3])}/${Number(m[4])}`,
    };
  }
  const iso = text.match(
    /(\d{4}-\d{2}-\d{2})\s*[~～\-–]\s*(\d{4}-\d{2}-\d{2})/u,
  );
  if (iso) {
    return {
      startIso: iso[1]!,
      endIso: iso[2]!,
      labelKo: `${iso[1]}~${iso[2]}`,
    };
  }
  return { startIso: null, endIso: null, labelKo: null };
}

function extractLocationLabel(intent: string): string {
  const m = intent.match(
    /(오사카|도쿄|후쿠오카|오키나와|제주|부산|서울|대전|osaka|tokyo)/iu,
  );
  if (!m?.[1]) return "미정";
  const raw = m[1];
  if (/osaka/i.test(raw)) return "오사카";
  if (/tokyo/i.test(raw)) return "도쿄";
  return raw;
}

function defaultTravelEntities(locationKo: string): RealityContextEntityRef[] {
  const slug = locationKo.replace(/\s+/g, "_").toLowerCase();
  return [
    {
      entityId: `ent_${slug}_hotel`,
      kind: "Hotel",
      titleKo: "Hotel",
      status: "discovered",
    },
    {
      entityId: `ent_${slug}_flight`,
      kind: "Flight",
      titleKo: "Flight",
      status: "discovered",
    },
    {
      entityId: `ent_${slug}_route`,
      kind: "Route",
      titleKo: "Route",
      status: "discovered",
    },
    {
      entityId: `ent_${slug}_restaurant`,
      kind: "Restaurant",
      titleKo: "Restaurant",
      status: "discovered",
    },
  ];
}

function buildRealityState(input: {
  readonly status: RealityContextStatus;
  readonly blueprintId: string | null;
  readonly workspaceId: string | null;
  readonly entityCount: number;
  readonly constraintCount: number;
}): RealityContextRealityState {
  return {
    phase: input.status,
    blueprintId: input.blueprintId,
    workspaceId: input.workspaceId,
    entityCount: input.entityCount,
    constraintCount: input.constraintCount,
    statusLabelKo: contextStatusLabelKo(input.status),
    updatedAtIso: new Date().toISOString(),
  };
}

export function buildRealityContextTitle(intent: string, locationKo: string): string {
  if (/osaka|오사카/iu.test(intent)) return "Osaka Trip";
  if (/tokyo|도쿄/iu.test(intent)) return "Tokyo Trip";
  if (/여행|trip/iu.test(intent)) return `${locationKo} Trip`;
  return intent.trim().slice(0, 40) || "Context";
}

export function resolveContextPurpose(intent: string): string {
  const intel = extractTripContextIntelligence(intent);
  if (intel.purpose === "shopping_trip") return "Shopping";
  if (intel.purpose === "food_trip") return "Food";
  if (intel.purpose === "sightseeing_trip") return "Sightseeing";
  if (/여행|trip|travel/iu.test(intent)) return "Travel";
  return "General";
}

/**
 * Create Context Instance from User Intent (+ optional Blueprint compile).
 * Does not Commit Reality. Status starts as planning.
 */
export function createRealityContext(input: {
  readonly intent: string;
  readonly id?: string | null;
  readonly titleKo?: string | null;
  readonly purpose?: string | null;
  readonly locationLabelKo?: string | null;
  readonly timeRange?: Partial<RealityContextTimeRange> | null;
  readonly entities?: readonly RealityContextEntityRef[] | null;
  readonly constraints?: readonly RealityContextConstraint[] | null;
  readonly status?: RealityContextStatus;
  readonly compileBlueprint?: boolean;
}): RealityContext {
  const intent = input.intent.trim();
  const locationKo =
    input.locationLabelKo?.trim() || extractLocationLabel(intent);
  const titleKo =
    input.titleKo?.trim() || buildRealityContextTitle(intent, locationKo);
  const purpose = input.purpose?.trim() || resolveContextPurpose(intent);
  const parsedDates = parseLooseDateRange(intent);
  const timeRange: RealityContextTimeRange = {
    startIso: input.timeRange?.startIso ?? parsedDates.startIso,
    endIso: input.timeRange?.endIso ?? parsedDates.endIso,
    labelKo:
      input.timeRange?.labelKo ??
      parsedDates.labelKo ??
      null,
  };

  const entities =
    input.entities && input.entities.length > 0
      ? [...input.entities]
      : defaultTravelEntities(locationKo);

  const intel = extractTripContextIntelligence(intent);
  const constraints: RealityContextConstraint[] = [
    ...(input.constraints ?? []),
  ];
  if (intel.traveler) {
    constraints.push({
      id: "c_traveler",
      key: "traveler",
      value: intel.traveler,
      labelKo: intel.traveler,
    });
  }
  if (intel.purpose !== "general_trip") {
    constraints.push({
      id: "c_purpose_bias",
      key: "purpose_bias",
      value: intel.purpose,
      labelKo: intel.purpose,
    });
  }

  let blueprintId: string | null = null;
  const contextId =
    input.id?.trim() ||
    `ctx_${locationKo.replace(/\s+/g, "-").toLowerCase()}_${Date.now().toString(36)}`;

  if (input.compileBlueprint !== false && intent) {
    try {
      const compiled = compileGlobeIngress({
        text: intent,
        existingContextId: contextId,
      });
      blueprintId = compiled.blueprint.contextId;
    } catch {
      blueprintId = null;
    }
  }

  const status: RealityContextStatus = input.status ?? "planning";
  const now = new Date().toISOString();

  return {
    id: contextId,
    titleKo,
    purpose,
    location: {
      labelKo: locationKo,
      lat: null,
      lng: null,
    },
    timeRange,
    status,
    entities,
    constraints,
    realityState: buildRealityState({
      status,
      blueprintId,
      workspaceId: contextId,
      entityCount: entities.length,
      constraintCount: constraints.length,
    }),
    sourceIntent: intent || null,
    blueprintId,
    createdAtIso: now,
    updatedAtIso: now,
  };
}

/** Convenience: "오사카 여행" → Osaka Trip Context Instance */
export function createOsakaTripContext(input?: {
  readonly intent?: string;
  readonly startIso?: string | null;
  readonly endIso?: string | null;
  readonly labelKo?: string | null;
}): RealityContext {
  const intent =
    input?.intent?.trim() ||
    "오사카 여행 8/10~8/13";
  return createRealityContext({
    intent,
    titleKo: "Osaka Trip",
    purpose: "Travel",
    locationLabelKo: "오사카",
    timeRange: {
      startIso: input?.startIso ?? "2026-08-10",
      endIso: input?.endIso ?? "2026-08-13",
      labelKo: input?.labelKo ?? "8/10~8/13",
    },
    status: "planning",
  });
}

export function withContextStatus(
  ctx: RealityContext,
  status: RealityContextStatus,
): RealityContext {
  assertContextStatusTransition(ctx.status, status);
  const now = new Date().toISOString();
  return {
    ...ctx,
    status,
    realityState: {
      ...ctx.realityState,
      phase: status,
      statusLabelKo: contextStatusLabelKo(status),
      updatedAtIso: now,
    },
    updatedAtIso: now,
  };
}

export function withContextEntities(
  ctx: RealityContext,
  entities: readonly RealityContextEntityRef[],
): RealityContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    entities: [...entities],
    realityState: {
      ...ctx.realityState,
      entityCount: entities.length,
      updatedAtIso: now,
    },
    updatedAtIso: now,
  };
}

export function withContextConstraints(
  ctx: RealityContext,
  constraints: readonly RealityContextConstraint[],
): RealityContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    constraints: [...constraints],
    realityState: {
      ...ctx.realityState,
      constraintCount: constraints.length,
      updatedAtIso: now,
    },
    updatedAtIso: now,
  };
}

export function touchContextRealityState(
  ctx: RealityContext,
  patch: Partial<RealityContextRealityState>,
): RealityContext {
  const now = new Date().toISOString();
  return {
    ...ctx,
    realityState: {
      ...ctx.realityState,
      ...patch,
      updatedAtIso: now,
    },
    updatedAtIso: now,
  };
}

/** @internal */
export function __newConstraintId(): string {
  return newId("c");
}

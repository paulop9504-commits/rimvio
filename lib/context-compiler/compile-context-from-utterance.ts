/**
 * compileContextFromUtterance — Context Compiler entry (ADR-023).
 * Deterministic gates first; LLM not required for v1 IR.
 */

import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import { parseContextFields } from "@/lib/context-field/parse-context-fields";
import { resolveEntities } from "@/lib/entity-resolver/resolve-entities";
import type { EntityKind } from "@/lib/entity-resolver/types";
import { parseTravelDateRangeFromText } from "@/lib/experience-run/travel-context-slots";
import type { SessionGraphV1 } from "@/lib/graph-command/types";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import {
  deriveWorkspaceRelationshipEdges,
  sessionGraphToCompilerGraph,
} from "@/lib/context-compiler/derive-relationship-edges";
import { mergePreferenceFromArchiveRollup } from "@/lib/context-compiler/merge-preference-from-rollup";
import { buildCompilerRealityState } from "@/lib/context-compiler/build-compiler-reality-state";
import type {
  CompilerActionId,
  CompilerEntity,
  CompilerEntityType,
  CompilerPreferenceVector,
  CompilerTimeContext,
  ContextCompilerIrV1,
} from "@/lib/context-compiler/types";
import { CONTEXT_COMPILER_IR_VERSION } from "@/lib/context-compiler/types";

function mapEntityKind(kind: EntityKind): CompilerEntityType {
  switch (kind) {
    case "Location":
    case "Station":
    case "Airport":
      return "location";
    case "Restaurant":
    case "Hotel":
    case "Museum":
      return "place";
    case "Brand":
      return "brand";
    case "Food":
    case "Drink":
    case "Dessert":
      return "food";
    default:
      return "unknown";
  }
}

function inferGoalKo(utterance: string, family: string): string | null {
  if (/여행|trip|travel|놀러|가고\s*싶/i.test(utterance)) {
    return "여행 경험 생성";
  }
  if (/데이트|date/i.test(utterance)) {
    return "데이트 경험";
  }
  if (/맛집|카페|먹을|restaurant|cafe/i.test(utterance)) {
    return "맛집 · 장소 탐색";
  }
  if (/호텔|숙소|hotel|lodging/i.test(utterance)) {
    return "숙소 탐색";
  }
  if (family === "Reserve" || family === "Purchase") {
    return "예약 · 결제 준비";
  }
  if (family === "Search" || family === "Filter") {
    return "장소 탐색";
  }
  return null;
}

function inferHiddenIntent(utterance: string): string[] {
  const hidden: string[] = [];
  if (/쉬|휴식|힐링|relax/i.test(utterance)) {
    hidden.push("휴식");
  }
  if (/새로운|처음|발견|explore/i.test(utterance)) {
    hidden.push("새로운 발견");
  }
  if (/사진|인스타|photo/i.test(utterance)) {
    hidden.push("사진 기록");
  }
  if (/맛집|먹을|카페|food|eat/i.test(utterance)) {
    hidden.push("맛집 탐험");
  }
  if (/데이트|여자친구|남자친구|커플/i.test(utterance)) {
    hidden.push("함께하는 시간");
  }
  return hidden;
}

function inferEmotion(utterance: string): Record<string, number> {
  const emotion: Record<string, number> = {};
  if (/싶|기대|설레|놀러|가고\s*싶/i.test(utterance)) {
    emotion.expectancy = 0.8;
  }
  if (/데이트|로맨틱|여자친구|남자친구/i.test(utterance)) {
    emotion.romantic = 0.9;
  }
  if (/급해|빨리|지금\s*당장/i.test(utterance)) {
    emotion.urgency = 0.7;
  }
  return emotion;
}

function inferPeriod(utterance: string): CompilerTimeContext["period"] {
  if (/오늘|today/i.test(utterance)) {
    return "today";
  }
  if (/주말|weekend/i.test(utterance)) {
    return "weekend";
  }
  if (/저녁|밤|dinner|evening|night/i.test(utterance)) {
    return /밤|night/i.test(utterance) ? "night" : "evening";
  }
  if (/아침|morning/i.test(utterance)) {
    return "morning";
  }
  if (/점심|오후|afternoon|lunch/i.test(utterance)) {
    return "afternoon";
  }
  return null;
}

function inferParticipants(utterance: string): string | null {
  if (/여자친구|남자친구|커플|데이트/i.test(utterance)) {
    return "partner";
  }
  if (/친구|friend/i.test(utterance)) {
    return "friend";
  }
  if (/가족|family|아이|애들/i.test(utterance)) {
    return "family";
  }
  if (/혼자|solo/i.test(utterance)) {
    return "solo";
  }
  return null;
}

function preferenceFromUtterance(
  utterance: string,
  fields: ReturnType<typeof parseContextFields>,
): CompilerPreferenceVector {
  let food = 0.35;
  let nature = 0.3;
  let luxury = 0.3;
  let crowdAvoidance = 0.35;
  let romantic = 0.25;
  let budgetSensitive = 0.4;

  if (/맛집|카페|먹|food|restaurant|cafe/i.test(utterance)) {
    food = 0.85;
  }
  if (/자연|한강|바다|산|캠핑|nature|park/i.test(utterance)) {
    nature = 0.75;
  }
  if (/럭셔리|고급|호텔|5성|luxury/i.test(utterance)) {
    luxury = 0.8;
  }
  if (/한적|한산|사람\s*없는|조용|crowd|웨이팅\s*없/i.test(utterance)) {
    crowdAvoidance = 0.9;
  }
  if (/데이트|로맨틱|분위기|여자친구|남자친구|커플/i.test(utterance)) {
    romantic = 0.85;
  }
  if (
    fields.budget?.softBudget === "low" ||
    fields.price?.maxKrw != null ||
    /싸|저렴|가성비|budget/i.test(utterance)
  ) {
    budgetSensitive = 0.85;
    luxury = Math.min(luxury, 0.35);
  }
  if (fields.crowd?.value === "no_wait") {
    crowdAvoidance = Math.max(crowdAvoidance, 0.8);
  }
  if (fields.companion?.value === "date" || /데이트|로맨틱/i.test(utterance)) {
    romantic = Math.max(romantic, 0.85);
  }

  return {
    food,
    nature,
    luxury,
    crowdAvoidance,
    romantic,
    budgetSensitive,
  };
}

function inferActions(input: {
  family: string;
  utterance: string;
  entityCount: number;
}): CompilerActionId[] {
  const actions: CompilerActionId[] = [];
  const { family, utterance } = input;
  if (
    family === "Search" ||
    family === "Filter" ||
    /찾|추천|보여|search|find/i.test(utterance)
  ) {
    actions.push("search_place", "open_workspace");
  }
  if (family === "Compare" || /비교|compare/i.test(utterance)) {
    actions.push("compare_place");
  }
  if (/동선|루트|route|경로/i.test(utterance)) {
    actions.push("generate_route");
  }
  if (
    family === "Reserve" ||
    family === "Purchase" ||
    /예약|reserve|booking/i.test(utterance)
  ) {
    actions.push("check_reservation");
  }
  if (family === "Filter" || /더\s*싸|평점|저렴/i.test(utterance)) {
    actions.push("filter_place");
  }
  if (/남겨|확정|commit|지구에/i.test(utterance)) {
    actions.push("commit_reality");
  }
  if (actions.length === 0 && input.entityCount > 0) {
    actions.push("search_place");
  }
  return [...new Set(actions)];
}

function inferContextLabel(
  utterance: string,
  entities: readonly CompilerEntity[],
): string | null {
  if (/데이트/i.test(utterance)) {
    return "데이트 여행";
  }
  if (/여행/i.test(utterance)) {
    const loc = entities.find((e) => e.type === "location");
    return loc ? `${loc.value} 여행` : "여행";
  }
  const loc = entities.find((e) => e.type === "location");
  if (loc && /맛집|카페/i.test(utterance)) {
    return `${loc.value} 맛집`;
  }
  return null;
}

export type CompileContextInput = {
  readonly utterance: string;
  readonly referenceDateIso?: string;
  readonly graph?: SessionGraphV1 | null;
  readonly workspace?: ContextWorkspaceState | null;
  readonly contextLabelKo?: string | null;
  /** Capsule Resume — preserve preference · weather lineage. */
  readonly priorIr?: ContextCompilerIrV1 | null;
};

function mergePreferenceVectors(
  base: CompilerPreferenceVector,
  prior: CompilerPreferenceVector | null | undefined,
): CompilerPreferenceVector {
  if (!prior) {
    return base;
  }
  /** Capsule lineage: keep stronger signal (utterance spike or stored affinity). */
  const pick = (a: number, b: number) => Math.max(a, b);
  return {
    food: pick(base.food, prior.food),
    nature: pick(base.nature, prior.nature),
    luxury: pick(base.luxury, prior.luxury),
    crowdAvoidance: pick(base.crowdAvoidance, prior.crowdAvoidance),
    romantic: pick(base.romantic, prior.romantic),
    budgetSensitive: pick(base.budgetSensitive, prior.budgetSensitive),
  };
}

export function compileContextFromUtterance(
  input: CompileContextInput | string,
): ContextCompilerIrV1 {
  const utterance =
    typeof input === "string" ? input.trim() : input.utterance.trim();
  const referenceDateIso =
    typeof input === "string"
      ? new Date().toISOString().slice(0, 10)
      : (input.referenceDateIso?.trim() ||
        new Date().toISOString().slice(0, 10));
  const graph = typeof input === "string" ? null : (input.graph ?? null);
  const workspace =
    typeof input === "string" ? null : (input.workspace ?? null);
  const overrideLabel =
    typeof input === "string" ? null : (input.contextLabelKo ?? null);
  const priorIr = typeof input === "string" ? null : (input.priorIr ?? null);

  const family = classifyIntentFamily(utterance);
  const fields = parseContextFields(utterance);
  const resolved = resolveEntities(utterance);
  const range = parseTravelDateRangeFromText(utterance, referenceDateIso);

  const entities: CompilerEntity[] = resolved.entities.map((e) => ({
    type: mapEntityKind(e.kind),
    value: e.label,
    relation: null,
    confidence: e.confidence,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    sourceId: e.id,
  }));

  if (/여자친구|girlfriend/i.test(utterance)) {
    entities.unshift({
      type: "person",
      value: "여자친구",
      relation: "girlfriend",
      confidence: 0.9,
    });
  } else if (/남자친구|boyfriend/i.test(utterance)) {
    entities.unshift({
      type: "person",
      value: "남자친구",
      relation: "boyfriend",
      confidence: 0.9,
    });
  } else if (/친구/i.test(utterance) && !entities.some((e) => e.type === "person")) {
    entities.unshift({
      type: "person",
      value: "친구",
      relation: "friend",
      confidence: 0.75,
    });
  }

  const preference = mergePreferenceFromArchiveRollup(
    mergePreferenceVectors(
      preferenceFromUtterance(utterance, fields),
      priorIr?.preference,
    ),
  );
  const time: CompilerTimeContext = {
    dateIso: range?.startIso ?? null,
    endDateIso: range?.endIso ?? null,
    period: inferPeriod(utterance) ?? (fields.time?.value === "today" ? "today" : null),
    durationDays: range?.durationDays ?? null,
    participants: inferParticipants(utterance) ?? fields.companion?.value ?? null,
  };

  const sessionGraph = sessionGraphToCompilerGraph(graph);
  const wsEdges = workspace
    ? deriveWorkspaceRelationshipEdges(
        workspace.nodes.map((n) => ({
          id: n.id,
          title: n.title,
          lat: n.lat,
          lng: n.lng,
          visible: n.visible,
          reservable: n.tags.includes("reservable"),
        })),
      )
    : [];
  const wsNodes = workspace
    ? workspace.nodes
        .filter((n) => n.visible)
        .slice(0, 24)
        .map((n) => ({
          id: n.id,
          type: n.kind,
          labelKo: n.title,
          lat: n.lat,
          lng: n.lng,
        }))
    : [];

  const mergedNodes = [...sessionGraph.nodes, ...wsNodes].filter(
    (n, i, arr) => arr.findIndex((x) => x.id === n.id) === i,
  );
  const mergedEdges = [...sessionGraph.edges, ...wsEdges].filter(
    (e, i, arr) => arr.findIndex((x) => x.id === e.id) === i,
  );

  const compiledAtIso = new Date().toISOString();
  return {
    version: CONTEXT_COMPILER_IR_VERSION,
    contextLabelKo:
      overrideLabel?.trim() || inferContextLabel(utterance, entities),
    intent: {
      family,
      goalKo: inferGoalKo(utterance, family),
      hiddenKo: inferHiddenIntent(utterance),
      emotion: inferEmotion(utterance),
    },
    entities,
    time,
    preference,
    constraints: {
      budget: fields.budget?.softBudget ?? null,
      maxWalkMinutes: fields.distance?.maxWalkMinutes ?? null,
      maxPriceKrw: fields.price?.maxKrw ?? null,
      companion: fields.companion?.value ?? inferParticipants(utterance),
    },
    actions: inferActions({
      family,
      utterance,
      entityCount: entities.length,
    }),
    graph: {
      nodes: mergedNodes,
      edges: mergedEdges,
    },
    reality: buildCompilerRealityState({
      weatherCue: fields.weather?.value ?? null,
      priorWeather: priorIr?.reality.weather ?? null,
      workspace,
      asOfIso: compiledAtIso,
    }),
    compiledAtIso,
  };
}

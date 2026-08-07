/**
 * leafHint resolver — deterministic execution leaf before LLM (ADR-053 Phase 2).
 * ActionVerb remains SSOT; leafHint selects Task Graph / Projection leaf.
 */

import type { ActionVerb } from "@/lib/rimvio-command/action-verb";
import type { CommandTarget } from "@/lib/rimvio-command/resolve-command-target";

export const COMMAND_LEAF_HINTS = [
  "workspace_create",
  "context_blueprint_create",
  "plan_generation",
  "entity_discovery",
  "candidate_generation",
  "projection_create",
  "map_overlay",
  "spatial_discovery",
  "decision_layer",
  "score_generation",
  "comparison_projection",
  "graph_node_remove",
  "workspace_patch",
  "constraint_solver",
  "route_optimizer",
  "schedule_optimizer",
  "execute_prepare",
  "context_snapshot",
  "memory_recall",
  "workspace_resume",
  "agent_execute_loop",
  "task_graph_resume",
  "autonomous_execution",
  "simulation",
  "task_graph",
] as const;

export type CommandLeafHint = (typeof COMMAND_LEAF_HINTS)[number];

export type CommandCommitPolicy = "none" | "soft_chip" | "field_commit";

const MAP_OVERLAY_CUE =
  /(?:노선도|노선망|지하철|메트로|전철|신칸센|新幹線|JR|ＪＲ).{0,16}(?:보여|깔|켜|표시|띄워|올려)|(?:보여|깔|켜|표시|띄워|올려).{0,16}(?:노선도|노선|지하철|메트로)/iu;

const GRAPH_REMOVE_CUE =
  /(?:\d{1,2}\s*일차|day\s*\d{1,2}|이\s*일정|일정).{0,20}(?:빼|삭제|제거)|(?:빼|삭제|제거).{0,20}(?:\d{1,2}\s*일차|day\s*\d{1,2}|일정)|(?:USJ|유니버설|오사카성|도톤보리|난바|우메다).{0,12}(?:빼|삭제|제거)|(?:빼|삭제|제거).{0,12}(?:USJ|유니버설)/iu;

const OPTIMIZE_CUE =
  /최적화|줄여(?:줘)?|늘려(?:줘)?|맞춰(?:줘)?|개선|효율화|가볍게\s*(?:해|만들)|optimize/iu;

const SCHEDULE_CUE = /일정|동선|스케줄|여행|코스|플랜|itinera/iu;

const ROUTE_CUE = /이동\s*시간|동선|경로|route|환승/iu;

const TRIP_CREATE_CUE = /여행|출장|트립|trip|프로젝트|project/iu;

const PLAN_CUE = /계획|일정|코스|짜|설계|구성|플랜|plan/iu;

const ENTITY_DISCOVER_CUE =
  /맛집|호텔|숙소|카페|관광|명소|식당|레스토랑|근처|주변|찾아|추천|검색|탐색/iu;

const FALLBACK_BY_VERB: Readonly<Record<ActionVerb, CommandLeafHint>> = {
  create: "context_blueprint_create",
  prepare: "plan_generation",
  search: "entity_discovery",
  move: "workspace_patch",
  book: "execute_prepare",
  edit: "workspace_patch",
  decision: "comparison_projection",
  analyze: "decision_layer",
  memory: "context_snapshot",
  resume: "workspace_resume",
  share: "execute_prepare",
  action: "task_graph",
  cancel: "graph_node_remove",
  auto: "agent_execute_loop",
};

/**
 * Resolve execution leafHint. Always returns a hint when verb is known.
 */
export function resolveLeafHint(input: {
  readonly verb: ActionVerb | null;
  readonly utterance: string;
  readonly target: CommandTarget;
}): CommandLeafHint | null {
  const text = input.utterance.trim();
  const { verb, target } = input;
  if (!verb) return null;

  if (MAP_OVERLAY_CUE.test(text)) return "map_overlay";

  if (
    (verb === "cancel" || verb === "edit") &&
    GRAPH_REMOVE_CUE.test(text)
  ) {
    return "graph_node_remove";
  }

  if (verb === "edit" && OPTIMIZE_CUE.test(text)) {
    if (ROUTE_CUE.test(text)) return "route_optimizer";
    if (SCHEDULE_CUE.test(text) || target === "selected_artifact") {
      return "schedule_optimizer";
    }
    return "constraint_solver";
  }

  if (verb === "analyze" && OPTIMIZE_CUE.test(text)) {
    return SCHEDULE_CUE.test(text) ? "schedule_optimizer" : "constraint_solver";
  }

  if (verb === "analyze") {
    if (/시뮬레이션|가정|만약|이라면|simulate/iu.test(text)) {
      return "simulation";
    }
    if (/평가|점수|score/iu.test(text)) return "score_generation";
    if (/비교/iu.test(text)) return "comparison_projection";
    if (/정리|파악|살펴/iu.test(text)) return "decision_layer";
    return "decision_layer";
  }

  if (verb === "decision") return "comparison_projection";

  if (verb === "create" || verb === "prepare") {
    if (TRIP_CREATE_CUE.test(text) && PLAN_CUE.test(text)) {
      return "plan_generation";
    }
    if (TRIP_CREATE_CUE.test(text) || target === "new_context") {
      return "context_blueprint_create";
    }
    return verb === "prepare" ? "plan_generation" : "workspace_create";
  }

  if (verb === "search") {
    if (ENTITY_DISCOVER_CUE.test(text)) return "entity_discovery";
    if (/보여|깔|띄워|표시|projection/iu.test(text)) {
      return "projection_create";
    }
    if (target === "current_workspace" || target === "current_context") {
      return "spatial_discovery";
    }
    return "candidate_generation";
  }

  if (verb === "book" || verb === "share") return "execute_prepare";

  if (verb === "memory") {
    if (/불러|recall/iu.test(text)) return "memory_recall";
    return "context_snapshot";
  }

  if (verb === "resume") {
    return /불러/iu.test(text) ? "memory_recall" : "workspace_resume";
  }

  if (verb === "auto") {
    if (/계속|이어/iu.test(text)) return "task_graph_resume";
    if (/알아서|맡길|자동/iu.test(text)) return "autonomous_execution";
    return "agent_execute_loop";
  }

  if (verb === "action") {
    if (/예약|결제|구매|신청/iu.test(text)) return "execute_prepare";
    return "task_graph";
  }

  if (verb === "cancel") return "graph_node_remove";
  if (verb === "edit" || verb === "move") return "workspace_patch";

  return FALLBACK_BY_VERB[verb];
}

export function resolveCommitPolicy(input: {
  readonly verb: ActionVerb | null;
  readonly leafHint: CommandLeafHint | null;
}): CommandCommitPolicy {
  const { verb, leafHint } = input;
  if (verb === "book") return "field_commit";
  if (verb === "action" && leafHint === "execute_prepare") {
    return "field_commit";
  }
  if (verb === "share") return "soft_chip";
  if (
    leafHint === "graph_node_remove" ||
    leafHint === "workspace_patch" ||
    leafHint === "schedule_optimizer" ||
    leafHint === "route_optimizer" ||
    leafHint === "constraint_solver" ||
    leafHint === "context_snapshot"
  ) {
    return "soft_chip";
  }
  return "none";
}

/** Soft object hints for Verb+Target+Context binding (not full NER). */
export function resolveCommandObjectHints(utterance: string): {
  readonly locationHint: string | null;
  readonly entityTypeHint: string | null;
  readonly eventRefHint: string | null;
  readonly dayHint: number | null;
} {
  const text = utterance.trim();
  const day = text.match(/(\d{1,2})\s*일차|day\s*(\d{1,2})/iu);
  const dayHint = day
    ? Number(day[1] || day[2])
    : null;

  let entityTypeHint: string | null = null;
  if (/맛집|식당|레스토랑|라멘|카페/iu.test(text)) entityTypeHint = "restaurant";
  else if (/호텔|숙소|료칸/iu.test(text)) entityTypeHint = "hotel";
  else if (/관광|명소|어트랙션|USJ|유니버설/iu.test(text)) {
    entityTypeHint = "attraction";
  } else if (/일정|스케줄|플랜/iu.test(text)) entityTypeHint = "schedule";
  else if (/장바구니|카트|cart/iu.test(text)) entityTypeHint = "cart";

  let eventRefHint: string | null = null;
  const named = text.match(
    /(USJ|유니버설|오사카성|도톤보리|난바|우메다)(?:\s*(?:빼|삭제|제거))?/iu,
  );
  if (named) eventRefHint = named[1] ?? null;

  let locationHint: string | null = null;
  const loc = text.match(
    /(난바|우메다|신사이바시|도톤보리|오사카|도쿄|제주|제주도)(?:\s*근처)?/iu,
  );
  if (loc) locationHint = loc[1] ?? null;

  return { locationHint, entityTypeHint, eventRefHint, dayHint };
}

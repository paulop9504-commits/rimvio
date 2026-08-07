/**
 * Product verb taxonomy — UX alias over ActionVerb (ADR-053).
 * Not a Runtime SSOT enum for ToolId / Commit.
 */

import type { ActionVerb } from "@/lib/rimvio-command/action-verb";
import type { CommandLeafHint } from "@/lib/rimvio-command/resolve-leaf-hint";

export const PRODUCT_VERB_FAMILIES = [
  "CREATE",
  "DISCOVER",
  "ANALYZE",
  "MODIFY",
  "OPTIMIZE",
  "EXECUTE",
  "MEMORY",
  "SIMULATE",
  "MANAGE",
  "DELEGATE",
] as const;

export type ProductVerbFamily = (typeof PRODUCT_VERB_FAMILIES)[number];

const OPTIMIZE_CUE =
  /최적화|줄여(?:줘)?|늘려(?:줘)?|맞춰(?:줘)?|개선|효율화|가볍게\s*(?:해|만들)|optimize/iu;

const SIMULATE_CUE =
  /시뮬레이션|예상해|가정해|테스트해|만약|이라면|predict|simulate/iu;

const MANAGE_CUE =
  /묶어(?:줘)?|나눠(?:줘)?|이름\s*붙여|숨겨(?:줘)?|열어(?:줘)?|닫아(?:줘)?/iu;

/**
 * Map ActionVerb (+ utterance cues / leafHint) → product family alias.
 */
export function resolveProductVerbFamily(input: {
  readonly verb: ActionVerb | null;
  readonly utterance: string;
  readonly leafHint?: CommandLeafHint | null;
}): ProductVerbFamily | null {
  const { verb, utterance, leafHint } = input;
  const text = utterance.trim();
  if (!verb) return null;

  if (leafHint === "graph_node_remove" || leafHint === "workspace_patch") {
    if (OPTIMIZE_CUE.test(text)) return "OPTIMIZE";
    return "MODIFY";
  }
  if (
    leafHint === "schedule_optimizer" ||
    leafHint === "route_optimizer" ||
    leafHint === "constraint_solver"
  ) {
    return "OPTIMIZE";
  }
  if (leafHint === "map_overlay" || leafHint === "entity_discovery") {
    return "DISCOVER";
  }
  if (
    leafHint === "agent_execute_loop" ||
    leafHint === "autonomous_execution" ||
    leafHint === "task_graph_resume"
  ) {
    return "DELEGATE";
  }
  if (leafHint === "simulation") return "SIMULATE";
  if (
    leafHint === "context_blueprint_create" ||
    leafHint === "workspace_create" ||
    leafHint === "plan_generation"
  ) {
    return "CREATE";
  }

  switch (verb) {
    case "create":
      return "CREATE";
    case "prepare":
      if (MANAGE_CUE.test(text)) return "MANAGE";
      return "CREATE";
    case "search":
      return "DISCOVER";
    case "decision":
      return "ANALYZE";
    case "analyze":
      if (SIMULATE_CUE.test(text)) return "SIMULATE";
      if (OPTIMIZE_CUE.test(text)) return "OPTIMIZE";
      return "ANALYZE";
    case "edit":
      if (OPTIMIZE_CUE.test(text)) return "OPTIMIZE";
      if (MANAGE_CUE.test(text)) return "MANAGE";
      return "MODIFY";
    case "cancel":
    case "move":
      return "MODIFY";
    case "book":
      return "EXECUTE";
    case "action":
      if (/예약|결제|구매|신청|부킹|book|purchase|pay/iu.test(text)) {
        return "EXECUTE";
      }
      return "DELEGATE";
    case "share":
      return "EXECUTE";
    case "memory":
    case "resume":
      return "MEMORY";
    case "auto":
      return "DELEGATE";
    default:
      return null;
  }
}

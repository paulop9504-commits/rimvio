/**
 * Per-constraint inheritance policy — never one inheritPreviousConstraints().
 *
 * destination  · explicit change → DROP previous near
 * anchor/near  · deixis → KEEP · target stack → KEEP · new destination → DROP
 * stayType     · lodging → eatery → DROP
 * budget       · same-domain refine/replace → KEEP unless contradicted in utterance
 */

import type { AgentJobTarget } from "@/lib/agent-policy/agent-job";

export type ConstraintField =
  | "destination"
  | "near"
  | "stayType"
  | "budget"
  | "minRating";

export type ConstraintInheritOp = "keep" | "drop" | "from_utterance";

export type ConstraintInheritDecision = {
  readonly field: ConstraintField;
  readonly op: ConstraintInheritOp;
  readonly reason: string;
};

const LOCALE_DEIXIS_RE =
  /거기(?:서|에서|서\s*근처)?|그곳(?:에서|근처)?|여기(?:서|근처)?|같은\s*(?:역|곳|동네|근처)|그\s*근처/iu;

const TARGET_STACK_RE =
  /(?:맛집|호텔|숙소|카페|놀거리|관광|약국)도|(?:그리고|또)\s*(?:맛집|호텔|숙소|카페|놀거리)/iu;

const DESTINATION_PIVOT_RE =
  /후쿠오카|fukuoka|도쿄|tokyo|교토|kyoto|오사카|osaka|서울|부산|제주|나고야|삿포로|고베|오사카성/iu;

export function isTargetStackUtterance(utterance: string): boolean {
  return TARGET_STACK_RE.test(utterance.trim());
}

export function isLocaleDeixisUtterance(utterance: string): boolean {
  return LOCALE_DEIXIS_RE.test(utterance.trim());
}

export function isDestinationPivotUtterance(utterance: string): boolean {
  return DESTINATION_PIVOT_RE.test(utterance.trim());
}

export function planConstraintInheritance(input: {
  readonly utterance: string;
  readonly switchJob: boolean;
  readonly previousTarget?: AgentJobTarget | null;
  readonly nextTarget?: AgentJobTarget | null;
  readonly hasPreviousNear: boolean;
}): readonly ConstraintInheritDecision[] {
  const text = input.utterance.trim();
  const deixis = isLocaleDeixisUtterance(text);
  const targetStack = isTargetStackUtterance(text);
  const destinationPivot = isDestinationPivotUtterance(text);
  const targetChanged =
    Boolean(input.previousTarget) &&
    Boolean(input.nextTarget) &&
    input.previousTarget !== "mixed" &&
    input.nextTarget !== "mixed" &&
    input.previousTarget !== input.nextTarget;
  const utteranceHasNear = /근처|주변|쪽|역\s*앞/iu.test(text);
  const utteranceHasBudget =
    /만원|원\s*이하|저렴|더\s*싸|가성비|budget|cheap/iu.test(text);

  const out: ConstraintInheritDecision[] = [];

  if (destinationPivot) {
    out.push({
      field: "destination",
      op: "from_utterance",
      reason: "explicit_destination_change",
    });
    out.push({
      field: "near",
      op: utteranceHasNear ? "from_utterance" : "drop",
      reason: "new_destination_drops_old_near",
    });
  } else if (targetStack && input.hasPreviousNear) {
    out.push({
      field: "near",
      op: "keep",
      reason: "target_stack_keeps_spatial",
    });
  } else if (deixis && input.hasPreviousNear) {
    out.push({
      field: "near",
      op: "keep",
      reason: "locale_deixis",
    });
  } else if (input.switchJob && !utteranceHasNear && input.hasPreviousNear) {
    out.push({
      field: "near",
      op: "drop",
      reason: "new_job_without_near_or_deixis",
    });
  } else {
    out.push({
      field: "near",
      op: utteranceHasNear ? "from_utterance" : "keep",
      reason: utteranceHasNear ? "utterance_near" : "default_keep_or_empty",
    });
  }

  if (targetChanged && input.nextTarget === "eatery") {
    out.push({
      field: "stayType",
      op: "drop",
      reason: "lodging_to_eatery",
    });
  } else {
    out.push({
      field: "stayType",
      op: "from_utterance",
      reason: "merge_utterance_else_keep",
    });
  }

  out.push({
    field: "budget",
    op: utteranceHasBudget
      ? "from_utterance"
      : input.switchJob && targetChanged
        ? "drop"
        : "keep",
    reason: utteranceHasBudget
      ? "utterance_budget"
      : input.switchJob && targetChanged
        ? "target_change_drops_budget"
        : "keep_budget_same_domain",
  });

  out.push({
    field: "minRating",
    op: /평점|별점|rating/iu.test(text) ? "from_utterance" : "keep",
    reason: "rating_policy",
  });

  return out;
}

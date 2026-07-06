import type {
  ExtractedMessyIntent,
  MessyPromptIR,
  MessyPromptObjective,
} from "@/lib/messy-prompt-interpreter/types";

const OBJECTIVE_OPTIMIZATION: Record<MessyPromptObjective, string[]> = {
  minimize_risk: [
    "minimize_movement_risk",
    "reduce_uncertainty",
    "prefer_indoor_fallback",
  ],
  maximize_efficiency: ["minimize_wait_time", "shortest_path", "reduce_context_switch"],
  reduce_cost: ["exclude_premium_options", "prefer_value_tier"],
  find_nearby: ["minimize_distance", "walkable_radius"],
  fix_problem: ["reproduce_issue", "isolate_root_cause", "minimal_safe_fix"],
  plan_sequence: ["ordered_steps", "dependency_safe"],
  clarify_and_act: ["default_safe_preset", "single_primary_action"],
  unknown: ["clarify_intent", "propose_next_step"],
};

function buildProfessionalRewrite(intent: ExtractedMessyIntent): string {
  const parts = [
    `작업: ${intent.taskLabelKo}`,
    `목표: ${intent.goalKo}`,
  ];
  if (intent.constraints.length > 0) {
    parts.push(`제약: ${intent.constraints.join(" · ")}`);
  }
  if (intent.preferences.length > 0) {
    parts.push(`선호: ${intent.preferences.join(" · ")}`);
  }
  if (intent.entities.length > 0) {
    parts.push(`엔티티: ${intent.entities.join(", ")}`);
  }
  return parts.join("\n");
}

function buildSummaryKo(intent: ExtractedMessyIntent): string {
  const urgency =
    intent.urgency === "high"
      ? "긴급도 높음"
      : intent.urgency === "medium"
        ? "오늘·내일 맥락"
        : "여유 있음";
  return `${intent.taskLabelKo} — ${intent.goalKo} (${urgency})`;
}

/** Stage 2 — intent variables → structured IR (system language). */
export function buildMessyPromptIR(intent: ExtractedMessyIntent): MessyPromptIR {
  const state: MessyPromptIR["state"] = {};
  for (const [key, value] of Object.entries(intent.stateHints)) {
    state[key] = value;
  }

  const optimizationGoals = [
    ...OBJECTIVE_OPTIMIZATION[intent.objective],
    ...intent.preferences.map((pref) => `prefer_${pref.replace(/\s+/g, "_")}`),
  ];

  const uniqueGoals = [...new Set(optimizationGoals)];

  return {
    version: 1,
    domain: intent.domain,
    objective: intent.objective,
    summaryKo: buildSummaryKo(intent),
    professionalRewriteKo: buildProfessionalRewrite(intent),
    state,
    constraints: [...intent.constraints],
    optimizationGoals: uniqueGoals,
    preferences: [...intent.preferences],
    entities: [...intent.entities],
    confidence: intent.confidence,
    assumptions: [...intent.assumptions],
  };
}

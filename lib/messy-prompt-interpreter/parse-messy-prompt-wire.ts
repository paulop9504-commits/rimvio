import type {
  ExtractedMessyIntent,
  MessyPromptDomain,
  MessyPromptIR,
  MessyPromptObjective,
} from "@/lib/messy-prompt-interpreter/types";

const DOMAINS: MessyPromptDomain[] = [
  "travel_planning",
  "lodging",
  "eatery",
  "schedule",
  "navigation",
  "coding_task",
  "general",
];

const OBJECTIVES: MessyPromptObjective[] = [
  "minimize_risk",
  "maximize_efficiency",
  "reduce_cost",
  "find_nearby",
  "fix_problem",
  "plan_sequence",
  "clarify_and_act",
  "unknown",
];

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((row) => (typeof row === "string" ? row.trim() : ""))
    .filter(Boolean);
}

function asDomain(value: unknown): MessyPromptDomain | null {
  const text = asString(value);
  return text && DOMAINS.includes(text as MessyPromptDomain)
    ? (text as MessyPromptDomain)
    : null;
}

function asObjective(value: unknown): MessyPromptObjective | null {
  const text = asString(value);
  return text && OBJECTIVES.includes(text as MessyPromptObjective)
    ? (text as MessyPromptObjective)
    : null;
}

function asState(
  value: unknown,
): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const state: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      state[key] = raw;
    }
  }
  return state;
}

export type MessyPromptLlmWire = {
  domain: MessyPromptDomain;
  objective: MessyPromptObjective;
  task_label_ko: string;
  goal_ko: string;
  summary_ko: string;
  professional_rewrite_ko: string;
  constraints: string[];
  preferences: string[];
  entities: string[];
  state: Record<string, string | number | boolean>;
  optimization_goals: string[];
  assumptions: string[];
  confidence: number;
};

export function parseMessyPromptLlmWire(raw: string): MessyPromptLlmWire | null {
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const domain = asDomain(json.domain);
    const objective = asObjective(json.objective);
    const taskLabel = asString(json.task_label_ko);
    const goalKo = asString(json.goal_ko);
    const summaryKo = asString(json.summary_ko);
    const rewrite = asString(json.professional_rewrite_ko);
    if (!domain || !objective || !taskLabel || !goalKo || !summaryKo || !rewrite) {
      return null;
    }
    const confidence =
      typeof json.confidence === "number"
        ? Math.max(0, Math.min(1, json.confidence))
        : 0.7;
    return {
      domain,
      objective,
      task_label_ko: taskLabel,
      goal_ko: goalKo,
      summary_ko: summaryKo,
      professional_rewrite_ko: rewrite,
      constraints: asStringArray(json.constraints),
      preferences: asStringArray(json.preferences),
      entities: asStringArray(json.entities),
      state: asState(json.state),
      optimization_goals: asStringArray(json.optimization_goals),
      assumptions: asStringArray(json.assumptions),
      confidence,
    };
  } catch {
    return null;
  }
}

export function llmWireToIntent(
  wire: MessyPromptLlmWire,
  raw: string,
  normalized: string,
): ExtractedMessyIntent {
  return {
    raw,
    normalized,
    domain: wire.domain,
    objective: wire.objective,
    taskLabelKo: wire.task_label_ko,
    goalKo: wire.goal_ko,
    constraints: wire.constraints,
    preferences: wire.preferences,
    entities: wire.entities,
    stateHints: wire.state,
    urgency: "medium",
    confidence: wire.confidence,
    assumptions: wire.assumptions,
    ambiguities: [],
  };
}

export function llmWireToIr(wire: MessyPromptLlmWire): MessyPromptIR {
  const state: MessyPromptIR["state"] = { ...wire.state };
  return {
    version: 1,
    domain: wire.domain,
    objective: wire.objective,
    summaryKo: wire.summary_ko,
    professionalRewriteKo: wire.professional_rewrite_ko,
    state,
    constraints: wire.constraints,
    optimizationGoals: wire.optimization_goals,
    preferences: wire.preferences,
    entities: wire.entities,
    confidence: wire.confidence,
    assumptions: wire.assumptions,
  };
}

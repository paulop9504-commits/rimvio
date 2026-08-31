/**
 * Platform Operator model catalog — Cursor-style picker SSOT.
 */

export type OperatorModelProvider = "openai" | "gemini";

export type OperatorModelDefinition = {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly contextWindow: string;
  readonly version?: string;
  readonly provider: OperatorModelProvider;
  readonly recommended?: boolean;
};

export const OPERATOR_MODELS: readonly OperatorModelDefinition[] = [
  {
    id: "gpt-4o",
    label: "GPT-4o",
    shortLabel: "GPT-4o",
    description: "Fast OpenAI model for structured platform changes and tool routing.",
    contextWindow: "128k context window",
    provider: "openai",
    recommended: true,
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    shortLabel: "GPT-4o Mini",
    description: "Lightweight model for quick operator turns and small diffs.",
    contextWindow: "128k context window",
    provider: "openai",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    shortLabel: "Gemini 2.5 Flash",
    description: "Default Rimvio compose model — fast analysis and workspace patches.",
    contextWindow: "1M context window",
    version: "Version: fast",
    provider: "gemini",
    recommended: true,
  },
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    shortLabel: "Gemini 1.5 Pro",
    description: "Higher-quality Gemini for complex platform blueprints and long context.",
    contextWindow: "2M context window",
    provider: "gemini",
  },
] as const;

export type OperatorModelId = (typeof OPERATOR_MODELS)[number]["id"];

export const DEFAULT_OPERATOR_MODEL_ID: OperatorModelId = "gemini-2.5-flash";

export function getOperatorModelById(id: string): OperatorModelDefinition | undefined {
  return OPERATOR_MODELS.find((m) => m.id === id);
}

export function resolveAutoOperatorModel(configured: Partial<Record<OperatorModelProvider, boolean>>): OperatorModelDefinition {
  const openai = configured.openai ?? false;
  const gemini = configured.gemini ?? false;

  if (gemini && !openai) {
    return OPERATOR_MODELS.find((m) => m.provider === "gemini" && m.recommended) ?? OPERATOR_MODELS[2]!;
  }
  if (openai && !gemini) {
    return OPERATOR_MODELS.find((m) => m.provider === "openai" && m.recommended) ?? OPERATOR_MODELS[0]!;
  }
  if (gemini) {
    return OPERATOR_MODELS.find((m) => m.id === "gemini-2.5-flash") ?? OPERATOR_MODELS[2]!;
  }
  return OPERATOR_MODELS.find((m) => m.id === DEFAULT_OPERATOR_MODEL_ID) ?? OPERATOR_MODELS[0]!;
}

export function filterOperatorModels(query: string): readonly OperatorModelDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return OPERATOR_MODELS;
  return OPERATOR_MODELS.filter(
    (m) =>
      m.label.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.provider.includes(q),
  );
}

export function isOperatorModelAvailable(
  model: OperatorModelDefinition,
  configured: Partial<Record<OperatorModelProvider, boolean>>,
): boolean {
  return Boolean(configured[model.provider]);
}

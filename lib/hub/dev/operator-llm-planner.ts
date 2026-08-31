/**
 * LLM planner for Hub Operator — selected model writes the plan.
 * Deterministic planner remains the fallback (ADR-045: one loop).
 */

import { callGeminiTextJson } from "@/lib/llm/gemini-text-client";
import { callOpenAiTextJsonDirect } from "@/lib/llm/openai-json-client";
import { isGeminiConfigured } from "@/lib/locate/gemini-config";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";
import { callLlmTextJson } from "@/lib/llm/text-llm-client";
import {
  HUB_WORKSPACE_TOOL_IDS,
  type HubWorkspaceToolId,
} from "@/lib/hub/dev/hub-workspace-tools";

export type PlannerInspectSnapshot = {
  readonly platformName: string;
  readonly capabilities: readonly string[];
};
import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { OperatorConversationMemory } from "@/lib/hub/dev/conversation-memory";
import { getOperatorModelById, type OperatorModelId } from "@/lib/hub/dev/operator-model-registry";

export type LlmPlanDraft = {
  readonly goalKo: string;
  readonly steps: readonly HubAgentPlanStep[];
  readonly source: "llm" | "fallback";
  readonly modelId: string | null;
};

const TOOL_SET = new Set<string>(HUB_WORKSPACE_TOOL_IDS);

export function isKnownHubToolId(id: string): id is HubWorkspaceToolId {
  return TOOL_SET.has(id);
}

export function parseLlmPlanJson(raw: string): { goalKo: string; steps: HubAgentPlanStep[] } | null {
  const json = extractJsonObject(raw);
  if (!json) return null;

  const goalKo = typeof json.goalKo === "string" ? json.goalKo : typeof json.goal === "string" ? json.goal : "";
  const rawSteps = Array.isArray(json.steps) ? json.steps : [];
  const steps: HubAgentPlanStep[] = [];

  rawSteps.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const rec = item as Record<string, unknown>;
    const toolId = String(rec.toolId ?? rec.tool ?? "");
    if (!isKnownHubToolId(toolId)) return;
    const id = String(rec.id ?? `llm-${index + 1}`);
    const label = String(rec.label ?? rec.title ?? toolId);
    const args =
      rec.args && typeof rec.args === "object" && !Array.isArray(rec.args)
        ? (rec.args as Record<string, unknown>)
        : undefined;
    steps.push({ id, label, toolId, args });
  });

  if (steps.length === 0) return null;
  return { goalKo: goalKo || steps[0]!.label, steps };
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(body) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export function buildOperatorPlanPrompt(input: {
  readonly utterance: string;
  readonly inspect: PlannerInspectSnapshot;
  readonly memory?: OperatorConversationMemory | null;
  readonly repoReady?: boolean;
}): { systemPrompt: string; userText: string } {
  const tools = HUB_WORKSPACE_TOOL_IDS.join(", ");
  const memoryLines = input.memory
    ? [
        `goal=${input.memory.currentGoal ?? ""}`,
        `files=${input.memory.lastFiles.join(",")}`,
        `caps=${input.memory.lastCapabilities.join(",")}`,
        `symbols=${input.memory.lastSymbols.join(",")}`,
      ]
    : [];

  return {
    systemPrompt: [
      "You are the Rimvio Hub Platform Operator planner.",
      "Return JSON only: {\"goalKo\":\"...\",\"steps\":[{\"id\":\"1\",\"label\":\"...\",\"toolId\":\"...\",\"args\":{}}]}",
      `Allowed toolId values: ${tools}`,
      "Prefer real repo tools when a clone exists: repo.clone, code.createFile, code.deleteFile, code.modifyFile, test.generate, test.e2e, lint.run, typecheck.run, server.start.",
      "Use workspace.inspect first when unsure.",
      "Never invent secrets. Never request GitHub tokens.",
      "Keep 3–10 steps. Korean labels.",
    ].join(" "),
    userText: [
      `utterance: ${input.utterance}`,
      `platform: ${input.inspect.platformName}`,
      `capabilities: ${input.inspect.capabilities.slice(0, 20).join(", ")}`,
      `repoReady: ${input.repoReady ? "yes" : "no"}`,
      memoryLines.length ? `memory: ${memoryLines.join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function callOperatorPlannerLlm(input: {
  readonly systemPrompt: string;
  readonly userText: string;
  readonly modelId?: string | null;
}): Promise<string | null> {
  const model = getOperatorModelById(input.modelId ?? "");
  const provider = model?.provider;

  if (provider === "openai" && isOpenAiConfigured()) {
    return callOpenAiTextJsonDirect({
      systemPrompt: input.systemPrompt,
      userText: input.userText,
      temperature: 0.15,
      model: model?.id,
    });
  }

  if (provider === "gemini" && isGeminiConfigured()) {
    return callGeminiTextJson({
      systemPrompt: input.systemPrompt,
      userText: input.userText,
      temperature: 0.15,
    });
  }

  return callLlmTextJson({
    systemPrompt: input.systemPrompt,
    userText: input.userText,
    temperature: 0.15,
  });
}

export async function planOperatorTurnWithLlm(input: {
  readonly utterance: string;
  readonly inspect: PlannerInspectSnapshot;
  readonly memory?: OperatorConversationMemory | null;
  readonly repoReady?: boolean;
  readonly modelId?: string | null;
}): Promise<LlmPlanDraft | null> {
  const prompt = buildOperatorPlanPrompt(input);
  const raw = await callOperatorPlannerLlm({
    ...prompt,
    modelId: input.modelId,
  });
  if (!raw) return null;
  const parsed = parseLlmPlanJson(raw);
  if (!parsed) return null;
  return {
    goalKo: parsed.goalKo,
    steps: parsed.steps,
    source: "llm",
    modelId: (input.modelId as OperatorModelId | undefined) ?? null,
  };
}

export async function fetchOperatorLlmPlan(input: {
  readonly utterance: string;
  readonly inspect: PlannerInspectSnapshot;
  readonly memory?: OperatorConversationMemory | null;
  readonly repoReady?: boolean;
  readonly modelId?: string | null;
}): Promise<LlmPlanDraft | null> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/hub/dev/operator/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utterance: input.utterance,
          inspect: {
            platformName: input.inspect.platformName,
            capabilities: input.inspect.capabilities,
          },
          memory: input.memory
            ? {
                currentGoal: input.memory.currentGoal,
                lastFiles: input.memory.lastFiles,
                lastCapabilities: input.memory.lastCapabilities,
                lastSymbols: input.memory.lastSymbols,
              }
            : null,
          repoReady: input.repoReady ?? false,
          modelId: input.modelId ?? null,
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as LlmPlanDraft | { error?: string };
      if ("steps" in json && Array.isArray(json.steps) && json.steps.length > 0) {
        return json;
      }
      return null;
    } catch {
      return null;
    }
  }

  return planOperatorTurnWithLlm(input);
}

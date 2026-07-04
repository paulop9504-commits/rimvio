import { callLlmTextJson } from "@/lib/llm/text-llm-client";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";
import { isGeminiConfigured } from "@/lib/locate/gemini-config";
import type { LlmMindMapLayoutWire } from "@/lib/situation-projection/mind-map-layout-llm-types";
import {
  buildMindMapLayoutUserPrompt,
  MIND_MAP_LAYOUT_LLM_SYSTEM_PROMPT,
} from "@/lib/situation-projection/mind-map-layout-llm-prompt";
import {
  parseLlmMindMapLayoutWire,
  validateLlmMindMapLayoutWire,
} from "@/lib/situation-projection/parse-llm-mind-map-layout-wire";
import type { SituationProjectionManifest } from "@/lib/situation-projection/types";

function isLlmProviderConfigured(): boolean {
  return isOpenAiConfigured() || isGeminiConfigured();
}

/**
 * Deterministic gate — LLM layout only when manifest has enough structure to rearrange.
 * Phase 3 fallback: skip LLM when provider unavailable or graph is trivial.
 */
export function shouldRequestLlmMindMapLayout(
  manifest: SituationProjectionManifest,
): boolean {
  if (!isLlmProviderConfigured()) {
    return false;
  }
  if (manifest.surfaceKind !== "mind_map" && manifest.surfaceKind !== "situation_map") {
    return false;
  }
  return manifest.nodes.length >= 2;
}

/**
 * Optional LLM layout pass — returns null when unavailable, invalid, or gated off.
 */
export async function requestLlmMindMapLayout(
  manifest: SituationProjectionManifest,
): Promise<LlmMindMapLayoutWire | null> {
  if (!shouldRequestLlmMindMapLayout(manifest)) {
    return null;
  }

  try {
    const raw = await callLlmTextJson({
      systemPrompt: MIND_MAP_LAYOUT_LLM_SYSTEM_PROMPT,
      userText: buildMindMapLayoutUserPrompt(manifest),
      temperature: 0.15,
    });
    const parsed = parseLlmMindMapLayoutWire(raw);
    if (!parsed) {
      return null;
    }
    const failures = validateLlmMindMapLayoutWire(parsed, manifest);
    if (failures.length > 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

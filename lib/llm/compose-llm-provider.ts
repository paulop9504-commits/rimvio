import { isGeminiConfigured } from "@/lib/locate/gemini-config";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";

export type ComposeLlmProvider = "gemini" | "openai";

/** Globe compose chat + slot LLM — env `COMPOSE_LLM_PROVIDER` or auto. */
export function composeLlmProvider(): ComposeLlmProvider {
  const explicit = process.env.COMPOSE_LLM_PROVIDER?.trim().toLowerCase();

  if (explicit === "openai") {
    return "openai";
  }
  if (explicit === "gemini") {
    return "gemini";
  }

  if (isGeminiConfigured() && !isOpenAiConfigured()) {
    return "gemini";
  }
  if (isOpenAiConfigured() && !isGeminiConfigured()) {
    return "openai";
  }

  // Both configured — Gemini default (cheaper; OpenAI quota outages common in dev).
  if (isGeminiConfigured()) {
    return "gemini";
  }

  return "openai";
}

export function isComposeLlmConfigured(): boolean {
  return isGeminiConfigured() || isOpenAiConfigured();
}

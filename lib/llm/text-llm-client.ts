import { composeLlmProvider, type ComposeLlmProvider } from "@/lib/llm/compose-llm-provider";
import { callGeminiText, callGeminiTextJson } from "@/lib/llm/gemini-text-client";
import {
  callOpenAiTextDirect,
  callOpenAiTextJsonDirect,
} from "@/lib/llm/openai-json-client";
import { isGeminiConfigured } from "@/lib/locate/gemini-config";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";

type TextJsonInput = {
  systemPrompt: string;
  userText: string;
  temperature?: number;
};

type TextInput = TextJsonInput & {
  maxTokens?: number;
};

async function callProviderTextJson(
  provider: ComposeLlmProvider,
  input: TextJsonInput,
): Promise<string | null> {
  if (provider === "gemini") {
    if (!isGeminiConfigured()) {
      return null;
    }
    return callGeminiTextJson(input);
  }
  if (!isOpenAiConfigured()) {
    return null;
  }
  return callOpenAiTextJsonDirect(input);
}

async function callProviderText(
  provider: ComposeLlmProvider,
  input: TextInput,
): Promise<string | null> {
  if (provider === "gemini") {
    if (!isGeminiConfigured()) {
      return null;
    }
    return callGeminiText(input);
  }
  if (!isOpenAiConfigured()) {
    return null;
  }
  return callOpenAiTextDirect(input);
}

/** Compose / chat text LLM — primary provider + cross-fallback. */
export async function callLlmTextJson(input: TextJsonInput): Promise<string | null> {
  const primary = composeLlmProvider();
  const secondary: ComposeLlmProvider = primary === "gemini" ? "openai" : "gemini";

  const first = await callProviderTextJson(primary, input);
  if (first) {
    return first;
  }
  return callProviderTextJson(secondary, input);
}

export async function callLlmText(input: TextInput): Promise<string | null> {
  const primary = composeLlmProvider();
  const secondary: ComposeLlmProvider = primary === "gemini" ? "openai" : "gemini";

  const first = await callProviderText(primary, input);
  if (first) {
    return first;
  }
  return callProviderText(secondary, input);
}

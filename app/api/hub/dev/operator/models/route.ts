import { NextResponse } from "next/server";
import { composeLlmProvider } from "@/lib/llm/compose-llm-provider";
import { isGeminiConfigured } from "@/lib/locate/gemini-config";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";
import { OPERATOR_MODELS } from "@/lib/hub/dev/operator-model-registry";

export async function GET() {
  const configured = {
    openai: isOpenAiConfigured(),
    gemini: isGeminiConfigured(),
  };

  return NextResponse.json({
    models: OPERATOR_MODELS,
    configured,
    defaultProvider: composeLlmProvider(),
    anyConfigured: configured.openai || configured.gemini,
  });
}

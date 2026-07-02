export function isGeminiConfigured() {
  return Boolean(geminiApiKey());
}

export function geminiApiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ??
    process.env.GOOGLE_GEMINI_API_KEY?.trim() ??
    ""
  );
}

export function geminiVisionModel() {
  return process.env.GEMINI_VISION_MODEL?.trim() || "gemini-2.5-flash";
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw?.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

/** Paid-tier defaults — override via env when needed. */
export function geminiTextMaxOutputTokens() {
  return readPositiveInt(process.env.GEMINI_TEXT_MAX_OUTPUT_TOKENS, 2048);
}

export function geminiJsonMaxOutputTokens() {
  return readPositiveInt(process.env.GEMINI_JSON_MAX_OUTPUT_TOKENS, 4096);
}

export function geminiVisionMaxOutputTokens() {
  return readPositiveInt(
    process.env.GEMINI_VISION_MAX_OUTPUT_TOKENS,
    geminiJsonMaxOutputTokens(),
  );
}

/**
 * Chat thinking budget. 0 = off (fast). Set GEMINI_CHAT_THINKING_BUDGET=8192 for deeper replies.
 */
export function geminiChatThinkingBudget(): number {
  return readPositiveInt(process.env.GEMINI_CHAT_THINKING_BUDGET, 0);
}

export function geminiGenerationConfig(input: {
  temperature?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
  thinkingBudget?: number | null;
}) {
  const thinkingBudget =
    input.thinkingBudget === undefined
      ? input.jsonMode
        ? null
        : geminiChatThinkingBudget()
      : input.thinkingBudget;

  return {
    temperature: input.temperature ?? 0.8,
    maxOutputTokens: input.maxOutputTokens ?? geminiTextMaxOutputTokens(),
    ...(input.jsonMode ? { responseMimeType: "application/json" as const } : {}),
    ...(thinkingBudget !== null
      ? { thinkingConfig: { thinkingBudget } }
      : {}),
  };
}

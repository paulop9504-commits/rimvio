import {
  geminiApiKey,
  geminiChatThinkingBudget,
  geminiGenerationConfig,
  geminiJsonMaxOutputTokens,
  geminiTextMaxOutputTokens,
  geminiVisionModel,
} from "@/lib/locate/gemini-config";

function readGeminiText(payload: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
}): { text: string | null; truncated: boolean } {
  const candidate = payload.candidates?.[0];
  const text =
    candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";
  const truncated = candidate?.finishReason === "MAX_TOKENS";
  return { text: text || null, truncated };
}

async function callGeminiGenerateContent(input: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
  thinkingBudget?: number | null;
}): Promise<{ text: string | null; truncated: boolean }> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return { text: null, truncated: false };
  }

  const model = geminiVisionModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: input.systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: input.userText }],
          },
        ],
        generationConfig: geminiGenerationConfig({
          temperature: input.temperature,
          maxOutputTokens: input.maxOutputTokens,
          jsonMode: input.jsonMode,
          thinkingBudget: input.thinkingBudget,
        }),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(
        `[gemini-text] generateContent failed ${response.status}: ${detail.slice(0, 240)}`,
      );
      return { text: null, truncated: false };
    }

    const payload = (await response.json()) as Parameters<typeof readGeminiText>[0];
    return readGeminiText(payload);
  } catch (error) {
    console.error("[gemini-text] request failed", error);
    return { text: null, truncated: false };
  }
}

export async function callGeminiText(input: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string | null> {
  const result = await callGeminiGenerateContent({
    systemPrompt: input.systemPrompt,
    userText: input.userText,
    temperature: input.temperature,
    maxOutputTokens: input.maxTokens ?? geminiTextMaxOutputTokens(),
    jsonMode: false,
    thinkingBudget: geminiChatThinkingBudget(),
  });
  return result.text;
}

export async function callGeminiTextJson(input: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string | null> {
  const result = await callGeminiGenerateContent({
    systemPrompt: input.systemPrompt,
    userText: input.userText,
    temperature: input.temperature ?? 0.1,
    maxOutputTokens: input.maxTokens ?? geminiJsonMaxOutputTokens(),
    jsonMode: true,
    thinkingBudget: null,
  });
  return result.text;
}

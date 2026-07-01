import { geminiApiKey, geminiVisionModel } from "@/lib/locate/gemini-config";

function readGeminiText(payload: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}): string | null {
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";
  return text || null;
}

async function callGeminiGenerateContent(input: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
}): Promise<string | null> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return null;
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
        generationConfig: {
          temperature: input.temperature ?? 0.8,
          maxOutputTokens: input.maxOutputTokens ?? 120,
          ...(input.jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(
        `[gemini-text] generateContent failed ${response.status}: ${detail.slice(0, 240)}`,
      );
      return null;
    }

    const payload = (await response.json()) as Parameters<typeof readGeminiText>[0];
    return readGeminiText(payload);
  } catch (error) {
    console.error("[gemini-text] request failed", error);
    return null;
  }
}

export async function callGeminiText(input: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string | null> {
  return callGeminiGenerateContent({
    systemPrompt: input.systemPrompt,
    userText: input.userText,
    temperature: input.temperature,
    maxOutputTokens: input.maxTokens ?? 120,
    jsonMode: false,
  });
}

export async function callGeminiTextJson(input: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
}): Promise<string | null> {
  return callGeminiGenerateContent({
    systemPrompt: input.systemPrompt,
    userText: input.userText,
    temperature: input.temperature ?? 0.1,
    maxOutputTokens: 512,
    jsonMode: true,
  });
}

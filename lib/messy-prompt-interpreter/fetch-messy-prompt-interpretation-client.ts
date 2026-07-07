import type { InterpretAndExecuteResult } from "@/lib/messy-prompt-interpreter/types";

export type FetchMessyPromptInterpretationInput = {
  message: string;
  situation?: Record<string, string | number | boolean | null>;
  useLlm?: boolean;
  signal?: AbortSignal;
};

/** Browser-only — server LLM path for messy prompt interpreter. */
export async function fetchMessyPromptInterpretationClient(
  input: FetchMessyPromptInterpretationInput,
): Promise<InterpretAndExecuteResult | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const message = input.message.trim();
  if (!message) {
    return null;
  }

  try {
    const response = await fetch("/api/messy-prompt/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        situation: input.situation,
        use_llm: input.useLlm !== false,
      }),
      signal: input.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      result?: InterpretAndExecuteResult;
    };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

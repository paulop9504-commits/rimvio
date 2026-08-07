/**
 * Cursor-like Workspace Vision — image bytes in → Workspace plan JSON out.
 * Patch/scout only. Never essay SSOT.
 */

import { callOpenAiVisionJson } from "@/lib/llm/openai-json-client";
import {
  captureVisionProvider,
  isCaptureVisionConfigured,
} from "@/lib/locate/vision-provider-config";
import { geminiApiKey, geminiJsonMaxOutputTokens, geminiVisionModel } from "@/lib/locate/gemini-config";

export const WORKSPACE_VISION_DOMAINS = [
  "lodging",
  "eatery",
  "poi",
  "amenity",
] as const;

export type WorkspaceVisionDomain = (typeof WORKSPACE_VISION_DOMAINS)[number];

export type WorkspaceVisionPlan = {
  readonly intentKo: string;
  /** Short NL the Agent Loop should execute (scout / patch cue). */
  readonly scoutQuery: string;
  readonly domain: WorkspaceVisionDomain | null;
  /** One-line work log — never essay. */
  readonly statusKo: string;
  readonly work: "scout" | "locate" | "compare" | "note";
};

export const WORKSPACE_VISION_SYSTEM_PROMPT = `# Role
You are Rimvio Workspace Vision Agent (Cursor-style).
The user attached an image to the Workspace Agent. LOOK at the image.
Plan the next Workspace action as JSON only — never write a chat essay.

# Output JSON only
{
  "intentKo": "한 줄 — 사진에서 읽은 사용자 의도",
  "scoutQuery": "Agent가 바로 실행할 짧은 한국어 명령 (예: 오사카 난바 라멘집 찾아줘)",
  "domain": "lodging" | "eatery" | "poi" | "amenity" | null,
  "statusKo": "작업 로그 한 줄 (≤40자)",
  "work": "scout" | "locate" | "compare" | "note"
}

# Rules
- VISION FIRST — do not dump raw OCR as the product answer.
- scoutQuery must be an operable Rimvio command (찾아줘 / 비교해줘 / 어디야).
- Hotel / ryokan / capsule screenshot → domain lodging.
- Menu / food / restaurant → domain eatery.
- Landmark / attraction → domain poi.
- If unclear, work:"note" with a short scoutQuery asking to clarify place.
- statusKo never exceeds 40 Korean characters.
- Never invent a booking Commit. Prepare/search only.
`;

function asDomain(raw: unknown): WorkspaceVisionDomain | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  return (WORKSPACE_VISION_DOMAINS as readonly string[]).includes(t)
    ? (t as WorkspaceVisionDomain)
    : null;
}

function asWork(raw: unknown): WorkspaceVisionPlan["work"] {
  if (raw === "locate" || raw === "compare" || raw === "note" || raw === "scout") {
    return raw;
  }
  return "scout";
}

export function parseWorkspaceVisionPlan(
  raw: string | null | undefined,
): WorkspaceVisionPlan | null {
  const text = raw?.trim();
  if (!text) return null;
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const json = JSON.parse(text.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
    const intentKo =
      typeof json.intentKo === "string" ? json.intentKo.trim() : "";
    const scoutQuery =
      typeof json.scoutQuery === "string" ? json.scoutQuery.trim() : "";
    const statusRaw =
      typeof json.statusKo === "string" ? json.statusKo.trim() : "";
    if (!scoutQuery && !intentKo) return null;
    const statusKo = (statusRaw || intentKo || scoutQuery).slice(0, 40);
    return {
      intentKo: intentKo || scoutQuery,
      scoutQuery: scoutQuery || `${intentKo} 찾아줘`,
      domain: asDomain(json.domain),
      statusKo,
      work: asWork(json.work),
    };
  } catch {
    return null;
  }
}

async function callGeminiWorkspaceVision(input: {
  buffer: Buffer;
  mimeType: string;
  userText: string;
}): Promise<string> {
  const apiKey = geminiApiKey();
  if (!apiKey) throw new Error("gemini_not_configured");
  const model = geminiVisionModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${WORKSPACE_VISION_SYSTEM_PROMPT}\n\nUser note:\n${input.userText}`,
            },
            {
              inline_data: {
                mime_type: input.mimeType,
                data: input.buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: geminiJsonMaxOutputTokens(),
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`gemini_failed:${response.status}:${detail.slice(0, 240)}`);
  }
  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

/** Server-only: multimodal image → WorkspaceVisionPlan. */
export async function planWorkspaceFromImage(input: {
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly userText?: string | null;
}): Promise<WorkspaceVisionPlan | null> {
  if (!isCaptureVisionConfigured()) return null;
  const userText =
    input.userText?.trim() ||
    "Look at this image and plan the next Workspace action.";
  const provider = captureVisionProvider();
  const raw =
    provider === "openai"
      ? await callOpenAiVisionJson({
          systemPrompt: WORKSPACE_VISION_SYSTEM_PROMPT,
          userText,
          buffer: input.buffer,
          mimeType: input.mimeType || "image/jpeg",
          temperature: 0.15,
        })
      : await callGeminiWorkspaceVision({
          buffer: input.buffer,
          mimeType: input.mimeType || "image/jpeg",
          userText,
        });
  return parseWorkspaceVisionPlan(raw);
}

/** Build agent utterance from plan — short operable command, no OCR dump. */
export function utteranceFromWorkspaceVisionPlan(
  plan: WorkspaceVisionPlan,
  extraText?: string | null,
): string {
  const extra = extraText?.trim();
  if (extra && !plan.scoutQuery.includes(extra)) {
    return `${extra}\n${plan.scoutQuery}`.trim();
  }
  return plan.scoutQuery.trim();
}

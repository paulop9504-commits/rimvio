/**
 * Client: File → multimodal Vision plan API → Agent turn payload.
 * Cursor-like: model sees the image; Agent gets a short operable command (not OCR essay).
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import { readImageAsDataUrl } from "@/lib/screenshot/ocr-text";
import {
  utteranceFromWorkspaceVisionPlan,
  type WorkspaceVisionPlan,
} from "@/lib/context-run/workspace-vision-plan";

export type WorkspaceImageAgentTurn = {
  /** Operable NL for applyGlobeWorkspaceAgentTurn. */
  readonly utterance: string;
  /** Chat bubble label — short, with photo mark. */
  readonly chatLabelKo: string;
  readonly plan: WorkspaceVisionPlan | null;
  /** Optional thumbnail for chat UI. */
  readonly previewUrl: string | null;
};

export async function prepareWorkspaceImageAgentTurn(input: {
  readonly file: File;
  readonly extraText?: string | null;
}): Promise<WorkspaceImageAgentTurn> {
  const extra = input.extraText?.trim() || "";
  let previewUrl: string | null = null;
  try {
    previewUrl = await readImageAsDataUrl(input.file);
  } catch {
    previewUrl = null;
  }

  const form = new FormData();
  form.append("image", input.file);
  if (extra) form.append("userText", extra);

  try {
    const res = await fetchWithTimeout("/api/workspace/vision-plan", {
      method: "POST",
      body: form,
      timeoutMs: 45_000,
    });
    if (res.ok) {
      const body = (await res.json()) as {
        ok?: boolean;
        plan?: WorkspaceVisionPlan | null;
      };
      if (body.plan) {
        const utterance = utteranceFromWorkspaceVisionPlan(body.plan, extra);
        return {
          utterance,
          chatLabelKo: `📷 ${body.plan.intentKo.slice(0, 48)}`,
          plan: body.plan,
          previewUrl,
        };
      }
    }
  } catch {
    /* fall through */
  }

  // Soft fallback — still short; never dump OCR essay into Agent.
  const utterance =
    extra ||
    "이 사진을 보고 Workspace에서 다음 작업을 진행해줘";
  return {
    utterance,
    chatLabelKo: extra ? `📷 ${extra.slice(0, 48)}` : "📷 사진 첨부",
    plan: null,
    previewUrl,
  };
}

/** @deprecated Use prepareWorkspaceImageAgentTurn — kept for call-site migration. */
export async function buildWorkspaceImageAgentUtterance(input: {
  readonly file: File;
  readonly extraText?: string | null;
}): Promise<string> {
  const turn = await prepareWorkspaceImageAgentTurn(input);
  return turn.utterance;
}

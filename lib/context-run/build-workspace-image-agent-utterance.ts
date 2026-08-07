/**
 * Image → Vision/OCR → NL utterance for Workspace Agent turns (Cursor-like attach).
 */

import {
  buildComposerOrchestrateMessage,
  createImageAttachment,
  resolveComposerAttachments,
  revokeComposerAttachmentUrls,
} from "@/lib/action-chat/composer-attachments";

export async function buildWorkspaceImageAgentUtterance(input: {
  readonly file: File;
  readonly extraText?: string | null;
}): Promise<string> {
  const attachment = createImageAttachment(input.file);
  try {
    const resolved = await resolveComposerAttachments([attachment]);
    return buildComposerOrchestrateMessage({
      text: input.extraText?.trim() || "이 사진을 분석해서 Workspace에 반영해줘",
      contextBlock: resolved.contextBlock,
    });
  } finally {
    revokeComposerAttachmentUrls([attachment]);
  }
}

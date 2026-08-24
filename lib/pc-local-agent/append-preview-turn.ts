import { appendContextAgentComposeTurn } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import type { PcAgentTask } from "@/lib/pc-local-agent";

export function appendPcContinuityPreviewTurn(
  eventId: string,
  input: { task: PcAgentTask; deviceName: string; messageKo: string },
): void {
  const id = eventId.trim();
  if (!id) {
    return;
  }
  appendContextAgentComposeTurn(id, {
    role: "assistant",
    kind: "pc_continuity_preview",
    text: input.messageKo,
    payload: {
      taskId: input.task.id,
      title: input.task.payload.title ?? "구매",
      deviceName: input.deviceName,
    },
  });
}

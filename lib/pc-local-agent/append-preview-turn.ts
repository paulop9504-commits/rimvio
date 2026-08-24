import { appendContextAgentComposeTurn } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import type { PcAgentTask } from "@/lib/pc-local-agent";
import { bindPcPurchaseLiveWork } from "@/lib/globe/live-work/bind-pc-purchase-work";

export function appendPcContinuityPreviewTurn(
  eventId: string,
  input: { task: PcAgentTask; deviceName: string; messageKo: string },
): void {
  const id = eventId.trim();
  bindPcPurchaseLiveWork({
    contextEventId: id || `shop:${input.task.id}`,
    task: input.task,
    deviceName: input.deviceName,
  });
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

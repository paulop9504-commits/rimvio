import { copy } from "@/lib/copy/human-ko";
import type { PcAgentDevice, PcAgentTask } from "@/lib/pc-local-agent";
import {
  extractPcPurchaseTitle,
  isPcPurchaseContinuityUtterance,
} from "@/lib/pc-local-agent/purchase-intent";

export type PcPurchaseContinuityResult =
  | { kind: "skip" }
  | { kind: "preview"; task: PcAgentTask; deviceName: string; messageKo: string }
  | { kind: "blocked"; messageKo: string };

export async function runPcPurchaseContinuity(
  utterance: string,
): Promise<PcPurchaseContinuityResult> {
  if (!isPcPurchaseContinuityUtterance(utterance)) {
    return { kind: "skip" };
  }
  const title = extractPcPurchaseTitle(utterance);
  const devicesRes = await fetch("/api/pc-agent/devices");
  if (devicesRes.status === 401) {
    return { kind: "blocked", messageKo: copy.globe.pcContinuity.needLogin };
  }
  if (!devicesRes.ok) {
    return { kind: "blocked", messageKo: copy.globe.pcContinuity.needPc };
  }
  const devicesBody = (await devicesRes.json()) as { devices?: PcAgentDevice[] };
  const online = (devicesBody.devices ?? []).find((row) => row.status === "ONLINE");
  if (!online) {
    return { kind: "blocked", messageKo: copy.globe.pcContinuity.needPc };
  }

  const res = await fetch("/api/pc-agent/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      deviceId: online.id,
      type: "OPEN_URL",
      payload: {
        url: "https://example.com",
        title,
        intent: "purchase",
      },
    }),
  });
  if (res.status === 401) {
    return { kind: "blocked", messageKo: copy.globe.pcContinuity.needLogin };
  }
  if (!res.ok) {
    return { kind: "blocked", messageKo: copy.globe.pcContinuity.needPc };
  }
  const data = (await res.json()) as { task: PcAgentTask };
  return {
    kind: "preview",
    task: data.task,
    deviceName: online.name,
    messageKo: copy.globe.pcContinuity.started(title, online.name || copy.globe.pcContinuity.pcFallback),
  };
}

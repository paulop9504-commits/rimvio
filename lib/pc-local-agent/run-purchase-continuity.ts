import { copy } from "@/lib/copy/human-ko";
import type { PcAgentDevice, PcAgentTask } from "@/lib/pc-local-agent";
import { bindPcPurchaseLiveWork } from "@/lib/globe/live-work/bind-pc-purchase-work";
import {
  extractPcPurchaseQuery,
  extractPcPurchaseTitle,
  isPcPurchaseContinuityUtterance,
  resolvePcPurchaseOpenUrl,
} from "@/lib/pc-local-agent/purchase-intent";
import { deviceNeedsPcSetupUpdate } from "@/lib/pc-local-agent/pc-app-version";
import {
  PC_PURCHASE_PROGRAM_QUERY,
  PC_SETUP_UPDATE_QUERY,
} from "@/lib/pc-local-agent/program-install-catalog";

export type PcPurchaseContinuityResult =
  | { kind: "skip" }
  | {
      kind: "preview";
      task: PcAgentTask;
      deviceName: string;
      messageKo: string;
      queuedOffline: boolean;
      needsUpdate?: boolean;
      appVersion?: string | null;
    }
  | { kind: "arming"; messageKo: string; query: string }
  | { kind: "login"; messageKo: string };

export async function runPcPurchaseContinuity(
  utterance: string,
  contextEventId?: string,
): Promise<PcPurchaseContinuityResult> {
  if (!isPcPurchaseContinuityUtterance(utterance)) {
    return { kind: "skip" };
  }
  const title = extractPcPurchaseTitle(utterance);
  const devicesRes = await fetch("/api/pc-agent/devices");
  if (devicesRes.status === 401) {
    return { kind: "login", messageKo: copy.globe.pcContinuity.needLogin };
  }
  if (!devicesRes.ok) {
    return {
      kind: "arming",
      messageKo: copy.globe.pcContinuity.agentNeedPrograms,
      query: PC_PURCHASE_PROGRAM_QUERY,
    };
  }
  const devicesBody = (await devicesRes.json()) as { devices?: PcAgentDevice[] };
  const list = devicesBody.devices ?? [];
  const online = list.find((row) => row.status === "ONLINE");
  const device = online ?? list[0];
  if (!device) {
    return {
      kind: "arming",
      messageKo: copy.globe.pcContinuity.agentNeedPrograms,
      query: PC_PURCHASE_PROGRAM_QUERY,
    };
  }

  const res = await fetch("/api/pc-agent/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      deviceId: device.id,
      type: "OPEN_URL",
      payload: {
        url: resolvePcPurchaseOpenUrl(utterance),
        title,
        query: extractPcPurchaseQuery(utterance),
        intent: "purchase",
      },
    }),
  });
  if (res.status === 401) {
    return { kind: "login", messageKo: copy.globe.pcContinuity.needLogin };
  }
  if (!res.ok) {
    return {
      kind: "arming",
      messageKo: copy.globe.pcContinuity.agentNeedPrograms,
      query: PC_PURCHASE_PROGRAM_QUERY,
    };
  }
  const data = (await res.json()) as { task: PcAgentTask };
  bindPcPurchaseLiveWork({
    contextEventId: contextEventId?.trim() || `shop:${data.task.id}`,
    task: data.task,
    deviceName: device.name,
  });
  const queuedOffline = device.status !== "ONLINE";
  const needsUpdate = deviceNeedsPcSetupUpdate(device);
  return {
    kind: "preview",
    task: data.task,
    deviceName: device.name,
    queuedOffline,
    needsUpdate,
    appVersion: device.appVersion ?? null,
    messageKo: queuedOffline
      ? copy.globe.pcContinuity.agentWaitingOnline
      : copy.globe.pcContinuity.started(
          title,
          device.name || copy.globe.pcContinuity.pcFallback,
        ),
  };
}

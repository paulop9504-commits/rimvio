import { copy } from "@/lib/copy/human-ko";
import type { PcAgentDevice, PcAgentTask } from "@/lib/pc-local-agent";
import { PC_PURCHASE_PROGRAM_QUERY } from "@/lib/pc-local-agent/program-install-catalog";
import { resolvePcRemoteCommand } from "@/lib/pc-local-agent/remote-command";
import { startPcPurchaseAgentRun } from "@/lib/pc-local-agent/run-purchase-agent";

export type PcRemoteCommandResult =
  | { kind: "preview"; task: PcAgentTask; deviceName: string; messageKo: string }
  | { kind: "arming"; messageKo: string; query: string }
  | { kind: "login"; messageKo: string };

export async function runPcRemoteCommand(
  utterance: string,
): Promise<PcRemoteCommandResult> {
  const plan = resolvePcRemoteCommand(utterance);
  const pc = copy.globe.pcContinuity;

  if (plan.kind === "purchase") {
    const result = await startPcPurchaseAgentRun({ utterance });
    if (result.kind === "skip") {
      return { kind: "arming", messageKo: pc.connectFailed, query: utterance };
    }
    if (result.kind === "login") {
      return result;
    }
    if (result.kind === "arming") {
      return result;
    }
    return {
      kind: "preview",
      task: result.task,
      deviceName: result.deviceName,
      messageKo: result.messageKo,
    };
  }

  const devicesRes = await fetch("/api/pc-agent/devices");
  if (devicesRes.status === 401) {
    return { kind: "login", messageKo: pc.needLogin };
  }
  if (!devicesRes.ok) {
    return {
      kind: "arming",
      messageKo: pc.agentNeedPrograms,
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
      messageKo: pc.agentNeedPrograms,
      query: plan.kind === "install" ? plan.query : PC_PURCHASE_PROGRAM_QUERY,
    };
  }

  if (plan.kind === "install") {
    return { kind: "arming", messageKo: pc.programOfferBody, query: plan.query };
  }

  const res = await fetch("/api/pc-agent/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      deviceId: device.id,
      type: "OPEN_URL",
      payload: {
        url: plan.url,
        title: plan.title,
        query: utterance.trim(),
      },
    }),
  });
  if (res.status === 401) {
    return { kind: "login", messageKo: pc.needLogin };
  }
  if (!res.ok) {
    return {
      kind: "arming",
      messageKo: pc.connectFailed,
      query: utterance,
    };
  }
  const data = (await res.json()) as { task: PcAgentTask };
  const queuedOffline = device.status !== "ONLINE";
  return {
    kind: "preview",
    task: data.task,
    deviceName: device.name,
    messageKo: queuedOffline
      ? pc.agentWaitingOnline
      : pc.remoteStarted(device.name || pc.pcFallback),
  };
}

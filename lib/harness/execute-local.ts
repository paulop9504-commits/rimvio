/**
 * Dispatch Harness (DESKTOP/Local) to PC Local Agent via OPEN_URL queue.
 * Multi-step browser actions on PC are not yet a task type — first NAVIGATE/GET URL only.
 */

import type { Harness } from "@/lib/rimvio-protocol/harness/schema";
import { validateHarness } from "@/lib/harness/validate";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { insertQueuedOpenUrlTask } from "@/lib/pc-local-agent/task-dispatch";
import { isPcAgentNavigableUrl } from "@/lib/pc-local-agent/url-safety";
import { RESEARCH_NODE_ID } from "@/lib/harness/labelling";

export type HarnessLocalDispatchInput = {
  readonly harness: unknown;
  readonly userId: string;
  readonly deviceId?: string;
  readonly variables?: Readonly<Record<string, string>>;
};

export type HarnessLocalDispatchResult = {
  readonly ok: boolean;
  readonly taskId: string | null;
  readonly deviceId: string | null;
  readonly url: string | null;
  readonly offline: boolean;
  readonly error: string | null;
  readonly message: string;
};

function extractStartUrl(
  harness: Harness,
  variables: Readonly<Record<string, string>>,
): string | null {
  const research = harness.nodes.find((n) => n.id === RESEARCH_NODE_ID) ?? harness.nodes[0];
  const actions = research?.actions ?? [];
  for (const action of actions) {
    if (action.type === "NAVIGATE" || action.type === "GET") {
      let url = action.target?.url?.trim() || action.input?.trim() || "";
      url = url.replace(/\{\{(\w+)\}\}/g, (_, k: string) => variables[k] ?? "");
      if (url) return url;
    }
  }
  const host = harness.metadata?.targetHost?.trim();
  if (host) {
    return host.startsWith("http") ? host : `https://${host}`;
  }
  return null;
}

export async function dispatchHarnessToLocalAgent(
  input: HarnessLocalDispatchInput,
): Promise<HarnessLocalDispatchResult> {
  const parsed = validateHarness(input.harness);
  if (!parsed.ok) {
    return {
      ok: false,
      taskId: null,
      deviceId: null,
      url: null,
      offline: false,
      error: "invalid_harness",
      message: parsed.issues.map((i) => i.message).join("; "),
    };
  }

  const harness = parsed.harness;
  if (harness.runtime.type !== "DESKTOP" && harness.runtime.type !== "PHYSICAL_DEVICE") {
    return {
      ok: false,
      taskId: null,
      deviceId: null,
      url: null,
      offline: false,
      error: "not_desktop_runtime",
      message: "Local Agent dispatch requires runtime.type DESKTOP (Labeller에서 Local 선택).",
    };
  }

  const url = extractStartUrl(harness, input.variables ?? {});
  if (!url || !isPcAgentNavigableUrl(url)) {
    return {
      ok: false,
      taskId: null,
      deviceId: null,
      url,
      offline: false,
      error: "missing_or_blocked_url",
      message: "Harness에서 실행 가능한 http(s) 시작 URL(NAVIGATE/GET)이 필요합니다.",
    };
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      taskId: null,
      deviceId: null,
      url,
      offline: false,
      error: "service_unavailable",
      message: "Supabase service role이 없어 Local Agent 큐에 넣을 수 없습니다.",
    };
  }

  let deviceId = input.deviceId?.trim();
  let offline = false;
  if (!deviceId) {
    const { data: preferred } = await admin
      .from("pc_local_agent_devices")
      .select("id, status")
      .eq("user_id", input.userId)
      .order("updated_at", { ascending: false })
      .limit(8);
    const online = (preferred ?? []).find((row) => row.status === "ONLINE");
    deviceId = online?.id ?? preferred?.[0]?.id;
    offline = !online;
  } else {
    const { data: device } = await admin
      .from("pc_local_agent_devices")
      .select("id, status, user_id")
      .eq("id", deviceId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (!device) {
      return {
        ok: false,
        taskId: null,
        deviceId: null,
        url,
        offline: false,
        error: "device_not_found",
        message: "지정한 PC 디바이스를 찾을 수 없습니다.",
      };
    }
    offline = device.status !== "ONLINE";
  }

  if (!deviceId) {
    return {
      ok: false,
      taskId: null,
      deviceId: null,
      url,
      offline: true,
      error: "device_offline",
      message: "페어링된 Local Agent 디바이스가 없습니다. PC에서 rimvio local-agent를 실행·페어링하세요.",
    };
  }

  const queued = await insertQueuedOpenUrlTask({
    userId: input.userId,
    deviceId,
    offline,
    payload: {
      url,
      title: harness.name,
      query: input.variables?.keyword,
      intent: "desktop",
    },
  });

  if ("error" in queued) {
    return {
      ok: false,
      taskId: null,
      deviceId,
      url,
      offline,
      error: queued.error,
      message: `큐 등록 실패: ${queued.error}`,
    };
  }

  return {
    ok: true,
    taskId: queued.task.id,
    deviceId,
    url,
    offline,
    error: null,
    message: offline
      ? `PC OFFLINE — task ${queued.task.id} queued (agent 온라인 시 재개). URL: ${url}`
      : `Local Agent에 OPEN_URL 디스패치됨 · task ${queued.task.id} · ${url}`,
  };
}

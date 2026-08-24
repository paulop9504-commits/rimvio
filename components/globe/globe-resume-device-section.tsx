"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import type { PcAgentDevice, PcAgentTask } from "@/lib/pc-local-agent";
import {
  isDesktopConnectNonce,
  PC_CONNECT_EVENT,
  PC_CONNECT_INSPECT_ID,
  PC_CONNECT_START_INSTALL_EVENT,
} from "@/lib/pc-local-agent/desktop-connect";
import {
  subscribePcAgentDevicesRealtime,
  subscribePcAgentTasksRealtime,
} from "@/lib/pc-local-agent/client-realtime";
import { bindPcPurchaseLiveWork } from "@/lib/globe/live-work/bind-pc-purchase-work";
import { readExecutionPhase } from "@/lib/pc-local-agent/execution-phase";
import { parsePcAgentPermissions } from "@/lib/pc-local-agent/pc-permissions";
import { cn } from "@/lib/utils";
import { PcConnectFlow } from "@/components/globe/pc-connect-flow";

function formatAgo(iso: string | null, nowMs: number): string {
  if (!iso) {
    return "—";
  }
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) {
    return "—";
  }
  const sec = Math.max(0, Math.round((nowMs - t) / 1000));
  if (sec < 5) {
    return "방금";
  }
  if (sec < 60) {
    return `${sec}초 전`;
  }
  const min = Math.round(sec / 60);
  return `${min}분 전`;
}

function activeTaskForDevice(tasks: PcAgentTask[], deviceId: string): PcAgentTask | null {
  return (
    tasks.find((task) => {
      if (task.device_id !== deviceId) {
        return false;
      }
      const phase = readExecutionPhase(task);
      return phase !== "COMPLETED" && phase !== "FAILED" && phase !== "CANCELLED";
    }) ?? null
  );
}

export function GlobeResumeDeviceSection({
  inspectDeviceId,
  onInspect,
  onBack,
}: {
  inspectDeviceId: string | null;
  onInspect: (id: string | null) => void;
  onBack: () => void;
}) {
  const copy = useCopy();
  const pc = copy.globe.pcContinuity;
  const { user } = useAuth();
  const [devices, setDevices] = useState<PcAgentDevice[]>([]);
  const [tasks, setTasks] = useState<PcAgentTask[]>([]);
  const [connectNonce, setConnectNonce] = useState<string | null>(null);
  const [installQuery, setInstallQuery] = useState<string | null>(null);
  const [permsOpen, setPermsOpen] = useState(false);
  const prevOnline = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const [dRes, tRes] = await Promise.all([
      fetch("/api/pc-agent/devices", { cache: "no-store" }),
      fetch("/api/pc-agent/tasks?limit=20", { cache: "no-store" }),
    ]);
    let nextDevices: PcAgentDevice[] = [];
    if (dRes.ok) {
      const data = (await dRes.json()) as { devices?: PcAgentDevice[] };
      nextDevices = data.devices ?? [];
      setDevices(nextDevices);
    }
    if (tRes.ok) {
      const data = (await tRes.json()) as { tasks?: PcAgentTask[] };
      const list = data.tasks ?? [];
      setTasks(list);
      for (const task of list) {
        const device = nextDevices.find((row) => row.id === task.device_id);
        bindPcPurchaseLiveWork({
          contextEventId: `shop:${task.id}`,
          task,
          deviceName: device?.name || pc.pcFallback,
        });
      }
    }
  }, [pc.pcFallback]);

  useEffect(() => {
    void refresh();
    if (!user?.id) {
      return;
    }
    const unsubD = subscribePcAgentDevicesRealtime(user.id, () => void refresh());
    const unsubT = subscribePcAgentTasksRealtime(user.id, () => void refresh());
    return () => {
      unsubD();
      unsubT();
    };
  }, [user?.id, refresh]);

  useEffect(() => {
    const stored = sessionStorage.getItem("rimvio-pc-connect-nonce")?.trim();
    if (stored) {
      sessionStorage.removeItem("rimvio-pc-connect-nonce");
      setConnectNonce(isDesktopConnectNonce(stored) ? stored : null);
      onInspect(PC_CONNECT_INSPECT_ID);
    }
    const onConnect = (event: Event) => {
      const nonce = (event as CustomEvent<{ nonce?: string }>).detail?.nonce?.trim();
      setConnectNonce(nonce && isDesktopConnectNonce(nonce) ? nonce : null);
      onInspect(PC_CONNECT_INSPECT_ID);
    };
    window.addEventListener(PC_CONNECT_EVENT, onConnect);
    const onInstall = (event: Event) => {
      const query =
        (event as CustomEvent<{ query?: string }>).detail?.query?.trim() ||
        sessionStorage.getItem("rimvio-pc-install-query")?.trim() ||
        "Rimvio PC 설치";
      setInstallQuery(query);
      onInspect(PC_CONNECT_INSPECT_ID);
    };
    window.addEventListener(PC_CONNECT_START_INSTALL_EVENT, onInstall);
    return () => {
      window.removeEventListener(PC_CONNECT_EVENT, onConnect);
      window.removeEventListener(PC_CONNECT_START_INSTALL_EVENT, onInstall);
    };
  }, [onInspect]);

  useEffect(() => {
    const onlineIds = new Set(
      devices.filter((row) => row.status === "ONLINE").map((row) => row.id),
    );
    const resumed = tasks.some((task) => {
      const wasOff = !prevOnline.current.has(task.device_id);
      return (
        wasOff &&
        onlineIds.has(task.device_id) &&
        readExecutionPhase(task) !== "PC_OFFLINE" &&
        (task.status === "QUEUED" || task.status === "RUNNING")
      );
    });
    if (resumed && prevOnline.current.size > 0) {
      toast.message(pc.resumeToast);
    }
    prevOnline.current = onlineIds;
  }, [devices, tasks, pc.resumeToast]);

  const now = Date.now();
  const connecting = inspectDeviceId === PC_CONNECT_INSPECT_ID;
  const inspect = devices.find((row) => row.id === inspectDeviceId) ?? null;

  if (connecting) {
    return (
      <PcConnectFlow
        nonce={connectNonce}
        installQuery={installQuery}
        onCancel={onBack}
        onDone={(id) => {
          void refresh();
          onInspect(id);
        }}
      />
    );
  }

  if (inspect) {
    const online = inspect.status === "ONLINE";
    const running = activeTaskForDevice(tasks, inspect.id);
    const perms = parsePcAgentPermissions(inspect.permissions);
    return (
      <div className="space-y-3 px-2" data-resume-device-inspect>
        <button type="button" onClick={onBack} className="text-[12px] text-white/50">
          {copy.globe.containerSpaceRuntimeBack}
        </button>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-[15px] font-semibold text-white">💻 {inspect.name}</p>
          <p className="mt-1 text-[12px] text-white/55">
            {online ? "●" : "○"} {online ? pc.online : pc.offline}
          </p>
          {running ? (
            <p className="mt-3 text-[13px] text-white/80">
              {pc.runningWithTitle(running.payload.title || pc.pcFallback)}
            </p>
          ) : (
            <p className="mt-3 text-[13px] text-white/80">{pc.runningCount(0)}</p>
          )}
          <p className="mt-3 text-[12px] text-white/50">{pc.lastHeartbeat}</p>
          <p className="text-[13px] text-white/80">{formatAgo(inspect.last_seen_at, now)}</p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="rounded-full bg-white/10 px-3 py-2 text-[13px] font-medium text-white"
              onClick={() => setPermsOpen((open) => !open)}
            >
              {pc.managePerms}
            </button>
            {permsOpen ? (
              <div className="rounded-xl bg-black/20 px-3 py-2 text-[12px] text-white/70" data-pc-perm-manage>
                <p>✓ {pc.permBrowser} {perms.browser ? "" : "○"}</p>
                <p>✓ {pc.permWeb}</p>
                <p>✓ {pc.permApps}</p>
                <p>✓ {pc.permStatus}</p>
                <p>✓ {pc.permScreen}</p>
                <p className="mt-2 text-white/45">{pc.permSensitive}</p>
              </div>
            ) : null}
            <button
              type="button"
              className="rounded-full bg-white/10 px-3 py-2 text-[13px] font-medium text-white"
              onClick={() => {
                void fetch(`/api/pc-agent/devices/${inspect.id}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "test" }),
                }).then(() => void refresh());
              }}
            >
              {pc.connectionTest}
            </button>
            <button
              type="button"
              className="rounded-full bg-white/10 px-3 py-2 text-[13px] font-medium text-white"
              onClick={() => {
                void fetch(`/api/pc-agent/devices/${inspect.id}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "revoke" }),
                }).then(() => {
                  onInspect(null);
                  void refresh();
                });
              }}
            >
              {pc.disconnect}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section data-globe-resume-devices>
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">
        {copy.globe.resumeSidebarDevices}
      </p>
      <div className="space-y-px">
        {devices.length === 0 ? (
          <button
            type="button"
            data-pc-connect-cta
            onClick={() => onInspect(PC_CONNECT_INSPECT_ID)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-white/85 hover:bg-white/[0.06]"
          >
            <span className="mt-0.5 size-2 shrink-0 rounded-full bg-white/25" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">💻 {pc.pcFallback}</span>
              <span className="text-[11px] text-white/45">{pc.notConnected}</span>
              <span className="mt-0.5 block text-[12px] font-medium text-white/80">
                {user ? pc.sameAccountHint : pc.connectCta}
              </span>
            </span>
          </button>
        ) : (
          devices.map((device) => {
            const running = activeTaskForDevice(tasks, device.id);
            const online = device.status === "ONLINE";
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => onInspect(device.id)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-white/85 hover:bg-white/[0.06]"
              >
                <span
                  className={cn(
                    "mt-0.5 size-2 shrink-0 rounded-full",
                    online ? "bg-emerald-400" : "bg-white/25",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">
                    💻 {device.name || pc.pcFallback}
                  </span>
                  <span className="text-[11px] text-white/45">
                    {online ? "●" : "○"} {online ? pc.online : pc.offline}
                  </span>
                  {running ? (
                    <span className="mt-0.5 block truncate text-[11px] text-white/55">
                      {pc.runningWithTitle(running.payload.title || pc.pcFallback)}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
        <div className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-white/85">
          <span className="mt-0.5 size-2 shrink-0 rounded-full bg-emerald-400" />
          <span>
            <span className="block text-[14px] font-medium">📱 {pc.phoneLabel}</span>
            <span className="text-[11px] text-white/45">● {pc.phoneConnected}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

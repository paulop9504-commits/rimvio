"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { subscribePcAgentTasksRealtime } from "@/lib/pc-local-agent/client-realtime";
import type { PcAgentTask } from "@/lib/pc-local-agent";
import { cn } from "@/lib/utils";

export function PcContinuityPreviewCard({
  taskId,
  title,
  deviceName,
  className,
}: {
  taskId: string;
  title: string;
  deviceName?: string | null;
  className?: string;
}) {
  const copy = useCopy();
  const pc = copy.globe.pcContinuity;
  const { user } = useAuth();
  const [task, setTask] = useState<PcAgentTask | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/pc-agent/tasks?limit=8", { cache: "no-store" });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { tasks?: PcAgentTask[] };
      setTask((data.tasks ?? []).find((row) => row.id === taskId) ?? null);
    } catch {
      setTask(null);
    }
  }, [taskId]);

  useEffect(() => {
    void refresh();
    if (!user?.id) {
      return;
    }
    return subscribePcAgentTasksRealtime(user.id, () => {
      void refresh();
    });
  }, [user?.id, refresh]);

  const status = task?.status ?? "QUEUED";
  const mark =
    status === "QUEUED" || status === "CREATED"
      ? pc.stepQueued
      : status === "RUNNING"
        ? pc.stepBrowserOpen
        : status === "WAITING"
          ? pc.stepWaiting
          : status === "COMPLETED"
            ? pc.stepReady
            : pc.stepFailed;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-white/[0.08] bg-rimvio-surface/95 px-3.5 py-3 text-left shadow-sm",
        className,
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{pc.eyebrow}</p>
      <p className="mt-0.5 text-[14px] font-semibold text-foreground">
        {task?.payload.title ?? title}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {deviceName?.trim() || pc.pcFallback}
      </p>
      <p className="mt-2 text-[13px] text-foreground">● {mark}</p>
      {status === "COMPLETED" ? (
        <p className="mt-1 text-[12px] text-emerald-600">✓ {pc.stepReady}</p>
      ) : null}
      {task?.error ? (
        <p className="mt-1 text-[12px] text-red-500">{task.error}</p>
      ) : null}
    </div>
  );
}

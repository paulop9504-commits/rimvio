"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { subscribePcAgentTasksRealtime } from "@/lib/pc-local-agent/client-realtime";
import type { PcAgentTask } from "@/lib/pc-local-agent";
import { bindPcPurchaseLiveWork } from "@/lib/globe/live-work/bind-pc-purchase-work";
import { patchLiveWork, readLiveWorkByContext } from "@/lib/globe/live-work/live-work-store";
import {
  readExecutionPhase,
  readTaskResult,
} from "@/lib/pc-local-agent/execution-phase";
import { cn } from "@/lib/utils";

function stepState(task: PcAgentTask | null): readonly [boolean, boolean, boolean, boolean] {
  const phase = task ? readExecutionPhase(task) : "QUEUED";
  const pc = phase !== "PC_OFFLINE";
  const site =
    phase === "BROWSER_OPENED" ||
    phase === "PAGE_READY" ||
    phase === "ACTION_RUNNING" ||
    phase === "WAITING_USER" ||
    phase === "APPROVED" ||
    phase === "VERIFYING" ||
    phase === "COMPLETED" ||
    phase === "HUMAN_REQUIRED";
  const product =
    phase === "ACTION_RUNNING" ||
    phase === "WAITING_USER" ||
    phase === "APPROVED" ||
    phase === "VERIFYING" ||
    phase === "COMPLETED";
  const pay = phase === "WAITING_USER" || phase === "APPROVED" || phase === "COMPLETED";
  return [pc, site, product, pay];
}

export function PcContinuityPreviewCard({
  taskId,
  title,
  deviceName,
  contextEventId,
  className,
}: {
  taskId: string;
  title: string;
  deviceName?: string | null;
  contextEventId?: string | null;
  className?: string;
}) {
  const copy = useCopy();
  const pc = copy.globe.pcContinuity;
  const { user } = useAuth();
  const [task, setTask] = useState<PcAgentTask | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/pc-agent/tasks/${encodeURIComponent(taskId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { task?: PcAgentTask };
      const next = data.task ?? null;
      setTask(next);
      if (next && contextEventId?.trim()) {
        bindPcPurchaseLiveWork({
          contextEventId: contextEventId.trim(),
          task: next,
          deviceName: deviceName?.trim() || pc.pcFallback,
        });
      }
    } catch {
      setTask(null);
    }
  }, [taskId, contextEventId, deviceName, pc.pcFallback]);

  useEffect(() => {
    void refresh();
    if (!user?.id) {
      return;
    }
    const unsub = subscribePcAgentTasksRealtime(user.id, () => {
      void refresh();
    });
    return unsub;
  }, [user?.id, refresh]);

  const phaseForPoll = task ? readExecutionPhase(task) : "QUEUED";
  const stillLive =
    phaseForPoll !== "COMPLETED" &&
    phaseForPoll !== "FAILED" &&
    phaseForPoll !== "CANCELLED";

  useEffect(() => {
    if (!stillLive) {
      return;
    }
    const id = window.setInterval(() => {
      void refresh();
    }, 1_400);
    return () => window.clearInterval(id);
  }, [stillLive, refresh]);

  const phase = task ? readExecutionPhase(task) : "QUEUED";
  const result = readTaskResult(task?.result ?? null);
  const [pcOk, siteOk, productOk, payWait] = stepState(task);
  const payDone = phase === "COMPLETED";
  const mark =
    phase === "PC_OFFLINE"
      ? copy.globe.liveWorkWaitingPc
      : phase === "WAITING_USER"
        ? copy.globe.liveWorkWaitingUser
        : phase === "HUMAN_REQUIRED" || phase === "AUTH_REQUIRED"
          ? copy.globe.liveWorkHumanRequired
          : phase === "APPROVED"
            ? copy.globe.liveWorkApproved
            : phase === "COMPLETED"
              ? pc.stepReady
              : phase === "FAILED" || phase === "CANCELLED"
                ? pc.stepFailed
                : copy.globe.liveWorkRunning;

  const canApprove = phase === "WAITING_USER";
  const active =
    phase !== "COMPLETED" && phase !== "FAILED" && phase !== "CANCELLED";

  const onApprove = async () => {
    setBusy(true);
    try {
      await fetch(`/api/pc-agent/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const work = contextEventId ? readLiveWorkByContext(contextEventId) : null;
      if (work) {
        patchLiveWork(work.id, {
          phase: "running",
          statusLine: copy.globe.liveWorkApproved,
        });
      }
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  const onStop = async () => {
    setBusy(true);
    try {
      await fetch(`/api/pc-agent/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const work = contextEventId ? readLiveWorkByContext(contextEventId) : null;
      if (work) {
        patchLiveWork(work.id, {
          phase: "stopped",
          statusLine: copy.globe.liveWorkStopped,
        });
      }
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  const Step = ({
    done,
    current,
    label,
  }: {
    done: boolean;
    current?: boolean;
    label: string;
  }) => (
    <p className={cn("text-[13px] text-foreground", current && !done && "text-emerald-300")}>
      {done ? "✓" : current ? "◉" : "○"} {label}
    </p>
  );

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-white/[0.08] bg-rimvio-surface/95 px-3.5 py-3 text-left shadow-sm",
        className,
      )}
      data-live-work-object
      data-pc-live-run
    >
      <p className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        {active ? (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            {copy.globe.liveWorkLive}
          </span>
        ) : (
          pc.eyebrow
        )}
      </p>
      <p className="mt-0.5 text-[14px] font-semibold text-foreground">
        {task?.payload.title ?? title}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        💻 {deviceName?.trim() || pc.pcFallback}
      </p>
      <p className="sr-only" data-task-phase={phase}>
        {phase}
      </p>
      {result.product?.title ? (
        <p className="mt-2 text-[13px] text-foreground">
          {result.product.title}
          {result.product.price ? ` · ${result.product.price}` : ""}
        </p>
      ) : null}
      {result.product?.delivery ? (
        <p className="text-[12px] text-muted-foreground">
          배송 예정: {result.product.delivery}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {copy.globe.liveWorkPlan}
      </p>
      <div className="mt-1 space-y-0.5">
        <Step done={pcOk} current={phase === "QUEUED" || phase === "DISPATCHED" || phase === "RUNNING"} label={copy.globe.liveWorkStepPc} />
        <Step done={siteOk} current={phase === "BROWSER_OPENED" || phase === "PAGE_READY"} label={copy.globe.liveWorkStepSite} />
        <Step
          done={productOk}
          current={phase === "ACTION_RUNNING"}
          label={copy.globe.liveWorkStepProduct}
        />
        <Step
          done={payDone}
          current={payWait && !payDone}
          label={copy.globe.liveWorkStepPay}
        />
      </div>
      <p className="mt-2 text-[13px] text-foreground">● {mark}</p>
      {phase === "WAITING_USER" ? (
        <p className="mt-2 text-[13px] font-medium text-amber-200">{pc.payWarning}</p>
      ) : null}
      {result.screenshotJpeg ? (
        <img
          alt=""
          className="mt-2 w-full rounded-xl border border-white/10 shadow-sm"
          src={`data:image/jpeg;base64,${result.screenshotJpeg}`}
          data-pc-live-screen
        />
      ) : active ? (
        <p className="mt-2 text-[12px] text-muted-foreground">{copy.globe.liveWorkViewPcScreen}…</p>
      ) : null}
      {task?.error ? (
        <p className="mt-1 text-[12px] text-red-500">{task.error}</p>
      ) : null}
      {active ? (
        <div className="mt-3 flex gap-2">
          {canApprove ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onApprove()}
              className="flex-1 rounded-full bg-foreground px-3 py-2 text-[13px] font-semibold text-background"
            >
              {copy.globe.liveWorkApprovePurchase}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onStop()}
            className="flex-1 rounded-full bg-black/[0.06] px-3 py-2 text-[13px] font-semibold text-foreground"
          >
            {copy.globe.liveWorkStop}
          </button>
        </div>
      ) : null}
    </div>
  );
}

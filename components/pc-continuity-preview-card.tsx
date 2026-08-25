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
    <p className={cn("text-[13px] text-[#3a3a3c]", current && !done && "text-[#0a84ff]")}>
      {done ? "✓" : current ? "●" : "○"} {label}
    </p>
  );

  const shot = result.screenshotJpeg;

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-[16px] border border-black/[0.08] bg-white text-left shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]",
        className,
      )}
      data-live-work-object
      data-pc-live-run
    >
      <div className="flex items-center gap-2 border-b border-black/[0.06] px-3.5 py-2.5">
        <span className="text-[13px] font-semibold tracking-tight text-[#1c1c1e]">
          {task?.payload.title ?? title}
        </span>
        {active ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-[#34c759]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#34c759]" />
            {copy.globe.liveWorkLive}
          </span>
        ) : (
          <span className="ml-auto text-[11px] text-[#8e8e93]">{pc.eyebrow}</span>
        )}
      </div>
      <div className="px-3.5 py-3">
        <p className="text-[12.5px] text-[#8e8e93]">{deviceName?.trim() || pc.pcFallback}</p>
        <p className="sr-only" data-task-phase={phase}>
          {phase}
        </p>
        {result.product?.title ? (
          <p className="mt-2 text-[13.5px] tracking-tight text-[#1c1c1e]">
            {result.product.title}
            {result.product.price ? ` · ${result.product.price}` : ""}
          </p>
        ) : null}
        {result.product?.delivery ? (
          <p className="text-[12px] text-[#8e8e93]">배송 예정: {result.product.delivery}</p>
        ) : null}
        <p className="mt-2 text-[11px] font-medium text-[#8e8e93]">{copy.globe.liveWorkPlan}</p>
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
        <p className="mt-2 text-[13px] text-[#2c2c2e]">{mark}</p>
        {phase === "WAITING_USER" ? (
          <p className="mt-2 text-[13px] font-medium text-[#b45309]">{pc.payWarning}</p>
        ) : null}
        {shot ? (
          <img
            alt=""
            className="mt-3 w-full rounded-[12px] border border-black/[0.06] object-cover shadow-sm"
            src={`data:image/jpeg;base64,${shot}`}
            data-pc-live-screen
          />
        ) : active ? (
          <p className="mt-2 text-[12px] text-[#8e8e93]">{copy.globe.liveWorkViewPcScreen}…</p>
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
                className="flex-1 rounded-full bg-[#111] px-3 py-2 text-[13px] font-semibold text-white"
              >
                {copy.globe.liveWorkApprovePurchase}
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void onStop()}
              className="flex-1 rounded-full bg-black/[0.05] px-3 py-2 text-[13px] font-semibold text-[#1c1c1e]"
            >
              {copy.globe.liveWorkStop}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

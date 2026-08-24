"use client";

import { FileText, Monitor, Play, Puzzle } from "lucide-react";
import { toast } from "sonner";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { useCopy } from "@/hooks/use-copy";
import { useAuth } from "@/hooks/use-auth";
import { usePcLocalAgent } from "@/hooks/use-pc-local-agent";
import { TASK_STATUS_ORDER } from "@/lib/pc-local-agent/task-state-machine";
import type { PcAgentTaskStatus } from "@/lib/pc-local-agent";
import type { EnrichedCapabilityRequest } from "@/hooks/use-pc-local-agent";
import type { PcAgentTask } from "@/lib/pc-local-agent";
import { cn } from "@/lib/utils";

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        online ? "bg-emerald-400" : "bg-white/30",
      )}
      aria-hidden
    />
  );
}

function taskStepIcon(status: PcAgentTaskStatus, step: PcAgentTaskStatus): string {
  const order = TASK_STATUS_ORDER;
  const normalized =
    status === "FAILED" ? "RUNNING" : status === "CANCELLED" ? "WAITING_USER" : status;
  const statusIdx = order.indexOf(normalized);
  const stepIdx = order.indexOf(step);
  if (status === "FAILED" && step === "RUNNING") {
    return "✕";
  }
  if (status === "CANCELLED" && step === "WAITING_USER") {
    return "✕";
  }
  if (statusIdx > stepIdx) {
    return "✓";
  }
  if (statusIdx === stepIdx) {
    return "●";
  }
  return "○";
}

function TaskProgress({ task }: { task: PcAgentTask }) {
  const status = task.status;
  const steps: { key: PcAgentTaskStatus; label: string }[] = [
    { key: "QUEUED", label: "Queued" },
    { key: "RUNNING", label: "Running" },
    { key: "WAITING_USER", label: "Waiting for approval" },
    { key: "COMPLETED", label: status === "FAILED" ? "Failed" : "Completed" },
  ];

  const visibleSteps =
    status === "WAITING" || status === "WAITING_USER" || status === "CANCELLED"
      ? steps
      : steps.filter((s) => s.key !== "WAITING_USER");

  return (
    <div className="mt-3 space-y-1 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
      <p className="text-[12px] font-medium text-muted-foreground">Agent Task · OPEN_URL</p>
      {visibleSteps.map((step) => (
        <p key={step.key} className="text-[13px] text-foreground">
          {taskStepIcon(status, step.key)} {step.label}
        </p>
      ))}
      { (status === "WAITING" || status === "WAITING_USER") && task.waiting_expires_at ? (
        <p className="pt-1 text-[11px] text-muted-foreground">
          승인 만료: {new Date(task.waiting_expires_at).toLocaleTimeString()}
        </p>
      ) : null}
    </div>
  );
}

function InstallJobProgress({
  jobs,
}: {
  jobs: { id: string; capabilityName?: string; capability_id: string; progress_pct: number; status: string }[];
}) {
  if (jobs.length === 0) {
    return null;
  }
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-3 py-3">
      <p className="text-[12px] font-medium text-blue-200">기능 설치 중</p>
      {jobs.map((job) => (
        <div key={job.id}>
          <div className="flex justify-between text-[12px] text-foreground">
            <span>{job.capabilityName ?? job.capability_id}</span>
            <span>{job.progress_pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-blue-400 transition-all duration-300"
              style={{ width: `${job.progress_pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function InstalledCapabilitiesList({
  items,
}: {
  items: {
    capability_id: string;
    name: string;
    version: string;
    catalogVersion: string;
    updateAvailable: boolean;
  }[];
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2 border-t border-white/[0.05] pt-3">
      <p className="text-[12px] font-medium text-muted-foreground">설치된 기능</p>
      {items.map((cap) => (
        <div
          key={cap.capability_id}
          className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-[13px]"
        >
          <span className="font-medium">{cap.name}</span>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>v{cap.version}</span>
            {cap.updateAvailable ? (
              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                업데이트 v{cap.catalogVersion}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function CapabilityApprovalCard({
  request,
  loading,
  onApprove,
  onCancel,
}: {
  request: EnrichedCapabilityRequest;
  loading: boolean;
  onApprove: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-4">
      <div className="flex items-start gap-2">
        <Puzzle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-foreground">새로운 Agent 기능 필요</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            작업을 계속하려면 아래 기능 설치가 필요합니다. 승인 후 PC Agent가 자동으로 설치하고
            작업을 재개합니다.
          </p>
          <ul className="mt-3 space-y-1.5">
            {request.capabilities.map((cap) => (
              <li key={cap.id} className="text-[13px] text-foreground">
                ✓ {cap.name}
                <span className="ml-1 text-muted-foreground">— {cap.description}</span>
              </li>
            ))}
          </ul>
          {request.capabilities.some((c) => c.permissions.length > 0) ? (
            <div className="mt-3 rounded-xl bg-black/20 px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground">권한</p>
              <ul className="mt-1 space-y-0.5">
                {request.capabilities.flatMap((c) => c.permissions).map((perm) => (
                  <li key={perm} className="text-[12px] text-foreground">
                    • {perm}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onApprove}
              className="rounded-xl bg-foreground px-4 py-2 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              설치 및 허용
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="rounded-xl border border-white/10 px-4 py-2 text-[13px] font-medium text-foreground hover:bg-white/[0.06] disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PcLocalAgentPanel() {
  const copy = useCopy();
  const pc = copy.globe.pcContinuity;
  const { user } = useAuth();
  const {
    devices,
    onlineDevice,
    loading,
    activeTask,
    pendingRequests,
    installedCapabilities,
    activeInstallJobs,
    runTestTask,
    runCapabilityTestTask,
    runPdfCapabilityTestTask,
    approveCapabilityRequest,
    cancelCapabilityRequest,
  } = usePcLocalAgent();

  if (!user) {
    return null;
  }

  const handleTest = async () => {
    if (!onlineDevice) {
      toast.error("온라인 PC Agent가 없습니다");
      return;
    }
    try {
      await runTestTask(onlineDevice.id);
      toast.success("테스트 작업을 전송했습니다");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "작업 전송 실패");
    }
  };

  const handleCapabilityTest = async () => {
    if (!onlineDevice) {
      toast.error("온라인 PC Agent가 없습니다");
      return;
    }
    try {
      await runCapabilityTestTask(onlineDevice.id);
      toast.success("Capability 테스트 작업을 전송했습니다");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "작업 전송 실패");
    }
  };

  const handlePdfCapabilityTest = async () => {
    if (!onlineDevice) {
      toast.error("온라인 PC Agent가 없습니다");
      return;
    }
    try {
      await runPdfCapabilityTestTask(onlineDevice.id);
      toast.success("PDF Capability 테스트 작업을 전송했습니다");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "작업 전송 실패");
    }
  };

  return (
    <SettingsSection title={pc.settingsTitle} description={pc.settingsHint}>
      <SettingsRow label={pc.pcFallback} hint={onlineDevice ? pc.online : pc.offline}>
        <div className="flex items-center gap-2 text-[13px] text-foreground">
          <StatusDot online={Boolean(onlineDevice)} />
          {onlineDevice ? pc.connected : pc.offline}
        </div>
      </SettingsRow>

      {devices.length > 0 ? (
        <div className="space-y-2 border-t border-white/[0.05] pt-3">
          <p className="text-[12px] font-medium text-muted-foreground">연결된 PC</p>
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-[13px]"
            >
              <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{device.name}</span>
              <StatusDot online={device.status === "ONLINE"} />
              <span className="text-muted-foreground">
                {device.status === "ONLINE" ? "Online" : "Offline"}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {pendingRequests.map((request) => (
        <CapabilityApprovalCard
          key={request.id}
          request={request}
          loading={loading}
          onApprove={() => {
            void approveCapabilityRequest(request.id)
              .then(() => toast.success("설치를 시작합니다"))
              .catch(() => toast.error("승인 실패"));
          }}
          onCancel={() => {
            void cancelCapabilityRequest(request.id)
              .then(() => toast.success("요청을 취소했습니다"))
              .catch(() => toast.error("취소 실패"));
          }}
        />
      ))}

      <InstalledCapabilitiesList items={installedCapabilities} />

      {activeInstallJobs.length > 0 ? (
        <InstallJobProgress jobs={activeInstallJobs} />
      ) : null}

      <div className="mt-3 space-y-2 border-t border-white/[0.05] pt-3">
        <button
          type="button"
          disabled={loading || !onlineDevice}
          onClick={() => void handleTest()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-[14px] font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="h-4 w-4" />
          테스트 실행
        </button>
        <button
          type="button"
          disabled={loading || !onlineDevice}
          onClick={() => void handleCapabilityTest()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[14px] font-semibold text-foreground hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Puzzle className="h-4 w-4" />
          Capability 테스트 (승인 → 설치 → 재개)
        </button>
        <button
          type="button"
          disabled={loading || !onlineDevice}
          onClick={() => void handlePdfCapabilityTest()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[14px] font-semibold text-foreground hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FileText className="h-4 w-4" />
          PDF Reader 설치 테스트 (npm)
        </button>
        {!onlineDevice ? (
          <p className="text-center text-[11px] text-muted-foreground">
            {pc.settingsHint}
          </p>
        ) : null}
      </div>

      {activeTask ? <TaskProgress task={activeTask} /> : null}
    </SettingsSection>
  );
}

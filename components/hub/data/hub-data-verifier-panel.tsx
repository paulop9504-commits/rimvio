"use client";

import { useMemo } from "react";
import {
  REALITY_TASK_TYPE_META,
  type ContributorProfile,
  type RealityTask,
  type VerifierResponse,
} from "@/lib/reality-data-network";
import { cn } from "@/lib/utils";
import { HubContributorWalletPanel } from "@/components/hub/wallet/hub-contributor-wallet-panel";
import type { ContributorWalletSnapshot } from "@/lib/hub/wallet/fetch-contributor-wallet";
import type { DataVerifierPane } from "@/lib/hub/data/data-workspace-nav";
import { HubDataDemoBadge } from "@/components/hub/data/hub-data-shell";
import { HubContextualGuide } from "@/components/hub/standards/hub-contextual-guide";

const DEMO_VERIFIER_ID = "verifier-demo";

type HubDataVerifierPanelProps = {
  readonly pane: DataVerifierPane;
  readonly profile: ContributorProfile | null;
  readonly tasks: readonly RealityTask[];
  readonly responses: readonly VerifierResponse[];
  readonly wallet: ContributorWalletSnapshot | null;
  readonly walletLoading?: boolean;
  readonly onApply: () => void;
  readonly onReview: (taskId: string, answerId: string, answerLabelKo: string) => void;
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-[11px] font-medium text-[#64748b]">{label}</p>
      <p className="mt-1 text-[22px] font-bold text-[#0f172a]">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-[#94a3b8]">{sub}</p> : null}
    </div>
  );
}

export function HubDataVerifierPanel({
  pane,
  profile,
  tasks,
  responses,
  wallet,
  walletLoading,
  onApply,
  onReview,
}: HubDataVerifierPanelProps) {
  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === "open" || t.status === "in_review"),
    [tasks],
  );
  const myResponses = useMemo(
    () => responses.filter((r) => r.verifierId === DEMO_VERIFIER_ID),
    [responses],
  );

  if (pane === "overview") {
    const approved = profile?.verifierApproved ?? false;
    return (
      <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase text-[#64748b]">Verifier</p>
          <HubDataDemoBadge />
        </div>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">지원자 · 검수 대시보드</h2>
        <p className="mt-1 text-[12px] text-[#64748b]">
          Task Pool에서 consensus 검수에 참여하고 Quality multiplier로 수익을 올립니다.
        </p>

        {!approved ? (
          <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-5">
            <h3 className="text-[14px] font-semibold text-violet-900">검수자 지원</h3>
            <p className="mt-2 text-[12px] text-violet-800">
              간단한 onboarding 후 Task Pool 작업을 시작할 수 있습니다 (Dev sandbox).
            </p>
            <button
              type="button"
              onClick={onApply}
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-violet-700"
            >
              지원하기
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Open Tasks" value={String(openTasks.length)} />
            <StatCard
              label="정확도"
              value={`${profile?.accuracyPct ?? 100}%`}
              sub={`Quality ×${profile?.qualityMultiplier ?? 1}`}
            />
            <StatCard
              label="누적 수익"
              value={`₩${(wallet?.totalCombinedKrw ?? profile?.totalEarnedKrw ?? 0).toLocaleString()}`}
            />
          </div>
        )}
      </div>
    );
  }

  if (pane === "task_pool") {
    return (
      <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#64748b]">Task Pool</p>
            <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">검수 작업</h2>
            <div className="mt-4 space-y-4">
          {openTasks.length === 0 ? (
            <p className="text-[12px] text-[#94a3b8]">열린 Task 없음</p>
          ) : (
            openTasks.map((task) => {
              const already = responses.some(
                (r) => r.taskId === task.taskId && r.verifierId === DEMO_VERIFIER_ID,
              );
              const taskResponses = responses.filter((r) => r.taskId === task.taskId);
              return (
                <article
                  key={task.taskId}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[10px] text-[#94a3b8]">{task.taskId}</p>
                      <h3 className="mt-1 text-[15px] font-semibold text-[#0f172a]">
                        {task.targetLabelKo}
                      </h3>
                      <p className="mt-1 text-[12px] text-[#64748b]">
                        {REALITY_TASK_TYPE_META[task.taskType].labelKo} · ₩{task.baseRewardKrw} ·
                        검수 {taskResponses.length}/{task.requiredVerifiers}
                      </p>
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </div>

                  {task.aiPreLabel ? (
                    <div className="mt-4 rounded-lg bg-[#f8fafc] p-3">
                      <p className="text-[10px] font-semibold uppercase text-[#64748b]">
                        AI Pre-label
                      </p>
                      <pre className="mt-2 text-[11px] text-[#475569]">
                        {JSON.stringify(task.aiPreLabel, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  <p className="mt-3 text-[12px] font-medium text-[#334155]">
                    {task.titleKo} — 사진이 실제 호텔 객실 사진인가?
                  </p>

                  {already ? (
                    <p className="mt-3 text-[12px] font-medium text-emerald-700">제출 완료</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onReview(task.taskId, opt.id, opt.labelKo)}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] font-medium text-[#334155] hover:border-violet-300 hover:bg-violet-50"
                        >
                          {opt.labelKo}
                        </button>
                      ))}
                    </div>
                  )}

                  {task.consensusConfidence != null ? (
                    <p className="mt-3 text-[11px] text-emerald-700">
                      Consensus {task.consensusVerdict} · confidence {task.consensusConfidence}
                    </p>
                  ) : null}
                </article>
              );
            })
          )}
            </div>
          </div>
          <HubContextualGuide mode="reviewer" showScores defaultExpanded />
        </div>
      </div>
    );
  }

  if (pane === "reviews") {
    return (
      <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <p className="text-[10px] font-semibold uppercase text-[#64748b]">Reviews</p>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">내 검수 기록</h2>
        <div className="mt-4 space-y-2">
          {myResponses.length === 0 ? (
            <p className="text-[12px] text-[#94a3b8]">아직 검수 없음</p>
          ) : (
            myResponses.map((r) => (
              <div
                key={r.responseId}
                className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-4 py-3"
              >
                <div>
                  <p className="font-mono text-[11px] text-[#64748b]">{r.taskId}</p>
                  <p className="text-[13px] font-medium text-[#0f172a]">{r.answerLabelKo}</p>
                </div>
                <p className="text-[10px] text-[#94a3b8]">
                  {(r.latencyMs / 1000).toFixed(1)}s
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (pane === "profile") {
    const tier = profile?.reliabilityTier ?? "new";
    return (
      <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <p className="text-[10px] font-semibold uppercase text-[#64748b]">Profile</p>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">검수자 프로필</h2>
        <div className="mt-6 max-w-md space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
          <Row label="이름" value={profile?.displayName ?? "—"} />
          <Row label="Reliability" value={tier} />
          <Row label="정확도" value={`${profile?.accuracyPct ?? 100}%`} />
          <Row label="Quality multiplier" value={`×${profile?.qualityMultiplier ?? 1}`} />
          <Row label="완료 Task" value={String(profile?.tasksCompleted ?? 0)} />
          <Row
            label="승인"
            value={profile?.verifierApproved ? "Approved" : "Pending"}
          />
        </div>
        <p className="mt-4 text-[11px] text-[#64748b]">
          정확도 99%+ → multiplier 1.5x · 72% → 0.5x (Contributor Ledger rollup).
        </p>
      </div>
    );
  }

  if (pane === "earnings") {
    return (
      <HubContributorWalletPanel
        roleLabel="검수자"
        wallet={wallet}
        loading={walletLoading}
      />
    );
  }

  return null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-[#64748b]">{label}</span>
      <span className="font-medium text-[#0f172a]">{value}</span>
    </div>
  );
}

function TaskStatusBadge({ status }: { status: RealityTask["status"] }) {
  const colors: Record<RealityTask["status"], string> = {
    open: "bg-emerald-50 text-emerald-800",
    in_review: "bg-violet-50 text-violet-800",
    consensus: "bg-blue-50 text-blue-800",
    resolved: "bg-[#f1f5f9] text-[#475569]",
    disputed: "bg-red-50 text-red-800",
  };
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", colors[status])}>
      {status}
    </span>
  );
}

"use client";

import { useMemo } from "react";
import {
  REALITY_TASK_TYPE_META,
  type ContributorProfile,
  type DataSubmission,
  type RealityTask,
} from "@/lib/reality-data-network";
import { cn } from "@/lib/utils";
import type { DataSupplierPane } from "@/lib/hub/data/data-workspace-nav";
import { HubDataDemoBadge } from "@/components/hub/data/hub-data-shell";

const DEMO_SUPPLIER_ID = "supplier-demo";

type HubDataSupplierPanelProps = {
  readonly pane: DataSupplierPane;
  readonly profile: ContributorProfile | null;
  readonly tasks: readonly RealityTask[];
  readonly submissions: readonly DataSubmission[];
  readonly onSubmit: (input: {
    titleKo: string;
    targetLabelKo: string;
    taskType: keyof typeof REALITY_TASK_TYPE_META;
  }) => void;
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

export function HubDataSupplierPanel({
  pane,
  profile,
  tasks,
  submissions,
  onSubmit,
}: HubDataSupplierPanelProps) {
  const mySubs = useMemo(
    () => submissions.filter((s) => s.supplierId === DEMO_SUPPLIER_ID),
    [submissions],
  );
  const myTasks = useMemo(
    () => tasks.filter((t) => t.supplierId === DEMO_SUPPLIER_ID),
    [tasks],
  );

  if (pane === "overview") {
    return (
      <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase text-[#64748b]">Supplier</p>
          <HubDataDemoBadge />
        </div>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">공급자 대시보드</h2>
        <p className="mt-1 text-[12px] text-[#64748b]">
          현장 데이터를 제출하면 AI가 pre-label하고 검수자 Task Pool로 전달됩니다.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="제출"
            value={String(mySubs.length)}
            sub="누적 submission"
          />
          <StatCard
            label="검수 중"
            value={String(myTasks.filter((t) => t.status === "in_review" || t.status === "open").length)}
          />
          <StatCard
            label="누적 수익"
            value={`₩${(profile?.totalEarnedKrw ?? 0).toLocaleString()}`}
            sub="제출 보상 + 승격 보너스"
          />
        </div>

        <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="text-[13px] font-semibold text-[#334155]">Epistemic 승격</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {(["observed", "suggested", "inferred", "confirmed"] as const).map((level, i) => (
              <span key={level} className="flex items-center gap-1">
                {i > 0 ? <span className="text-[#CBD5E1]">→</span> : null}
                <span
                  className={cn(
                    "rounded-lg px-2 py-1 font-medium",
                    level === "confirmed"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-[#f1f5f9] text-[#475569]",
                  )}
                >
                  {level}
                </span>
              </span>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (pane === "submit") {
    return (
      <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <p className="text-[10px] font-semibold uppercase text-[#64748b]">Submit</p>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">현실 데이터 제출</h2>
        <p className="mt-1 text-[12px] text-[#64748b]">
          사진 · 객실 정보를 제출하면 Task가 생성되고 검수자에게 배포됩니다.
        </p>

        <form
          className="mt-6 max-w-lg space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onSubmit({
              titleKo: String(fd.get("title") ?? ""),
              targetLabelKo: String(fd.get("target") ?? ""),
              taskType: String(fd.get("taskType") ?? "photo_authenticity") as keyof typeof REALITY_TASK_TYPE_META,
            });
            e.currentTarget.reset();
          }}
        >
          <label className="block">
            <span className="text-[12px] font-medium text-[#334155]">제목</span>
            <input
              name="title"
              required
              placeholder="오사카 ○○호텔 디럭스 더블룸"
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-[#334155]">대상 (호텔 · 객실)</span>
            <input
              name="target"
              required
              placeholder="오사카 난바 · Deluxe Double"
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-[#334155]">Task 유형</span>
            <select
              name="taskType"
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
            >
              {Object.entries(REALITY_TASK_TYPE_META).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.labelKo} · ₩{meta.baseRewardKrw}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-[#94a3b8]">
            AI pre-label: 침대 · 창문 · 욕조 · 전망 속성이 자동 추출됩니다 (Dev mock).
          </p>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-[13px] font-semibold text-white hover:bg-emerald-700"
          >
            Task Pool에 제출
          </button>
        </form>
      </div>
    );
  }

  if (pane === "submissions") {
    return (
      <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <p className="text-[10px] font-semibold uppercase text-[#64748b]">Submissions</p>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">내 제출</h2>
        <div className="mt-4 space-y-2">
          {mySubs.length === 0 ? (
            <p className="text-[12px] text-[#94a3b8]">아직 제출 없음</p>
          ) : (
            mySubs.map((s) => (
              <div
                key={s.submissionId}
                className="rounded-xl border border-[#E2E8F0] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-medium text-[#0f172a]">{s.titleKo}</p>
                    <p className="mt-1 text-[11px] text-[#64748b]">
                      {REALITY_TASK_TYPE_META[s.taskType].labelKo} · {s.taskId}
                    </p>
                  </div>
                  <StatusChip status={s.status} epistemic={s.epistemic} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Earnings</p>
      <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">공급자 수익</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="누적" value={`₩${(profile?.totalEarnedKrw ?? 0).toLocaleString()}`} />
        <StatCard label="제출 건수" value={String(profile?.tasksCompleted ?? 0)} />
      </div>
      <p className="mt-4 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-[11px] text-[#64748b]">
        Base Reward × Quality × Difficulty · Verified 승격 시 추가 보너스 (Payout Engine Phase 2).
      </p>
    </div>
  );
}

function StatusChip({
  status,
  epistemic,
}: {
  status: DataSubmission["status"];
  epistemic: DataSubmission["epistemic"];
}) {
  const colors: Record<DataSubmission["status"], string> = {
    pending: "bg-amber-50 text-amber-800",
    in_review: "bg-violet-50 text-violet-800",
    verified: "bg-emerald-50 text-emerald-800",
    rejected: "bg-red-50 text-red-800",
    disputed: "bg-orange-50 text-orange-800",
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", colors[status])}>
        {status}
      </span>
      <span className="text-[10px] text-[#94a3b8]">{epistemic}</span>
    </div>
  );
}

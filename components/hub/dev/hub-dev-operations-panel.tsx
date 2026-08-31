"use client";

import { useMemo } from "react";
import { buildCreatorOpsView } from "@/lib/hub/dev/creator-ops-model";
import type { PlatformDraft } from "@/lib/hub/platform/types";

type HubDevOperationsPanelProps = {
  draft: PlatformDraft;
};

export function HubDevOperationsPanel({ draft }: HubDevOperationsPanelProps) {
  const view = useMemo(() => buildCreatorOpsView(draft), [draft]);

  const tasks = [
    { id: "1", label: "Confirm pending booking #4821", priority: "high" },
    { id: "2", label: "Review refund request — Room 304", priority: "medium" },
    { id: "3", label: "Update weekend rates (Dynamic Pricing)", priority: "low" },
  ];

  return (
    <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Operations</p>
      <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">{view.platformName} — Day-to-day</h2>
      <p className="mt-1 text-[12px] text-[#64748b]">
        Creator/Team이 직접 운영하는 작업 큐 · Demo
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="text-[13px] font-semibold text-[#334155]">Today&apos;s queue</h3>
          <ul className="mt-3 space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-[#F1F5F9] px-3 py-2 text-[12px]"
              >
                <span className="text-[#334155]">{t.label}</span>
                <span
                  className={
                    t.priority === "high"
                      ? "text-red-600"
                      : t.priority === "medium"
                        ? "text-amber-600"
                        : "text-[#94a3b8]"
                  }
                >
                  {t.priority}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="text-[13px] font-semibold text-[#334155]">Supplier status</h3>
          <ul className="mt-3 space-y-2 text-[12px]">
            {view.suppliers.length === 0 ? (
              <li className="text-[#94a3b8]">No suppliers configured — add in Integrations</li>
            ) : (
              view.suppliers.map((s) => (
                <li key={s.id} className="flex justify-between text-[#475569]">
                  <span>{s.name}</span>
                  <span
                    className={
                      s.status === "connected"
                        ? "text-emerald-600"
                        : s.status === "pending"
                          ? "text-amber-600"
                          : "text-[#94a3b8]"
                    }
                  >
                    {s.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <p className="mt-6 text-[11px] text-[#94a3b8]">
        Rimvio는 운영 큐를 대신 처리하지 않습니다. Creator가 Admin Console에서 예약·환불·가격을 관리합니다.
      </p>
    </div>
  );
}

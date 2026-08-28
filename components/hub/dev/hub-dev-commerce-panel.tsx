"use client";

import { useMemo } from "react";
import { buildCommercePanelView } from "@/lib/hub/dev/commerce-view";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevCommercePanelProps = {
  draft: PlatformDraft;
};

export function HubDevCommercePanel({ draft }: HubDevCommercePanelProps) {
  const view = useMemo(() => buildCommercePanelView(draft), [draft]);

  return (
    <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Commerce</p>
      <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">Payment Infrastructure</h2>
      <p className="mt-1 text-[12px] text-[#64748b]">
        Platform configuration — not live transaction data.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="text-[13px] font-semibold text-[#334155]">Provider</h3>
          <p className="mt-2 text-[14px] font-medium text-[#0f172a]">{view.provider}</p>
          <p className="mt-2 text-[12px] text-[#64748b]">{view.notes}</p>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="text-[13px] font-semibold text-[#334155]">Data (PII collections)</h3>
          <ul className="mt-2 space-y-1 text-[12px]">
            {view.collections.length === 0 ? (
              <li className="text-[#94a3b8]">No payment/booking collections declared</li>
            ) : (
              view.collections.map((c) => (
                <li key={c.id} className="font-mono text-[#475569]">
                  {c.name} · {c.schema}
                  {c.pii ? <span className="text-amber-600"> · PII</span> : null}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-[#334155]">Payment flow</h3>
        <div className="mt-4 flex flex-col items-start gap-2">
          {view.paymentFlow.length === 0 ? (
            <p className="text-[12px] text-[#94a3b8]">Workflow에 payment 단계가 없습니다.</p>
          ) : (
            view.paymentFlow.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                {i > 0 ? <span className="text-[#CBD5E1]">↓</span> : null}
                <span
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-mono text-[11px]",
                    step.financial
                      ? "border border-amber-200 bg-amber-50 text-amber-900"
                      : step.approval
                        ? "border border-violet-200 bg-violet-50 text-violet-900"
                        : "border border-[#E2E8F0] bg-[#f8fafc] text-[#475569]",
                  )}
                >
                  {step.label}
                  {step.financial ? " ⚠" : ""}
                </span>
              </div>
            ))
          )}
        </div>
        {view.hasPaymentCommit ? (
          <p className="mt-4 text-[11px] font-medium text-amber-800">
            payment.commit — FINANCIAL SIDE EFFECT · Requires user approval
          </p>
        ) : null}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { readAdapterIndex, subscribeAdapterIndex } from "@/lib/hub/dev/adapter-registry";
import { buildCreatorOpsView } from "@/lib/hub/dev/creator-ops-model";
import {
  readInfrastructureIndex,
  subscribeInfrastructureIndex,
} from "@/lib/hub/dev/infrastructure-registry";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevIntegrationsPanelProps = {
  draft: PlatformDraft;
};

export function HubDevIntegrationsPanel({ draft }: HubDevIntegrationsPanelProps) {
  const [revision, bump] = useState(0);
  const ownerId = draft.operator?.name ?? draft.name;

  useEffect(() => {
    const unsubs = [
      subscribeInfrastructureIndex(() => bump((n) => n + 1)),
      subscribeAdapterIndex(() => bump((n) => n + 1)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const view = useMemo(() => buildCreatorOpsView(draft), [draft]);
  const infrastructure = useMemo(
    () =>
      readInfrastructureIndex().filter(
        (i) => i.ownerCreatorId === ownerId || i.ownerCreatorId === "Rimvio",
      ),
    [ownerId, revision],
  );
  const adapters = useMemo(
    () =>
      readAdapterIndex().filter(
        (a) => a.ownerCreatorId === ownerId || a.ownerCreatorId === "Rimvio",
      ),
    [ownerId, revision],
  );

  const rimvioInfra = [
    { id: "api", label: "API credentials", status: "Rimvio Secrets (Creator-owned keys)" },
    { id: "webhook", label: "Webhooks", status: "Configure inbound/outbound" },
    {
      id: "perm",
      label: "Permission scopes",
      status: `${draft.permissions.filter((p) => p.enabled).length} enabled`,
    },
    { id: "runtime", label: "Runtime", status: draft.runtimeTier },
  ];

  return (
    <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Integrations</p>
      <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">External connections</h2>
      <p className="mt-1 text-[12px] text-[#64748b]">
        Creator 공급 연결 + Hub <strong>Infrastructure · Adapter</strong> Store — Agent에는 Capability만
        노출되고, 실행은 Compatibility Graph로 바인딩됩니다.
      </p>

      <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-[#334155]">Hub Infrastructure Store</h3>
        <p className="mt-1 text-[11px] text-[#64748b]">
          외부 API · DB · PLC — Runtime과 Adapter로 Capability에 연결
        </p>
        <ul className="mt-3 space-y-2">
          {infrastructure.length === 0 ? (
            <li className="text-[12px] text-[#94a3b8]">등록된 Infrastructure 없음</li>
          ) : (
            infrastructure.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-lg border border-[#F1F5F9] px-3 py-2"
              >
                <div>
                  <p className="text-[13px] font-medium text-[#0f172a]">{i.name}</p>
                  <p className="font-mono text-[10px] text-[#64748b]">
                    {i.kind} · {i.id}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    i.status === "published"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  {i.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-[#334155]">Hub Adapter Store</h3>
        <p className="mt-1 text-[11px] text-[#64748b]">Runtime ↔ Infrastructure 브리지</p>
        <ul className="mt-3 space-y-2">
          {adapters.length === 0 ? (
            <li className="text-[12px] text-[#94a3b8]">등록된 Adapter 없음</li>
          ) : (
            adapters.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-[#F1F5F9] px-3 py-2"
              >
                <div>
                  <p className="text-[13px] font-medium text-[#0f172a]">{a.name}</p>
                  <p className="font-mono text-[10px] text-[#64748b]">
                    {a.runtimeId} → {a.infrastructureId}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    a.status === "verified"
                      ? "bg-emerald-50 text-emerald-700"
                      : a.status === "published"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700",
                  )}
                >
                  {a.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-[#334155]">Supply chain (Creator)</h3>
        <ul className="mt-3 space-y-3">
          {view.suppliers.length === 0 ? (
            <li className="text-[12px] text-[#94a3b8]">No hotel suppliers — generic platform</li>
          ) : (
            view.suppliers.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-[#F1F5F9] px-3 py-2"
              >
                <div>
                  <p className="text-[13px] font-medium text-[#0f172a]">{s.name}</p>
                  <p className="text-[10px] text-[#64748b]">Managed by Creator · {s.kind}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    s.status === "connected"
                      ? "bg-emerald-50 text-emerald-700"
                      : s.status === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-[#f1f5f9] text-[#94a3b8]",
                  )}
                >
                  {s.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-[#334155]">Rimvio connection infra</h3>
        <ul className="mt-3 space-y-2 text-[12px] text-[#475569]">
          {rimvioInfra.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>{i.label}</span>
              <span className="text-[#64748b]">{i.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-[11px] text-[#94a3b8]">
        Capability Test는 Capabilities 뷰의 Compatibility Graph에서 Infra → Adapter → Runtime을
        검증합니다. 결제는 <code className="font-mono">payment.prepare</code> ·{" "}
        <code className="font-mono">payment.commit</code> ·{" "}
        <code className="font-mono">payment.refund</code>로 분리합니다.
      </p>
    </div>
  );
}

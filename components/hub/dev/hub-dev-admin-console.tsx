"use client";

import { useMemo, useState } from "react";
import {
  buildCreatorOpsView,
  RIMVIO_OS_LAYERS,
  type CreatorAdminModule,
  type CreatorAdminModuleId,
} from "@/lib/hub/dev/creator-ops-model";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevAdminConsoleProps = {
  draft: PlatformDraft;
};

export function HubDevAdminConsole({ draft }: HubDevAdminConsoleProps) {
  const view = useMemo(() => buildCreatorOpsView(draft), [draft]);
  const [activeModule, setActiveModule] = useState<CreatorAdminModuleId>("dashboard");
  const module = view.adminModules.find((m) => m.id === activeModule) ?? view.adminModules[0]!;

  return (
    <div className="flex h-full min-h-0 bg-[#f1f5f9]">
      <aside className="w-[200px] shrink-0 border-r border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] p-4">
          <p className="text-[10px] font-semibold uppercase text-[#64748b]">Admin Console</p>
          <p className="mt-1 text-[14px] font-bold text-[#0f172a]">{view.platformName}</p>
          <p className="mt-0.5 text-[10px] text-[#64748b]">Owner · {view.ownerId}</p>
          <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[9px] font-medium text-amber-800">
            Creator-operated · Demo metrics
          </p>
        </div>
        <nav className="p-2">
          {view.adminModules.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveModule(m.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px]",
                activeModule === m.id
                  ? "bg-[#4593fc]/10 font-semibold text-[#2563eb]"
                  : "text-[#475569] hover:bg-[#f8fafc]",
              )}
            >
              <span className="w-4 text-center text-[11px]">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-6 rimvio-scroll-touch">
        <AdminModuleContent module={module} view={view} draft={draft} />
      </main>
    </div>
  );
}

function AdminModuleContent({
  module,
  view,
  draft,
}: {
  module: CreatorAdminModule;
  view: ReturnType<typeof buildCreatorOpsView>;
  draft: PlatformDraft;
}) {
  if (module.id === "dashboard") {
    return (
      <div>
        <h2 className="text-[20px] font-bold text-[#0f172a]">Dashboard</h2>
        <p className="mt-1 text-[12px] text-[#64748b]">{view.tagline}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {view.dashboardMetrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
            >
              <p className="text-[11px] font-medium text-[#64748b]">{m.label}</p>
              <p className="mt-2 text-[24px] font-bold text-[#0f172a]">{m.value}</p>
              <p className="mt-1 text-[9px] text-amber-600">Demo · not live production data</p>
            </div>
          ))}
        </div>
        <RimvioBoundaryCard />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[20px] font-bold text-[#0f172a]">{module.label}</h2>
      <p className="mt-1 text-[12px] text-[#64748b]">{module.description}</p>

      {module.relatedCapabilities.length > 0 ? (
        <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase text-[#64748b]">Powered by Capabilities</p>
          <ul className="mt-2 space-y-1 font-mono text-[12px] text-[#334155]">
            {module.relatedCapabilities.map((c) => (
              <li key={c}>🧩 {c}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {module.dataCollection ? (
        <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase text-[#64748b]">Data collection</p>
          <p className="mt-1 font-mono text-[13px] text-[#0f172a]">{module.dataCollection}</p>
          <p className="mt-2 text-[11px] text-[#64748b]">
            Creator-owned data in Platform storage — Rimvio does not operate this business.
          </p>
        </section>
      ) : null}

      <section className="mt-4 rounded-xl border border-dashed border-[#CBD5E1] bg-[#f8fafc] p-4">
        <p className="text-[12px] font-medium text-[#334155]">
          {module.label} management UI ships with your Platform after Deploy.
        </p>
        <p className="mt-2 text-[11px] text-[#64748b]">
          Add features via AI Build — e.g. &quot;주말에는 객실 가격을 20% 올려줘&quot; → Dynamic Pricing
          Capability → Preview → Deploy.
        </p>
        <p className="mt-2 text-[10px] text-[#94a3b8]">
          Platform · {draft.name} · {draft.actions.length} capabilities
        </p>
      </section>

      <RimvioBoundaryCard />
    </div>
  );
}

function RimvioBoundaryCard() {
  return (
    <section className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-[11px] font-semibold text-[#334155]">Rimvio provides (OS only)</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {RIMVIO_OS_LAYERS.map((layer) => (
          <li
            key={layer}
            className="rounded-full border border-[#E2E8F0] bg-[#f8fafc] px-2.5 py-0.5 text-[10px] text-[#64748b]"
          >
            {layer}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-[#64748b]">
        호텔·예약·가격·정산 <strong>사업 운영</strong>은 Creator/Team 책임입니다. Rimvio는 Agoda/여기어때
        같은 사업자가 아닙니다.
      </p>
    </section>
  );
}

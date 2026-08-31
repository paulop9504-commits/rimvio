"use client";

import { useEffect, useState } from "react";
import { HUB_STORE_LABELS } from "@/lib/hub/dev/hub-registry-stores";
import { readAdapterIndex, subscribeAdapterIndex } from "@/lib/hub/dev/adapter-registry";
import { readInfrastructureIndex, subscribeInfrastructureIndex } from "@/lib/hub/dev/infrastructure-registry";
import { readRuntimeIndex, subscribeRuntimeIndex } from "@/lib/hub/dev/runtime-registry";
import { readCapabilityIndex, subscribeCapabilityIndex } from "@/lib/platform-sdk/capability-index";
import { isAgentDiscoverableCapability } from "@/lib/platform-sdk/capability-lifecycle";
import type { HubDevNavId } from "@/lib/hub/dev/platform-nav";
import { cn } from "@/lib/utils";

type HubDevHubStoresPanelProps = {
  onNavigate: (nav: HubDevNavId) => void;
};

export function HubDevHubStoresPanel({ onNavigate }: HubDevHubStoresPanelProps) {
  const [, bump] = useState(0);

  useEffect(() => {
    const unsubs = [
      subscribeCapabilityIndex(() => bump((n) => n + 1)),
      subscribeRuntimeIndex(() => bump((n) => n + 1)),
      subscribeInfrastructureIndex(() => bump((n) => n + 1)),
      subscribeAdapterIndex(() => bump((n) => n + 1)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const caps = readCapabilityIndex().filter((e) => isAgentDiscoverableCapability(e.status));
  const runtimes = readRuntimeIndex();
  const infra = readInfrastructureIndex();
  const adapters = readAdapterIndex();

  const stores = [
    {
      kind: "capability" as const,
      label: HUB_STORE_LABELS.capability,
      count: caps.length,
      nav: "deployments" as HubDevNavId,
      sample: caps.slice(0, 3).map((c) => c.capabilityId),
    },
    {
      kind: "runtime" as const,
      label: HUB_STORE_LABELS.runtime,
      count: runtimes.length,
      nav: "runtime" as HubDevNavId,
      sample: runtimes.slice(0, 3).map((r) => r.name),
    },
    {
      kind: "infrastructure" as const,
      label: HUB_STORE_LABELS.infrastructure,
      count: infra.length,
      nav: "compatibility" as HubDevNavId,
      sample: infra.slice(0, 2).map((i) => i.name),
    },
    {
      kind: "adapter" as const,
      label: HUB_STORE_LABELS.adapter,
      count: adapters.length,
      nav: "compatibility" as HubDevNavId,
      sample: adapters.slice(0, 2).map((a) => a.name),
    },
  ];

  return (
    <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Hub</p>
      <h2 className="mt-1 text-[20px] font-bold text-[#0f172a]">Four Stores · One Standard</h2>
      <p className="mt-1 max-w-xl text-[12px] text-[#64748b]">
        AI Agent가 실행될 세계를 Dev가 확장합니다. Agent에 직접 노출되는 것은{" "}
        <strong>Published Capability</strong>뿐 — Infrastructure/Runtime/Adapter는 Compatibility
        Graph로 연결됩니다.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {stores.map((store) => (
          <article
            key={store.kind}
            className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
          >
            <p className="text-[13px] font-bold text-[#0f172a]">{store.label}</p>
            <p className="mt-1 text-[24px] font-bold text-[#6366f1]">{store.count}</p>
            {store.sample.length > 0 ? (
              <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-[#64748b]">
                {store.sample.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              onClick={() => onNavigate(store.nav)}
              className={cn(
                "mt-4 text-[11px] font-semibold text-[#6366f1] hover:underline",
              )}
            >
              Open →
            </button>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-4 text-[11px] text-[#475569]">
        <p className="font-semibold text-[#334155]">Ecosystem compose</p>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-[#64748b]">
          {`Robot Runtime (Dev)
      +
Robot Arm Capability (Dev)
      +
Factory PLC Infrastructure (Dev)
      ↓
✓ Compatible (Core Engine)
      ↓
Rimvio Agent → Runtime Router`}
        </pre>
      </section>
    </div>
  );
}

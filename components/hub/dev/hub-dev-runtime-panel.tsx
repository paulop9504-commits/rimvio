"use client";

import { useEffect, useMemo, useState } from "react";
import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import {
  buildDevRuntimeSnapshot,
  subscribeDevExecutionLog,
  type DevRuntimeSnapshot,
} from "@/lib/hub/dev/execution-log";
import { readCapabilityIndex } from "@/lib/platform-sdk/capability-index";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevRuntimePanelProps = {
  draft: PlatformDraft;
  publishStatus: "idle" | "submitting" | "pending-review" | "published";
};

export function HubDevRuntimePanel({ draft, publishStatus }: HubDevRuntimePanelProps) {
  const [, bump] = useState(0);
  const manifest = useMemo(() => capabilityDraftToPlatformManifest(draft), [draft]);
  const platformId = manifest.package.id;

  useEffect(() => subscribeDevExecutionLog(() => bump((n) => n + 1)), []);

  const publishedInRegistry = readCapabilityIndex().some(
    (e) => e.platformId === platformId && e.status === "published",
  );

  const snapshot: DevRuntimeSnapshot = buildDevRuntimeSnapshot({
    platformId,
    platformName: draft.name,
    capabilityCount: draft.actions.length,
    publishStatus,
    publishedInRegistry,
  });

  return (
    <div className="overflow-y-auto p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Runtime</p>
      <h2 className="mt-1 text-[18px] font-bold text-[#f2f4f6]">{draft.name}</h2>
      <p className="mt-1 text-[12px] text-[#6b7684]">
        Metrics from Dev Workspace execution log only — not production telemetry.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Environment" value={snapshot.environment} />
        <MetricCard
          label="Status"
          value={snapshot.healthy ? "● Healthy" : "○ Errors"}
          valueClass={snapshot.healthy ? "text-emerald-400" : "text-amber-400"}
        />
        <MetricCard label="Capabilities" value={String(snapshot.capabilityCount)} />
        <MetricCard label="Requests (log)" value={String(snapshot.requestCount)} />
        <MetricCard
          label="Errors"
          value={
            snapshot.requestCount === 0
              ? "—"
              : `${snapshot.errorCount} (${snapshot.errorRatePct ?? 0}%)`
          }
        />
        <MetricCard
          label="Latency P95"
          value={snapshot.latencyP95Ms != null ? `${snapshot.latencyP95Ms}ms` : "—"}
        />
      </div>

      <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#151820] p-4 text-[12px]">
        <p className="font-semibold text-[#b0b8c1]">Registry</p>
        <p className="mt-2 text-[#6b7684]">
          {snapshot.publishedInRegistry
            ? "✓ Published capabilities visible to Agent discovery"
            : "○ Not in Capability Registry — Publish to Hub first"}
        </p>
        <p className="mt-2 font-mono text-[10px] text-[#4b5563]">{platformId}</p>
        {snapshot.lastEventAtIso ? (
          <p className="mt-2 text-[10px] text-[#6b7684]">
            Last event: {new Date(snapshot.lastEventAtIso).toLocaleString()}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#151820] p-4">
      <p className="text-[10px] font-semibold uppercase text-[#6b7684]">{label}</p>
      <p className={cn("mt-1 text-[16px] font-bold capitalize text-[#f2f4f6]", valueClass)}>
        {value}
      </p>
    </div>
  );
}

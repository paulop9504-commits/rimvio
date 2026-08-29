"use client";

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { PlatformRegistryMeta } from "@/lib/hub/dev/platform-registry";
import { blueprintFromDraft } from "@/lib/hub/dev/blueprint";
import { AlertTriangle, Check } from "lucide-react";

type HubDevPlatformManageProps = {
  readonly meta: PlatformRegistryMeta;
  readonly draft: PlatformDraft;
  readonly onTestAgent: () => void;
  readonly onPublish: () => void;
  readonly onOpenAdvanced: (nav: string) => void;
};

export function HubDevPlatformManage({
  meta,
  draft,
  onTestAgent,
  onPublish,
  onOpenAdvanced,
}: HubDevPlatformManageProps) {
  const bp = blueprintFromDraft(draft);

  return (
    <div className="overflow-y-auto p-6 rimvio-scroll-touch">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[28px] leading-none">{meta.icon}</p>
            <h1 className="mt-2 text-[22px] font-bold text-[#f2f4f6]">{meta.name}</h1>
            <p className="mt-1 text-[13px] text-[#6b7684]">{meta.tagline}</p>
          </div>
          {meta.status === "agent_ready" || meta.status === "published" ? (
            <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-400">
              Agent Ready ✓
            </span>
          ) : (
            <span className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-400">
              Draft
            </span>
          )}
        </div>

        {meta.rimvioCertified ? (
          <p className="mt-3 text-[11px] font-medium text-[#8ec0ff]">Rimvio Certified ✓</p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <StatCard label="Agent usage" value={meta.agentUsage.toLocaleString()} />
          <StatCard label="Success rate" value={`${meta.successRate.toFixed(1)}%`} />
        </div>

        <Section title="Discovered Capabilities">
          <ul className="space-y-2">
            {draft.actions.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => onOpenAdvanced(`configuration&cap=${action.id}`)}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/[0.06] bg-[#151820] px-3 py-2 text-left font-mono text-[12px] text-[#b0b8c1] hover:border-[#4593fc]/30"
                >
                  {action.approvalRequired ? (
                    <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
                  ) : (
                    <Check className="size-3.5 shrink-0 text-emerald-400" />
                  )}
                  {action.name}
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Data">
          <p className="text-[13px] text-[#b0b8c1]">
            {bp.dataModels.length} objects · {meta.ingressLabel}
          </p>
          <button
            type="button"
            onClick={() => onOpenAdvanced("data")}
            className="mt-2 text-[11px] text-[#8ec0ff] hover:underline"
          >
            Advanced → Data
          </button>
        </Section>

        <Section title="Permissions">
          <p className="text-[13px] text-[#b0b8c1]">
            Read {draft.permissions.filter((p) => p.scope === "Read").length || bp.capabilities.length - meta.approvalRequiredCount} · Write{" "}
            {draft.permissions.filter((p) => p.scope === "Write").length} · Payment{" "}
            {meta.approvalRequiredCount}
          </p>
        </Section>

        <Section title="Runtime">
          <p className="text-[13px] text-[#b0b8c1]">{bp.runtime}</p>
          <button
            type="button"
            onClick={() => onOpenAdvanced("runtime")}
            className="mt-2 text-[11px] text-[#8ec0ff] hover:underline"
          >
            Advanced → Runtime
          </button>
        </Section>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onTestAgent}
            className="rounded-xl border border-white/[0.12] px-5 py-2.5 text-[13px] font-semibold text-[#b0b8c1] hover:border-[#4593fc]/40"
          >
            Test Agent
          </button>
          <button
            type="button"
            onClick={onPublish}
            className="rounded-xl bg-[#4593fc] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#3a82e0]"
          >
            Publish
          </button>
        </div>

        <p className="mt-8 text-[10px] text-[#6b7684]">
          Capabilities · Workflows · Configuration — Advanced mode에서만 상세 제어
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-white/[0.06] pt-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#151820] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-[#6b7684]">{label}</p>
      <p className="mt-1 text-[18px] font-bold text-[#f2f4f6]">{value}</p>
    </div>
  );
}

"use client";

import { AlertTriangle, Check, ChevronLeft } from "lucide-react";
import type { AnalyzedPlatformBlueprint } from "@/lib/hub/dev/platform-analyzer";
import { certificationSummary } from "@/lib/hub/dev/platform-analyzer";
import { cn } from "@/lib/utils";

type HubDevBlueprintReviewProps = {
  readonly blueprint: AnalyzedPlatformBlueprint;
  readonly onBack: () => void;
  readonly onConfirm: () => void;
  readonly onTest: () => void;
};

export function HubDevBlueprintReview({
  blueprint,
  onBack,
  onConfirm,
  onTest,
}: HubDevBlueprintReviewProps) {
  const cert = certificationSummary(blueprint.certification);
  const approvalCount = blueprint.capabilities.filter((c) => c.approvalRequired).length;

  return (
    <div className="min-h-dvh bg-[#0c0e12] text-[#f2f4f6]">
      <header className="flex h-12 items-center gap-3 border-b border-white/[0.06] px-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[12px] text-[#6b7684] hover:text-[#b0b8c1]"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <span className="text-[12px] text-[#6b7684]">Blueprint Review</span>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
          Rimvio detected your platform
        </p>
        <h1 className="mt-2 text-[24px] font-bold">{blueprint.platformName}</h1>
        <p className="mt-1 text-[14px] text-[#6b7684]">{blueprint.tagline}</p>
        <p className="mt-1 text-[11px] text-[#4593fc]">{blueprint.ingressLabel}</p>

        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#151820] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">
              {blueprint.capabilities.length} Capabilities detected
            </p>
            {cert.agentReady ? (
              <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-400">
                Agent Ready ✓
              </span>
            ) : (
              <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-400">
                Review required
              </span>
            )}
          </div>

          <ul className="mt-4 space-y-2">
            {blueprint.capabilities.map((cap) => (
              <li
                key={cap.capabilityId}
                className="flex items-start gap-2 font-mono text-[12px] text-[#b0b8c1]"
              >
                {cap.approvalRequired ? (
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                ) : (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                )}
                <span>
                  {cap.capabilityId}
                  {cap.sourceEndpoint ? (
                    <span className="ml-2 text-[10px] text-[#6b7684]">{cap.sourceEndpoint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          {approvalCount > 0 ? (
            <p className="mt-4 text-[11px] text-amber-400">
              {approvalCount} capability(ies) require approval
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SummaryCard
            title="Permissions"
            rows={[
              ["Read", blueprint.permissionSummary.read],
              ["Write", blueprint.permissionSummary.write],
              ["Payment", blueprint.permissionSummary.financial],
            ]}
          />
          <SummaryCard
            title="Canonical Objects"
            items={blueprint.canonicalObjects.slice(0, 6)}
          />
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#151820]/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
            Certification ({cert.passed}/{cert.total})
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {blueprint.certification.map((check) => (
              <li
                key={check.id}
                className={cn(
                  "flex items-center gap-2 text-[11px]",
                  check.passed ? "text-emerald-400" : "text-[#6b7684]",
                )}
              >
                {check.passed ? <Check className="size-3" /> : <span className="size-3">○</span>}
                {check.labelKo}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-[#4593fc] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#3a82e0]"
          >
            Review Blueprint → Manage
          </button>
          <button
            type="button"
            onClick={onTest}
            className="rounded-xl border border-white/[0.12] px-5 py-3 text-[13px] font-medium text-[#b0b8c1] hover:border-[#4593fc]/40"
          >
            Test Agent
          </button>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  rows,
  items,
}: {
  title: string;
  rows?: readonly (readonly [string, number])[];
  items?: readonly string[];
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#151820] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">{title}</p>
      {rows ? (
        <ul className="mt-2 space-y-1 text-[12px] text-[#b0b8c1]">
          {rows.map(([label, count]) => (
            <li key={label}>
              {label} <span className="text-[#8ec0ff]">{count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {items ? (
        <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-[#b0b8c1]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

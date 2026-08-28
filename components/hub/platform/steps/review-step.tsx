"use client";

import Link from "next/link";
import { CapabilityPreviewCard } from "@/components/hub/wizard/capability-preview-card";
import {
  MarketAvailabilityBadges,
  MarketDeploymentPanel,
} from "@/components/hub/wizard/market-deployment-panel";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { PLATFORM_WIZARD_STEP_LABELS } from "@/lib/hub/platform/types";
import { marketsPublishBlockReason } from "@/lib/hub/capability/validation";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";
import { Check, Download, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { PlatformHostLink } from "@/components/platform/platform-host";

export function PlatformReviewStep({ wizard }: { wizard: HubPlatformWizard }) {
  const {
    draft,
    updateDraft,
    stepValidation,
    publishStatus,
    publishReady,
    goToStep,
    resetWizard,
    exportManifest,
    importManifestFile,
    importError,
    lastPublishedPlatformId,
  } = wizard;
  const importRef = useRef<HTMLInputElement>(null);

  if (publishStatus === "pending-review" || publishStatus === "published") {
    const platformId = lastPublishedPlatformId ?? `platform.${draft.id.replace(/\./g, "-")}`;
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="size-8" />
        </div>
        <h2 className="text-[22px] font-semibold text-[#0F172A]">Platform submitted successfully</h2>
        <p className="text-[14px] text-[#64748B]">
          {draft.name} · v{draft.version}
        </p>
        <p className="text-[13px] font-semibold text-emerald-600">
          Status: Published to Platform Index
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <PlatformHostLink
            platformId={platformId}
            routePath="/"
            className="rounded-lg bg-[#6366F1] px-4 py-2 text-[13px] font-semibold text-white"
          >
            Open L1 Native UI
          </PlatformHostLink>
          <Link
            href="/hub/build"
            className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-[13px] font-semibold text-[#64748B]"
          >
            Rimvio Builder
          </Link>
          <button
            type="button"
            onClick={resetWizard}
            className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-[13px] font-semibold text-[#64748B]"
          >
            New Platform
          </button>
        </div>
      </div>
    );
  }

  if (publishStatus === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="size-10 animate-spin text-[#6366F1]" />
        <p className="text-[15px] font-semibold text-[#0F172A]">Publishing platform…</p>
      </div>
    );
  }

  const summarySteps = PLATFORM_WIZARD_STEP_LABELS.filter((s) => s.id < 14);

  return (
    <div className="mx-auto max-w-6xl">
      <WizardStepHeader
        step={14}
        title="Review & Publish"
        description="Review per-market readiness and publish to Rimvio Hub."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[12px] font-semibold text-[#334155]">Submission Summary</p>
            <ul className="divide-y divide-[#F1F5F9]">
              {summarySteps.map((item) => {
                const ok = stepValidation[item.key];
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => goToStep(item.id)}
                      className="flex w-full items-center justify-between px-1 py-2 text-left text-[13px] hover:bg-[#F8FAFC]"
                    >
                      <span>{item.label}</span>
                      <span
                        className={cn(
                          "text-[12px] font-semibold",
                          ok ? "text-emerald-600" : "text-red-600",
                        )}
                      >
                        {ok ? "✓ Complete" : "✕ Incomplete"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[12px] font-semibold text-[#334155]">Market Readiness</p>
            <MarketDeploymentPanel draft={draft} onChange={updateDraft} compact />
          </div>

          <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-[12px]">
            {(
              [
                ["rights", "I have the rights to publish this platform."],
                ["permissions", "I understand the requested permissions."],
                ["policy", "This platform complies with Rimvio Hub policies."],
                ["tested", "I have tested this platform in the sandbox."],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-start gap-2 text-[#334155]">
                <input
                  type="checkbox"
                  checked={draft.publishConsents[key]}
                  onChange={(e) =>
                    updateDraft({
                      publishConsents: {
                        ...draft.publishConsents,
                        [key]: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5"
                />
                {label}
              </label>
            ))}
          </div>

          {!publishReady ? (
            <p className="text-[12px] text-amber-700">
              Complete all steps before publishing.
              {marketsPublishBlockReason(draft) ? (
                <span className="mt-1 block">{marketsPublishBlockReason(draft)}</span>
              ) : null}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[12px] text-emerald-600">
              <Check className="size-3.5" /> All checks passed — ready to publish.
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-[#F1F5F9] pt-4">
            <button
              type="button"
              onClick={() => exportManifest()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-semibold text-[#64748B]"
            >
              <Download className="size-3.5" />
              Export Manifest
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-semibold text-[#64748B]"
            >
              <Upload className="size-3.5" />
              Import Manifest
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importManifestFile(file);
              }}
            />
          </div>
          {importError ? <p className="text-[12px] text-red-600">{importError}</p> : null}
        </div>

        <aside>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            Marketplace Preview
          </p>
          <CapabilityPreviewCard draft={draft} showRating variant="marketplace" />
          <MarketAvailabilityBadges draft={draft} className="mt-3" />
        </aside>
      </div>
    </div>
  );
}

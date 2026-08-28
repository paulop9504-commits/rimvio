"use client";

import Link from "next/link";
import { CapabilityPreviewCard } from "@/components/hub/wizard/capability-preview-card";
import { MarketAvailabilityBadges } from "@/components/hub/wizard/market-deployment-panel";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { marketsPublishBlockReason } from "@/lib/hub/capability/validation";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { Check, Download, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { PlatformHostLink } from "@/components/platform/platform-host";

const SUMMARY = [
  { step: 1 as const, label: "Package Information", key: "package" as const, statusLabel: "Complete" },
  { step: 2 as const, label: "Manifest", key: "manifest" as const, statusLabel: "Valid" },
  { step: 3 as const, label: "Permissions", key: "permissions" as const, statusLabel: "Valid" },
  { step: 4 as const, label: "Context & I/O", key: "context" as const, statusLabel: "Complete" },
  { step: 5 as const, label: "Test & Validate", key: "test" as const, statusLabel: "Passed" },
];

export function ReviewStep({ wizard }: { wizard: HubCapabilityWizard }) {
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
        <h2 className="text-[22px] font-semibold text-[#0F172A]">Capability submitted successfully</h2>
        <p className="text-[14px] text-[#64748B]">
          {draft.name} · v{draft.version}
        </p>
        <p className="text-[13px] font-semibold text-emerald-600">Status: Published to Capability Index</p>
        <ul className="space-y-1 text-left text-[12px] text-emerald-700">
          <li>✓ Package uploaded</li>
          <li>✓ Manifest verified</li>
          <li>✓ Security scan passed</li>
          <li>✓ Sandbox result verified</li>
          <li>✓ Capability Index registered</li>
        </ul>
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
            New Capability
          </button>
        </div>
      </div>
    );
  }

  if (publishStatus === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="size-10 animate-spin text-[#6366F1]" />
        <p className="text-[15px] font-semibold text-[#0F172A]">Submitting…</p>
        <ul className="space-y-1 text-[12px] text-[#64748B]">
          <li>✓ Package uploaded</li>
          <li>✓ Manifest verified</li>
          <li>Running security scan…</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <WizardStepHeader
        step={6}
        title="Review & Publish"
        description="Review your capability and submit it to Rimvio Hub."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[12px] font-semibold text-[#334155]">Submission Summary</p>
            <ul className="divide-y divide-[#F1F5F9]">
              {SUMMARY.map((item) => {
                const ok = stepValidation[item.key];
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => goToStep(item.step)}
                      className="flex w-full items-center justify-between px-1 py-2.5 text-left text-[13px] transition-colors hover:bg-[#F8FAFC]"
                    >
                      <span className="text-[#0F172A]">{item.label}</span>
                      <span
                        className={cn(
                          "text-[12px] font-semibold",
                          ok ? "text-emerald-600" : "text-red-600",
                        )}
                      >
                        {ok ? `✓ ${item.statusLabel}` : "✕ Incomplete"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[12px] font-semibold text-[#334155]">Version Information</p>
            <label className="text-[11px] text-[#64748B]">Version</label>
            <input
              value={draft.version}
              onChange={(e) => updateDraft({ version: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 font-mono text-[13px]"
            />
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <label className="text-[12px] font-semibold text-[#334155]">Changelog</label>
            <textarea
              value={draft.changelog}
              onChange={(e) => updateDraft({ changelog: e.target.value })}
              rows={3}
              placeholder="Describe what's new in this version…"
              className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/30"
            />
          </div>

          <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-[12px]">
            {(
              [
                ["rights", "I have the rights to publish this capability."],
                ["permissions", "I understand the requested permissions."],
                ["policy", "This capability complies with Rimvio Hub policies."],
                ["tested", "I have tested this capability in the sandbox."],
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
              Complete all steps and checklists before submitting.
              {marketsPublishBlockReason(draft) ? (
                <span className="mt-1 block">{marketsPublishBlockReason(draft)}</span>
              ) : null}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[12px] text-emerald-600">
              <Check className="size-3.5" /> All checks passed — ready for review.
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-[#F1F5F9] pt-4">
            <button
              type="button"
              onClick={() => exportManifest()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-semibold text-[#64748B]"
            >
              <Download className="size-3.5" />
              Export Manifest JSON
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-semibold text-[#64748B]"
            >
              <Upload className="size-3.5" />
              Import Manifest JSON
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
          {importError ? (
            <p className="text-[12px] text-red-600">{importError}</p>
          ) : null}
        </div>

        <aside>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            Marketplace Preview
          </p>
          <CapabilityPreviewCard draft={draft} showRating variant="marketplace" />
          <MarketAvailabilityBadges draft={draft} className="mt-3" />
          <p className="mt-2 font-mono text-[10px] text-[#94A3B8]">{draft.id}</p>
        </aside>
      </div>
    </div>
  );
}

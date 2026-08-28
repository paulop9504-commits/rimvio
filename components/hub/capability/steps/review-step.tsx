"use client";

import Link from "next/link";
import { CapabilityPreviewCard } from "@/components/hub/wizard/capability-preview-card";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { Check, Loader2 } from "lucide-react";

const SUMMARY = [
  { step: 1 as const, label: "Package Information", key: "package" as const },
  { step: 2 as const, label: "Manifest", key: "manifest" as const },
  { step: 3 as const, label: "Permissions", key: "permissions" as const },
  { step: 4 as const, label: "Context & I/O", key: "context" as const },
  { step: 5 as const, label: "Test & Validate", key: "test" as const },
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
  } = wizard;

  if (publishStatus === "pending-review" || publishStatus === "published") {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="size-8" />
        </div>
        <h2 className="text-[22px] font-semibold text-[#0F172A]">Capability submitted successfully</h2>
        <p className="text-[14px] text-[#64748B]">
          {draft.name} · v{draft.version}
        </p>
        <p className="text-[13px] font-semibold text-amber-600">Status: Pending Review</p>
        <ul className="space-y-1 text-left text-[12px] text-emerald-700">
          <li>✓ Package uploaded</li>
          <li>✓ Manifest verified</li>
          <li>✓ Security scan passed</li>
          <li>✓ Sandbox result verified</li>
          <li>✓ Package signed</li>
        </ul>
        <div className="flex justify-center gap-2">
          <Link
            href="/hub"
            className="rounded-lg bg-[#6366F1] px-4 py-2 text-[13px] font-semibold text-white"
          >
            View Capability
          </Link>
          <button
            type="button"
            onClick={resetWizard}
            className="rounded-lg border px-4 py-2 text-[13px] font-semibold text-[#64748B]"
          >
            Back to My Capabilities
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
    <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div>
          <h2 className="text-[20px] font-semibold text-[#0F172A]">6. Review & Publish</h2>
          <p className="mt-1 text-[14px] text-[#64748B]">
            Review your capability and submit it to Rimvio Hub.
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="mb-3 text-[12px] font-semibold text-[#334155]">Submission Summary</p>
          <ul className="space-y-2">
            {SUMMARY.map((item) => {
              const ok = stepValidation[item.key];
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => goToStep(item.step)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-[#F8FAFC]"
                  >
                    <span className="text-[#0F172A]">{item.label}</span>
                    <span className={ok ? "text-emerald-600" : "text-red-600"}>
                      {ok ? "✓ Complete" : "✕ Incomplete"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[12px] font-semibold text-[#334155]">Version</label>
            <input
              value={draft.version}
              onChange={(e) => updateDraft({ version: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border px-2 font-mono text-[13px]"
            />
          </div>
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#334155]">Changelog</label>
          <textarea
            value={draft.changelog}
            onChange={(e) => updateDraft({ changelog: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-[13px]"
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
            Complete all steps and checklists before publishing.
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[12px] text-emerald-600">
            <Check className="size-3.5" /> All checks passed — your capability is ready for review.
          </p>
        )}
      </div>

      <aside>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
          Hub Preview
        </p>
        <CapabilityPreviewCard draft={draft} showRating />
        <p className="mt-2 font-mono text-[10px] text-[#94A3B8]">{draft.id}</p>
      </aside>
    </div>
  );
}

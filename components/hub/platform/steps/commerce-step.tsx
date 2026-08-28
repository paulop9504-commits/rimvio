"use client";

import { Label } from "@/components/ui/label";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function CommerceStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepHeader
        step={11}
        title="Commerce"
        description="Payment, tax, and seller flows per market."
      />
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <Label className="text-[12px] font-semibold text-[#334155]">Commerce Notes</Label>
        <textarea
          value={draft.commerceNotes}
          onChange={(e) => updateDraft({ commerceNotes: e.target.value })}
          rows={5}
          placeholder="KR: Kakao Pay, Toss · US: Stripe · JP: PayPay…"
          className="mt-1.5 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
        />
        <p className="mt-2 text-[11px] text-[#94A3B8]">
          Complete payment and tax readiness in the Markets step for each country.
        </p>
      </div>
    </div>
  );
}

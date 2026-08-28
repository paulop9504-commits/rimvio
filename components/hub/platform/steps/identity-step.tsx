"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { validateCapabilityId } from "@/lib/hub/capability/validation";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function IdentityStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;
  const idError = validateCapabilityId(draft.id);

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepHeader
        step={1}
        title="Platform Identity"
        description="Name and identify your platform on Rimvio Hub."
      />
      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Platform Name</Label>
          <Input
            value={draft.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            className="mt-1.5 h-10"
            maxLength={50}
          />
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Platform ID</Label>
          <Input
            value={draft.id}
            onChange={(e) => updateDraft({ id: e.target.value })}
            className="mt-1.5 h-10 font-mono text-[13px]"
          />
          {idError ? <p className="mt-1 text-[12px] text-red-600">{idError}</p> : null}
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Description</Label>
          <textarea
            value={draft.description}
            onChange={(e) => updateDraft({ description: e.target.value })}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
          />
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Version</Label>
          <Input
            value={draft.version}
            onChange={(e) => updateDraft({ version: e.target.value })}
            className="mt-1.5 h-10 font-mono text-[13px]"
          />
        </div>
      </div>
    </div>
  );
}

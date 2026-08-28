"use client";

import { Label } from "@/components/ui/label";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function WorkflowStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepHeader
        step={8}
        title="Workflow"
        description="Events, triggers, and approval before commit."
      />
      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Workflow Description</Label>
          <textarea
            value={draft.workflowDescription}
            onChange={(e) => updateDraft({ workflowDescription: e.target.value })}
            rows={4}
            className="mt-1.5 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
          />
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">
            Approval Before ({draft.approval.before.join(", ") || "none"})
          </Label>
          <p className="mt-1 text-[12px] text-[#64748B]">
            {draft.events.length} event(s) declared · payment approval required on purchase
            actions.
          </p>
        </div>
      </div>
    </div>
  );
}

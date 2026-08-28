"use client";

import { Label } from "@/components/ui/label";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { HubCodeEditor } from "@/components/hub/wizard/hub-code-editor";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function UiStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepHeader
        step={6}
        title="UI"
        description="L1 native routes surfaced in Platform Host."
      />
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <Label className="text-[12px] font-semibold text-[#334155]">Routes</Label>
        <HubCodeEditor
          value={draft.uiRoutesJson}
          onChange={(v) => updateDraft({ uiRoutesJson: v })}
          rows={12}
        />
      </div>
    </div>
  );
}

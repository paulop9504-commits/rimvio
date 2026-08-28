"use client";

import { Label } from "@/components/ui/label";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { HubCodeEditor } from "@/components/hub/wizard/hub-code-editor";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function DataStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepHeader
        step={5}
        title="Data"
        description="Tenant collections and isolation policy."
      />
      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Isolation</Label>
          <select
            value={draft.dataIsolation}
            onChange={(e) =>
              updateDraft({
                dataIsolation: e.target.value as typeof draft.dataIsolation,
              })
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[13px]"
          >
            <option value="tenant_strict">Tenant strict</option>
            <option value="shared_read">Shared read</option>
          </select>
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Collections</Label>
          <HubCodeEditor
            value={draft.dataCollectionsJson}
            onChange={(v) => updateDraft({ dataCollectionsJson: v })}
            rows={12}
          />
        </div>
      </div>
    </div>
  );
}

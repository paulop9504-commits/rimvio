"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

export function ArchitectureStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepHeader
        step={4}
        title="Architecture"
        description="Runtime tier, agent type, and entry point."
      />
      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Runtime Tier</Label>
          <select
            value={draft.runtimeTier}
            onChange={(e) =>
              updateDraft({ runtimeTier: e.target.value as typeof draft.runtimeTier })
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[13px]"
          >
            <option value="native">Native (L1 host)</option>
            <option value="hosted">Hosted</option>
          </select>
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Agent Type</Label>
          <select
            value={draft.runtime.type}
            onChange={(e) =>
              updateDraft({
                runtime: { ...draft.runtime, type: e.target.value as typeof draft.runtime.type },
              })
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[13px]"
          >
            <option value="cloud-agent">Cloud Agent</option>
            <option value="pc-agent">PC Agent</option>
            <option value="remote-agent">Remote Agent</option>
            <option value="mobile-agent">Mobile Agent</option>
            <option value="api-tool">API Tool</option>
          </select>
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Entry Point</Label>
          <Input
            value={draft.runtime.entry}
            onChange={(e) =>
              updateDraft({ runtime: { ...draft.runtime, entry: e.target.value } })
            }
            className="mt-1.5 h-10 font-mono text-[13px]"
          />
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Notes</Label>
          <textarea
            value={draft.architectureNotes}
            onChange={(e) => updateDraft({ architectureNotes: e.target.value })}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
          />
        </div>
      </div>
    </div>
  );
}

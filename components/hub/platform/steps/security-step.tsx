"use client";

import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { computeSecurityImpact } from "@/lib/hub/capability/validation";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";
import { cn } from "@/lib/utils";

export function SecurityStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;
  const impact = computeSecurityImpact(draft);

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepHeader
        step={12}
        title="Security"
        description="Permission impact review and policy compliance."
      />
      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[#0F172A]">Security Impact</p>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase",
              impact === "low" && "bg-emerald-100 text-emerald-700",
              impact === "medium" && "bg-amber-100 text-amber-800",
              impact === "high" && "bg-orange-100 text-orange-800",
              impact === "critical" && "bg-red-100 text-red-700",
            )}
          >
            {impact}
          </span>
        </div>
        <ul className="space-y-1 text-[12px] text-[#64748B]">
          <li>✓ Manifest schema validation</li>
          <li>✓ Permission scope review</li>
          <li>✓ Tenant isolation policy</li>
        </ul>
        <label className="flex items-start gap-2 text-[13px] text-[#334155]">
          <input
            type="checkbox"
            checked={draft.securityScanPassed}
            onChange={(e) => updateDraft({ securityScanPassed: e.target.checked })}
            className="mt-0.5"
          />
          Security scan passed — I confirm permissions match declared scope.
        </label>
      </div>
    </div>
  );
}

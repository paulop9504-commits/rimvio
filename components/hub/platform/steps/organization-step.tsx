"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { MARKET_CATALOG, PLATFORM_MARKET_CODES } from "@/lib/platform-sdk/markets";
import type { PlatformMarketCode } from "@/lib/platform-sdk/types";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

const HQ_MARKETS = PLATFORM_MARKET_CODES.filter((c) => c !== "GLOBAL");

export function OrganizationStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepHeader
        step={2}
        title="Organization"
        description="Who operates this platform and where is HQ?"
      />
      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Operator Name</Label>
          <Input
            value={draft.operator.name}
            onChange={(e) =>
              updateDraft({ operator: { ...draft.operator, name: e.target.value } })
            }
            className="mt-1.5 h-10"
          />
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Headquarters</Label>
          <select
            value={draft.operator.headquartersCountry}
            onChange={(e) =>
              updateDraft({
                operator: {
                  ...draft.operator,
                  headquartersCountry: e.target.value as PlatformMarketCode,
                },
              })
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[13px]"
          >
            {HQ_MARKETS.map((code) => (
              <option key={code} value={code}>
                {MARKET_CATALOG[code].flag} {MARKET_CATALOG[code].label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

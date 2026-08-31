"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";

const CATEGORIES = [
  "e-commerce",
  "productivity",
  "finance",
  "communication",
  "developer-tools",
  "travel",
  "media",
  "other",
] as const;

export function ProductStep({ wizard }: { wizard: HubPlatformWizard }) {
  const { draft, updateDraft } = wizard;

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepHeader
        step={3}
        title="Product Definition"
        description="Category, pricing model, and discovery tags."
      />
      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Category</Label>
          <select
            value={draft.category}
            onChange={(e) =>
              updateDraft({ category: e.target.value as typeof draft.category })
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[13px]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Pricing</Label>
          <select
            value={draft.pricing}
            onChange={(e) =>
              updateDraft({ pricing: e.target.value as typeof draft.pricing })
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[13px]"
          >
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
            <option value="usage-based">Usage-based</option>
          </select>
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#334155]">Tags</Label>
          <Input
            value={draft.tags.join(", ")}
            onChange={(e) =>
              updateDraft({
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="marketplace, resale, local"
            className="mt-1.5 h-10"
          />
        </div>
      </div>
    </div>
  );
}

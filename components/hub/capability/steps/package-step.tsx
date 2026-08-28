"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CapabilityPreviewCard } from "@/components/hub/wizard/capability-preview-card";
import { validatePackageStep } from "@/lib/hub/capability/validation";
import type { CapabilityDraft } from "@/lib/hub/capability/types";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { Check, Upload } from "lucide-react";

const CATEGORIES = [
  { value: "e-commerce", label: "E-commerce" },
  { value: "productivity", label: "Productivity" },
  { value: "finance", label: "Finance" },
  { value: "communication", label: "Communication" },
  { value: "developer-tools", label: "Developer Tools" },
  { value: "travel", label: "Travel" },
  { value: "media", label: "Media" },
  { value: "other", label: "Other" },
] as const;

export function PackageStep({ wizard }: { wizard: HubCapabilityWizard }) {
  const { draft, updateDraft } = wizard;
  const fileRef = useRef<HTMLInputElement>(null);
  const validation = validatePackageStep(draft);

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag || draft.tags.includes(tag)) return;
    updateDraft({ tags: [...draft.tags, tag] });
  };

  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <div>
          <h2 className="text-[20px] font-semibold text-[#0F172A]">1. Package Information</h2>
          <p className="mt-1 text-[14px] text-[#64748B]">
            Basic information about your capability.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="cap-name">Capability Name</Label>
            <Input
              id="cap-name"
              value={draft.name}
              onChange={(e) => updateDraft({ name: e.target.value })}
              className="mt-1.5"
              maxLength={50}
            />
            <p className="mt-1 text-[11px] text-[#94A3B8]">
              A clear and concise name for your capability.{" "}
              <span className="float-right">{draft.name.length} / 50</span>
            </p>
            {validation.errors.name ? (
              <p className="mt-1 text-[12px] text-red-600">{validation.errors.name}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="cap-id">Capability ID</Label>
            <Input
              id="cap-id"
              value={draft.id}
              onChange={(e) => updateDraft({ id: e.target.value })}
              className="mt-1.5 font-mono text-[13px]"
            />
            <p className="mt-1 text-[11px] text-[#94A3B8]">
              Unique identifier. Use lowercase dot-separated naming.
            </p>
            {validation.errors.id ? (
              <p className="mt-1 text-[12px] text-red-600">{validation.errors.id}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="cap-desc">Short Description</Label>
            <textarea
              id="cap-desc"
              value={draft.description}
              onChange={(e) => updateDraft({ description: e.target.value })}
              rows={3}
              maxLength={200}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-[14px] outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="mt-1 text-[11px] text-[#94A3B8]">
              <span className="float-right">{draft.description.length} / 200</span>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cap-cat">Category</Label>
              <select
                id="cap-cat"
                value={draft.category}
                onChange={(e) =>
                  updateDraft({
                    category: e.target.value as CapabilityDraft["category"],
                  })
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-[14px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cap-price">Pricing Model</Label>
              <select
                id="cap-price"
                value={draft.pricing}
                onChange={(e) =>
                  updateDraft({
                    pricing: e.target.value as CapabilityDraft["pricing"],
                  })
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-[14px]"
              >
                <option value="free">Free</option>
                <option value="freemium">Freemium</option>
                <option value="paid">Paid</option>
                <option value="usage-based">Usage Based</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {draft.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    updateDraft({ tags: draft.tags.filter((t) => t !== tag) })
                  }
                  className="rounded-md bg-[#EEF2FF] px-2 py-1 text-[11px] font-medium text-[#6366F1]"
                >
                  {tag} ×
                </button>
              ))}
            </div>
            <Input
              placeholder="Type and press Enter"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
          </div>

          <div>
            <Label>Capability Icon</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-[13px] text-[#64748B] hover:bg-[#F1F5F9]"
            >
              <Upload className="size-4" />
              Drag & Drop or Click to upload · PNG / JPG / SVG
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  updateDraft({ iconDataUrl: String(reader.result) });
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
        </div>

        <ul className="space-y-1">
          {validation.hints.map((h) => (
            <li key={h} className="flex items-center gap-1.5 text-[12px] text-emerald-600">
              <Check className="size-3.5" /> {h}
            </li>
          ))}
        </ul>
      </div>

      <aside className="hidden lg:block">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
          Package Preview
        </p>
        <CapabilityPreviewCard draft={draft} />
      </aside>
    </div>
  );
}

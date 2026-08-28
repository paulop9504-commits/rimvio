"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HubCodeEditor } from "@/components/hub/wizard/hub-code-editor";
import { CapabilityPreviewCard } from "@/components/hub/wizard/capability-preview-card";
import { validateManifestJson } from "@/lib/hub/capability/validation";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ManifestStep({ wizard }: { wizard: HubCapabilityWizard }) {
  const { draft, updateDraft } = wizard;
  const [mode, setMode] = useState<"visual" | "json">("json");
  const manifestCheck = useMemo(
    () => validateManifestJson(draft.manifestJson),
    [draft.manifestJson],
  );

  return (
    <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-semibold text-[#0F172A]">2. Manifest</h2>
            <p className="mt-1 text-[14px] text-[#64748B]">
              Define how your capability works in Rimvio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-[#E2E8F0] p-0.5">
              {(["visual", "json"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[12px] font-semibold capitalize",
                    mode === m ? "bg-[#6366F1] text-white" : "text-[#64748B]",
                  )}
                >
                  {m === "json" ? "JSON Editor" : "Visual Editor"}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm">
              Import from File
            </Button>
            <Button
              type="button"
              size="sm"
              variant={manifestCheck.valid ? "default" : "destructive"}
              className={manifestCheck.valid ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {manifestCheck.valid ? "Validate ✓" : "Validate ✕"}
            </Button>
          </div>
        </div>

        {mode === "json" ? (
          <>
            <HubCodeEditor
              value={draft.manifestJson}
              onChange={(v) => updateDraft({ manifestJson: v })}
              errorLine={manifestCheck.line}
            />
            {!manifestCheck.valid && manifestCheck.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                ✕ Manifest validation failed
                <br />
                {manifestCheck.error}
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-[12px] text-emerald-600">
                <Check className="size-3.5" /> Manifest valid
              </p>
            )}
          </>
        ) : (
          <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[12px] font-semibold text-[#334155]">Runtime Type</label>
                <select
                  value={draft.runtime.type}
                  onChange={(e) =>
                    updateDraft({
                      runtime: {
                        ...draft.runtime,
                        type: e.target.value as typeof draft.runtime.type,
                      },
                    })
                  }
                  className="mt-1 h-10 w-full rounded-lg border px-2 text-[13px]"
                >
                  <option value="pc-agent">PC Agent</option>
                  <option value="cloud-agent">Cloud Agent</option>
                  <option value="remote-agent">Remote Agent</option>
                  <option value="mobile-agent">Mobile Agent</option>
                  <option value="api-tool">API Tool</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#334155]">Entry Point</label>
                <input
                  value={draft.runtime.entry}
                  onChange={(e) =>
                    updateDraft({ runtime: { ...draft.runtime, entry: e.target.value } })
                  }
                  className="mt-1 h-10 w-full rounded-lg border px-2 font-mono text-[13px]"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#334155]">Input Type</label>
              <input
                value={draft.inputType}
                onChange={(e) => updateDraft({ inputType: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border px-2 font-mono text-[13px]"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-[#334155]">Actions</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateDraft({
                      actions: [
                        ...draft.actions,
                        {
                          id: `action_${draft.actions.length + 1}`,
                          name: "new_action",
                          description: "",
                          inputSchema: "",
                          outputSchema: "",
                          approvalRequired: false,
                        },
                      ],
                    })
                  }
                >
                  <Plus className="size-3.5" /> Add Action
                </Button>
              </div>
              <div className="space-y-2">
                {draft.actions.map((action, i) => (
                  <div
                    key={action.id}
                    className="rounded-lg border border-[#E2E8F0] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={action.name}
                        onChange={(e) => {
                          const actions = [...draft.actions];
                          actions[i] = { ...action, name: e.target.value };
                          updateDraft({ actions });
                        }}
                        className="font-mono text-[13px] font-semibold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft({
                            actions: draft.actions.filter((a) => a.id !== action.id),
                          })
                        }
                      >
                        <X className="size-4 text-[#94A3B8]" />
                      </button>
                    </div>
                    <input
                      value={action.description}
                      placeholder="Description"
                      onChange={(e) => {
                        const actions = [...draft.actions];
                        actions[i] = { ...action, description: e.target.value };
                        updateDraft({ actions });
                      }}
                      className="mt-1 w-full text-[12px] text-[#64748B] outline-none"
                    />
                    <label className="mt-2 flex items-center gap-2 text-[11px]">
                      <input
                        type="checkbox"
                        checked={action.approvalRequired}
                        onChange={(e) => {
                          const actions = [...draft.actions];
                          actions[i] = { ...action, approvalRequired: e.target.checked };
                          updateDraft({ actions });
                        }}
                      />
                      User approval required
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="hidden xl:block">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
          Manifest Preview
        </p>
        <CapabilityPreviewCard draft={draft} />
      </aside>
    </div>
  );
}

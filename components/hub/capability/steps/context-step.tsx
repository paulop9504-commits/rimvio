"use client";

import { useState } from "react";
import { HubCodeEditor } from "@/components/hub/wizard/hub-code-editor";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { ALL_CONTEXT_FIELDS, RIMVIO_CONTEXT_TREE } from "@/lib/hub/capability/context-catalog";
import type { ContextField } from "@/lib/hub/capability/types";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { cn } from "@/lib/utils";

type TabId = "context" | "input" | "output" | "events";

export function ContextStep({ wizard }: { wizard: HubCapabilityWizard }) {
  const { draft, updateDraft } = wizard;
  const [tab, setTab] = useState<TabId>("context");

  const toggleContext = (field: ContextField) => {
    const exists = draft.selectedContext.some((c) => c.id === field.id);
    updateDraft({
      selectedContext: exists
        ? draft.selectedContext.filter((c) => c.id !== field.id)
        : [...draft.selectedContext, field],
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <WizardStepHeader
        step={4}
        title="Context & I/O"
        description="Define what Rimvio context your capability can access and how data flows."
      />

      <div className="mb-4 flex gap-1 border-b border-[#E2E8F0]">
        {(
          [
            ["context", "Context"],
            ["input", "Input Schema"],
            ["output", "Output Schema"],
            ["events", "Events"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors",
              tab === id
                ? "border-[#6366F1] text-[#6366F1]"
                : "border-transparent text-[#64748B] hover:text-[#334155]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "context" ? (
        <div className="grid min-h-0 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[12px] font-semibold text-[#334155]">
              Available Rimvio Context
            </p>
            <div className="max-h-[400px] space-y-3 overflow-y-auto text-[12px] rimvio-scroll-touch">
              {RIMVIO_CONTEXT_TREE.map((group) => (
                <div key={group.id}>
                  <p className="font-semibold text-[#0F172A]">{group.label}</p>
                  <ul className="ml-1 mt-1 space-y-1 border-l border-[#E2E8F0] pl-3">
                    {group.children?.map((child) => {
                      const field = ALL_CONTEXT_FIELDS.find((f) => f.id === child.id);
                      if (!field) return null;
                      const checked = draft.selectedContext.some((c) => c.id === field.id);
                      return (
                        <li key={child.id}>
                          <label className="flex cursor-pointer items-center gap-2 text-[#64748B] hover:text-[#334155]">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleContext(field)}
                            />
                            {child.label}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[12px] font-semibold text-[#334155]">Selected Context</p>
            {draft.selectedContext.length === 0 ? (
              <p className="text-[12px] text-[#94A3B8]">No context selected yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {draft.selectedContext.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-3 py-2"
                  >
                    <span className="font-mono text-[12px] text-[#334155]">{c.path}</span>
                    <span className="rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-medium text-[#6366F1]">
                      {c.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleContext(c)}
                      className="ml-2 text-[#94A3B8] hover:text-[#64748B]"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === "input" ? (
        <HubCodeEditor
          value={draft.inputSchemaJson}
          onChange={(v) => updateDraft({ inputSchemaJson: v })}
        />
      ) : null}

      {tab === "output" ? (
        <HubCodeEditor
          value={draft.outputSchemaJson}
          onChange={(v) => updateDraft({ outputSchemaJson: v })}
        />
      ) : null}

      {tab === "events" ? (
        <div className="space-y-2">
          {draft.events.map((ev, i) => (
            <div key={ev.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <input
                value={ev.name}
                onChange={(e) => {
                  const events = [...draft.events];
                  events[i] = { ...ev, name: e.target.value };
                  updateDraft({ events });
                }}
                className="font-mono text-[13px] font-semibold outline-none"
              />
              <input
                value={ev.description}
                onChange={(e) => {
                  const events = [...draft.events];
                  events[i] = { ...ev, description: e.target.value };
                  updateDraft({ events });
                }}
                className="mt-1 block w-full text-[12px] text-[#64748B] outline-none"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { HubCodeEditor } from "@/components/hub/wizard/hub-code-editor";
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
    <div className="flex min-h-0 flex-1 flex-col space-y-4">
      <div>
        <h2 className="text-[20px] font-semibold text-[#0F172A]">4. Context & I/O</h2>
        <p className="mt-1 text-[14px] text-[#64748B]">
          Define what Rimvio context your capability can access and how data flows.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[#E2E8F0]">
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
              "shrink-0 border-b-2 px-3 py-2 text-[13px] font-semibold",
              tab === id
                ? "border-[#6366F1] text-[#6366F1]"
                : "border-transparent text-[#64748B]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "context" ? (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3">
            <p className="mb-2 text-[12px] font-semibold text-[#334155]">Available Rimvio Context</p>
            <div className="max-h-[360px] space-y-2 overflow-y-auto text-[12px]">
              {RIMVIO_CONTEXT_TREE.map((group) => (
                <div key={group.id}>
                  <p className="font-semibold text-[#0F172A]">{group.label}</p>
                  <ul className="ml-3 mt-1 space-y-1">
                    {group.children?.map((child) => {
                      const field = ALL_CONTEXT_FIELDS.find((f) => f.id === child.id);
                      if (!field) return null;
                      const checked = draft.selectedContext.some((c) => c.id === field.id);
                      return (
                        <li key={child.id}>
                          <label className="flex items-center gap-2 text-[#64748B]">
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
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3">
            <p className="mb-2 text-[12px] font-semibold text-[#334155]">Selected Context</p>
            <ul className="space-y-1 text-[12px] font-mono text-[#475569]">
              {draft.selectedContext.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-md bg-[#F8FAFC] px-2 py-1">
                  {c.path}
                  <button
                    type="button"
                    onClick={() => toggleContext(c)}
                    className="text-[#94A3B8]"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
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
            <div key={ev.id} className="rounded-xl border border-[#E2E8F0] p-3">
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

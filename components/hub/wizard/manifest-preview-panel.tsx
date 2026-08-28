"use client";

import { useMemo } from "react";
import type { CapabilityDraft } from "@/lib/hub/capability/types";
import { validateManifestJson } from "@/lib/hub/capability/validation";

export function ManifestPreviewPanel({ draft }: { draft: CapabilityDraft }) {
  const parsed = useMemo(() => {
    const result = validateManifestJson(draft.manifestJson);
    if (!result.valid) {
      return null;
    }
    try {
      return JSON.parse(draft.manifestJson) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [draft.manifestJson]);

  const sections = useMemo(() => {
    if (!parsed) {
      return [
        { label: "Basic info", items: [`Name: ${draft.name}`, `Version: ${draft.version}`] },
        {
          label: "Permissions",
          items: draft.permissions.filter((p) => p.enabled).map((p) => p.label),
        },
        { label: "Actions", items: draft.actions.map((a) => a.name) },
        { label: "Output", items: ["product", "cart", "purchase_event"] },
      ];
    }

    const runtime = parsed.runtime as Record<string, string> | undefined;
    const input = parsed.input as Record<string, string> | undefined;
    const permissions = Array.isArray(parsed.permissions)
      ? (parsed.permissions as string[])
      : draft.permissions.filter((p) => p.enabled).map((p) => p.label);
    const actions = Array.isArray(parsed.actions)
      ? (parsed.actions as string[])
      : draft.actions.map((a) => a.name);
    const output = Array.isArray(parsed.output) ? (parsed.output as string[]) : [];

    return [
      {
        label: "Basic info",
        items: [
          `Name: ${String(parsed.name ?? draft.name)}`,
          `Version: ${String(parsed.version ?? draft.version)}`,
          `Runtime: ${runtime?.type ?? draft.runtime.type}`,
          `Entry: ${runtime?.entry ?? draft.runtime.entry}`,
          `Input: ${input?.type ?? draft.inputType}`,
        ],
      },
      { label: "Permissions", items: permissions },
      { label: "Actions", items: actions },
      { label: "Output", items: output.length ? output : ["—"] },
    ];
  }, [draft, parsed]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
        Manifest Preview
      </p>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-semibold text-[#334155]">{section.label}</p>
            <ul className="mt-1 space-y-0.5">
              {section.items.map((item) => (
                <li key={item} className="font-mono text-[11px] text-[#64748B]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

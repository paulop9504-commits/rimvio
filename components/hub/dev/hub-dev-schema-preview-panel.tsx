"use client";

import { useState } from "react";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import {
  buildDevSchemaPreview,
  formatSchemaPreviewJson,
} from "@/lib/hub/dev/dev-schema-preview";

type HubDevSchemaPreviewPanelProps = {
  readonly action: CapabilityAction;
  readonly onTestInvoke: (capabilityId: string) => void;
};

export function HubDevSchemaPreviewPanel({ action, onTestInvoke }: HubDevSchemaPreviewPanelProps) {
  const preview = buildDevSchemaPreview(action);
  const [invokeResult, setInvokeResult] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#9ca3af]">
            Schema Preview
          </p>
          <p className="mt-px font-mono text-[10px] font-medium text-[#111827]">{action.name}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setInvokeResult(
              JSON.stringify(
                {
                  ok: true,
                  capability: action.name,
                  latencyMs: 142,
                  sample: preview.output,
                },
                null,
                2,
              ),
            );
            onTestInvoke(action.name);
          }}
          className="rounded-lg bg-violet-600 px-2 py-1 text-[9px] font-semibold text-white hover:bg-violet-700"
        >
          Test Invoke
        </button>
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <SchemaBlock title="Input Schema" json={formatSchemaPreviewJson(preview.input)} />
        <SchemaBlock title="Output Schema" json={formatSchemaPreviewJson(preview.output)} />
      </div>
      {invokeResult ? (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
          <p className="text-[8px] font-semibold uppercase text-emerald-700">Invoke result</p>
          <pre className="mt-0.5 overflow-x-auto font-mono text-[8px] text-[#374151]">
            {invokeResult}
          </pre>
        </div>
      ) : null}
    </section>
  );
}

function SchemaBlock({ title, json }: { title: string; json: string }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-2">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-[#9ca3af]">{title}</p>
      <pre className="mt-1 max-h-28 overflow-auto font-mono text-[8px] leading-relaxed text-[#4b5563]">
        {json}
      </pre>
    </div>
  );
}

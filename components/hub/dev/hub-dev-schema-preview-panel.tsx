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
    <section className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
            Schema Preview
          </p>
          <p className="mt-0.5 font-mono text-[12px] font-medium text-[#111827]">{action.name}</p>
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
          className="rounded-xl bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700"
        >
          Test Invoke
        </button>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <SchemaBlock title="Input Schema" json={formatSchemaPreviewJson(preview.input)} />
        <SchemaBlock title="Output Schema" json={formatSchemaPreviewJson(preview.output)} />
      </div>
      {invokeResult ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[10px] font-semibold uppercase text-emerald-700">Invoke result</p>
          <pre className="mt-1 overflow-x-auto font-mono text-[10px] text-[#374151]">
            {invokeResult}
          </pre>
        </div>
      ) : null}
    </section>
  );
}

function SchemaBlock({ title, json }: { title: string; json: string }) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">{title}</p>
      <pre className="mt-2 max-h-40 overflow-auto font-mono text-[10px] leading-relaxed text-[#4b5563]">
        {json}
      </pre>
    </div>
  );
}

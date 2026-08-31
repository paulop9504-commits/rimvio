"use client";

import { useMemo, useState } from "react";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  buildDevSchemaPreview,
  formatSchemaPreviewJson,
} from "@/lib/hub/dev/dev-schema-preview";
import {
  defaultInvokeInputJson,
  invokeDevCapability,
  type DevCapabilityInvokeRecord,
} from "@/lib/hub/dev/invoke-dev-capability";
import { readPlatformContextValues } from "@/lib/hub/dev/platform-context-values";
import { cn } from "@/lib/utils";

type HubDevSchemaPreviewPanelProps = {
  readonly action: CapabilityAction;
  readonly draft: PlatformDraft;
  readonly onTestInvoke: (capabilityId: string, record: DevCapabilityInvokeRecord) => void;
};

export function HubDevSchemaPreviewPanel({
  action,
  draft,
  onTestInvoke,
}: HubDevSchemaPreviewPanelProps) {
  const preview = buildDevSchemaPreview(action);
  const context = readPlatformContextValues(draft.id);
  const initialInput = useMemo(
    () => defaultInvokeInputJson(action, context),
    [action, context.destination, context.checkIn, context.checkOut, context.guests],
  );
  const [inputJson, setInputJson] = useState(initialInput);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<DevCapabilityInvokeRecord | null>(null);

  const handleInvoke = async () => {
    setBusy(true);
    setRecord(null);
    const result = await invokeDevCapability({ draft, action, rawInput: inputJson });
    setRecord(result);
    setBusy(false);
    onTestInvoke(action.name, result);
  };

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
          disabled={busy}
          onClick={() => void handleInvoke()}
          className="rounded-lg bg-violet-600 px-2 py-1 text-[9px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {busy ? "Invoking…" : "Test Invoke"}
        </button>
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <SchemaBlock title="Input Schema" json={formatSchemaPreviewJson(preview.input)} />
        <SchemaBlock title="Output Schema" json={formatSchemaPreviewJson(preview.output)} />
      </div>
      <label className="mt-2 block">
        <span className="text-[8px] font-semibold uppercase tracking-wide text-[#9ca3af]">
          Invoke input
        </span>
        <textarea
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          rows={5}
          spellCheck={false}
          className="mt-1 w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-2 font-mono text-[8px] leading-relaxed text-[#4b5563] focus:border-violet-400 focus:outline-none"
        />
      </label>
      {busy ? (
        <p className="mt-2 text-[9px] font-medium text-violet-700">Validating → executing…</p>
      ) : null}
      {record ? (
        <div
          className={cn(
            "mt-2 rounded-lg border p-2",
            record.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50",
          )}
        >
          <p
            className={cn(
              "text-[8px] font-semibold uppercase",
              record.ok ? "text-emerald-700" : "text-red-700",
            )}
          >
            {record.ok ? `Invoke ok · ${record.latencyMs}ms` : `Invoke failed · ${record.latencyMs}ms`}
          </p>
          {record.errorKo ? (
            <p className="mt-1 text-[9px] text-red-800">{record.errorKo}</p>
          ) : null}
          <pre className="mt-0.5 max-h-36 overflow-auto font-mono text-[8px] text-[#374151]">
            {JSON.stringify(
              {
                ok: record.ok,
                capability: record.capabilityId,
                latencyMs: record.latencyMs,
                input: record.input,
                output: record.output,
                logs: record.logs,
              },
              null,
              2,
            )}
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

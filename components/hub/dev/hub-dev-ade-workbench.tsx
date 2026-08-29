"use client";

import { useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot, DevProjectSource } from "@/lib/hub/dev/dev-project-state";
import type { AnalyzedPlatformBlueprint } from "@/lib/hub/dev/platform-analyzer";
import { buildDevAnalysisResult } from "@/lib/hub/dev/dev-analysis-result";
import { buildDevCapabilityRows } from "@/lib/hub/dev/dev-capability-exposure-ui";
import {
  buildDevSchemaPreview,
  formatSchemaPreviewJson,
} from "@/lib/hub/dev/dev-schema-preview";
import { HubDevAnalysisResultCard } from "@/components/hub/dev/hub-dev-analysis-result-card";
import { cn } from "@/lib/utils";

type HubDevAdeWorkbenchProps = {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly blueprint: AnalyzedPlatformBlueprint | null;
  readonly connectedSource: DevProjectSource | null;
  readonly connectValue: string;
  readonly analyzing: boolean;
  readonly analyzedAtMs: number | null;
  readonly selectedCapabilityId: string | null;
  readonly onConnectValueChange: (v: string) => void;
  readonly onConnect: () => void;
  readonly onFilesDrop: (files: FileList) => void;
  readonly onSelectCapability: (id: string) => void;
  readonly onTestInvoke: (capabilityId: string) => void;
};

export function HubDevAdeWorkbench(props: HubDevAdeWorkbenchProps) {
  const { draft, snapshot, hasPlatform } = {
    draft: props.draft,
    snapshot: props.snapshot,
    hasPlatform: props.draft.actions.length > 0,
  };

  const analysis = useMemo(
    () =>
      hasPlatform
        ? buildDevAnalysisResult({
            draft,
            snapshot,
            analyzedAtMs: props.analyzedAtMs ?? undefined,
          })
        : null,
    [draft, hasPlatform, props.analyzedAtMs, snapshot],
  );

  const capabilityRows = useMemo(
    () => buildDevCapabilityRows(draft.actions),
    [draft.actions],
  );

  const selectedAction =
    draft.actions.find((a) => a.id === props.selectedCapabilityId) ??
    draft.actions[0] ??
    null;

  const schemaPreview = selectedAction ? buildDevSchemaPreview(selectedAction) : null;
  const [invokeResult, setInvokeResult] = useState<string | null>(null);

  if (!hasPlatform) {
    return <AdeConnectEmpty {...props} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rimvio-scroll-touch">
      <ConnectStrip {...props} />
      <div className="space-y-4 p-4">
        {analysis ? <HubDevAnalysisResultCard result={analysis} /> : null}

        <section className="rounded-xl border border-white/[0.08] bg-[#151820]">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <p className="text-[11px] font-semibold text-[#b0b8c1]">
              Discovered Capabilities ({capabilityRows.length})
            </p>
          </div>
          <ul className="max-h-[220px] overflow-y-auto rimvio-scroll-touch">
            {capabilityRows.map(({ action, badge, badgeLabel }) => {
              const selected = selectedAction?.id === action.id;
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => props.onSelectCapability(action.id)}
                    className={cn(
                      "flex w-full items-center gap-2 border-b border-white/[0.04] px-4 py-2 text-left font-mono text-[12px] transition-colors",
                      selected
                        ? "bg-[#4593fc]/10 text-[#8ec0ff]"
                        : "text-[#b0b8c1] hover:bg-white/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                        badge === "approval"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-emerald-500/10 text-emerald-400",
                      )}
                    >
                      {badgeLabel}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{action.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {selectedAction && schemaPreview ? (
          <section className="rounded-xl border border-white/[0.08] bg-[#151820] p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[12px] font-semibold text-[#f2f4f6]">
                {selectedAction.name}
              </p>
              <button
                type="button"
                onClick={() => {
                  setInvokeResult(
                    JSON.stringify(
                      {
                        ok: true,
                        capability: selectedAction.name,
                        latencyMs: 142,
                        sample: schemaPreview.output,
                      },
                      null,
                      2,
                    ),
                  );
                  props.onTestInvoke(selectedAction.name);
                }}
                className="rounded-lg bg-[#4593fc] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3a82e0]"
              >
                Test Invoke
              </button>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <SchemaBlock title="Input Schema" json={formatSchemaPreviewJson(schemaPreview.input)} />
              <SchemaBlock
                title="Output Schema"
                json={formatSchemaPreviewJson(schemaPreview.output)}
              />
            </div>
            {invokeResult ? (
              <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-[10px] font-semibold uppercase text-emerald-400">Invoke result</p>
                <pre className="mt-1 overflow-x-auto font-mono text-[10px] text-[#b0b8c1]">
                  {invokeResult}
                </pre>
              </div>
            ) : null}
          </section>
        ) : null}

        {props.blueprint ? (
          <p className="text-[11px] text-[#6b7684]">
            {props.blueprint.platformName} · {props.blueprint.tagline}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ConnectStrip({
  connectedSource,
  connectValue,
  analyzing,
  onConnectValueChange,
  onConnect,
}: HubDevAdeWorkbenchProps) {
  return (
    <div className="border-b border-white/[0.06] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
        Connect your service to Rimvio
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={connectValue}
          onChange={(e) => onConnectValueChange(e.target.value)}
          placeholder="https://github.com/dev/osaka-stay"
          className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#151820] px-3 py-2 text-[12px] text-[#f2f4f6] placeholder:text-[#6b7684] focus:border-[#4593fc]/50 focus:outline-none"
        />
        <button
          type="button"
          disabled={analyzing || !connectValue.trim()}
          onClick={onConnect}
          className="shrink-0 rounded-xl bg-[#4593fc] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#3a82e0] disabled:opacity-40"
        >
          {analyzing ? "Analyzing…" : "Connect"}
        </button>
      </div>
      {connectedSource ? (
        <p className="mt-2 truncate text-[10px] text-[#6b7684]">
          <span className="uppercase text-[#8ec0ff]">{connectedSource.kind}</span> ·{" "}
          {connectedSource.detail ?? connectedSource.label}
        </p>
      ) : null}
    </div>
  );
}

function SchemaBlock({ title, json }: { title: string; json: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-[#6b7684]">{title}</p>
      <pre className="mt-1 max-h-[180px] overflow-auto rounded-lg border border-white/[0.06] bg-[#0e1014] p-2 font-mono text-[10px] leading-relaxed text-[#b0b8c1]">
        {json}
      </pre>
    </div>
  );
}

function AdeConnectEmpty({
  connectValue,
  analyzing,
  onConnectValueChange,
  onConnect,
  onFilesDrop,
}: HubDevAdeWorkbenchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8">
      <p className="mb-6 text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
        ADE · Platform Builder
      </p>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) onFilesDrop(e.dataTransfer.files);
        }}
        className="w-full max-w-lg rounded-2xl border-2 border-dashed border-white/[0.12] bg-[#151820]/80 p-8 text-center hover:border-[#4593fc]/40"
      >
        <Upload className="mx-auto size-8 text-[#6b7684]" />
        <p className="mt-3 text-[14px] font-medium text-[#f2f4f6]">파일 · URL · 코드 · 자연어</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onFilesDrop(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 text-[11px] text-[#8ec0ff] hover:underline"
        >
          Browse files
        </button>
      </div>
      <p className="my-4 text-[11px] text-[#6b7684]">또는 GitHub / OpenAPI URL</p>
      <div className="flex w-full max-w-lg gap-2">
        <input
          value={connectValue}
          onChange={(e) => onConnectValueChange(e.target.value)}
          placeholder="https://github.com/dev/osaka-stay"
          className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#151820] px-4 py-2.5 text-[13px] text-[#f2f4f6] placeholder:text-[#6b7684] focus:border-[#4593fc]/50 focus:outline-none"
        />
        <button
          type="button"
          disabled={analyzing || !connectValue.trim()}
          onClick={onConnect}
          className="shrink-0 rounded-xl bg-[#4593fc] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#3a82e0] disabled:opacity-40"
        >
          {analyzing ? "Analyzing…" : "Connect"}
        </button>
      </div>
    </div>
  );
}

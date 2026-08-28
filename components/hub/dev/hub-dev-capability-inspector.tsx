"use client";

import type { CapabilityInspectorView } from "@/lib/hub/dev/capability-inspector";
import { cn } from "@/lib/utils";

type HubDevCapabilityInspectorProps = {
  view: CapabilityInspectorView;
  onViewConfiguration: () => void;
  onTest: () => void;
  onEditWithAi: () => void;
};

export function HubDevCapabilityInspector({
  view,
  onViewConfiguration,
  onTest,
  onEditWithAi,
}: HubDevCapabilityInspectorProps) {
  const statusLabel =
    view.status === "ready"
      ? "● Ready"
      : view.status === "needs-test"
        ? "○ Needs test"
        : "○ Draft";

  const statusClass =
    view.status === "ready"
      ? "text-emerald-400"
      : view.status === "needs-test"
        ? "text-amber-400"
        : "text-[#6b7684]";

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Capability Inspector</p>
      <p className="mt-2 font-mono text-[14px] font-bold text-[#f2f4f6]">{view.name}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#6b7684]">{view.description}</p>

      <dl className="mt-4 space-y-3 text-[11px]">
        <InspectorRow label="Status" value={statusLabel} valueClass={statusClass} />
        <InspectorRow label="Version" value={`v${view.version}`} />
        <InspectorRow label="Runtime" value={view.runtime} />
        <InspectorRow
          label="Input"
          value={view.inputs.join(", ") || "—"}
          mono
        />
        <InspectorRow
          label="Output"
          value={view.outputs.join(", ") || "—"}
          mono
        />
        <div>
          <dt className="text-[10px] font-semibold uppercase text-[#6b7684]">Permissions</dt>
          <dd className="mt-1 space-y-1">
            {view.permissions.length === 0 ? (
              <span className="text-[#6b7684]">—</span>
            ) : (
              view.permissions.map((p) => (
                <span
                  key={p.id}
                  className="block font-mono text-[10px] text-[#b0b8c1]"
                >
                  {p.id}
                </span>
              ))
            )}
          </dd>
        </div>
        <InspectorRow
          label="Side effect"
          value={view.sideEffect}
          valueClass={view.financialWarning ? "text-amber-400" : undefined}
        />
      </dl>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onViewConfiguration}
          className="w-full rounded-lg border border-white/[0.1] py-2 text-[11px] font-medium text-[#b0b8c1] hover:bg-white/[0.04]"
        >
          View Configuration
        </button>
        <button
          type="button"
          onClick={onEditWithAi}
          className="w-full rounded-lg border border-[#4593fc]/30 bg-[#4593fc]/10 py-2 text-[11px] font-medium text-[#8ec0ff]"
        >
          Edit with AI
        </button>
        <button
          type="button"
          onClick={onTest}
          className="w-full rounded-lg bg-[#4593fc] py-2 text-[11px] font-semibold text-white"
        >
          Test
        </button>
      </div>

      <details className="mt-4 rounded-lg border border-white/[0.06] bg-[#151820] p-3">
        <summary className="cursor-pointer text-[10px] font-semibold text-[#8ec0ff]">
          Manifest snippet
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto font-mono text-[9px] leading-relaxed text-[#6b7684]">
          {view.manifestSnippet}
        </pre>
      </details>
    </div>
  );
}

function InspectorRow({
  label,
  value,
  mono,
  valueClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase text-[#6b7684]">{label}</dt>
      <dd className={cn("mt-0.5", mono && "font-mono", valueClass ?? "text-[#b0b8c1]")}>
        {value}
      </dd>
    </div>
  );
}

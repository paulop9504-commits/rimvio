"use client";

import {
  compileCapabilityPackage,
  type RimvioCapabilityPackage,
} from "@/lib/rimvio-protocol/capability-specification";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevCapabilitySpecPanelProps = {
  draft: PlatformDraft;
  action: CapabilityAction;
};

const PILLAR_LABELS: Record<string, string> = {
  intent: "① Intent",
  input: "② Input",
  action: "③ Action",
  requirements: "④ Requirements",
  permission: "⑤ Permission",
  output: "⑥ Output",
  conditions: "Success / Failure",
};

export function HubDevCapabilitySpecPanel({ draft, action }: HubDevCapabilitySpecPanelProps) {
  const pkg = compileCapabilityPackage({ action, draft });
  const { specification: spec, implementation } = pkg;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#151820] p-4">
      <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Capability Specification</p>
      <p className="mt-1 text-[11px] text-[#8b95a1]">
        계약(Specification) · 구현은 Open Code / Provider별 교체 가능
      </p>

      <dl className="mt-4 space-y-3 text-[11px]">
        <SpecRow pillar="intent" title={PILLAR_LABELS.intent!}>
          <p className="text-[#e2e8f0]">{spec.intent.summaryKo}</p>
          <p className="mt-0.5 text-[#6b7684]">{spec.intent.problemStatementKo}</p>
        </SpecRow>

        <SpecRow pillar="input" title={PILLAR_LABELS.input!}>
          <p className="font-mono text-[#b0b8c1]">{spec.input.schemaId}</p>
          <p className="mt-0.5 text-[#6b7684]">{spec.input.fields.join(" · ")}</p>
        </SpecRow>

        <SpecRow pillar="action" title={PILLAR_LABELS.action!}>
          <p className="font-mono text-[#b0b8c1]">{spec.action.capabilityId}</p>
          <p className="mt-0.5 text-[#6b7684]">{spec.action.description}</p>
        </SpecRow>

        <SpecRow pillar="requirements" title={PILLAR_LABELS.requirements!}>
          <p className="text-[#b0b8c1]">
            Runtime · {spec.requirements.runtimeTypes.join(", ")}
          </p>
          <p className="mt-0.5 text-[#6b7684]">
            Infra · {spec.requirements.infrastructureKinds.join(", ") || "—"}
          </p>
        </SpecRow>

        <SpecRow pillar="permission" title={PILLAR_LABELS.permission!}>
          <p className="text-[#b0b8c1]">
            {spec.permission.scopes.length > 0
              ? spec.permission.scopes.join(" · ")
              : "Platform permissions (draft)"}
          </p>
          <p className="mt-0.5 text-[#6b7684]">risk · {spec.permission.riskTier}</p>
        </SpecRow>

        <SpecRow pillar="output" title={PILLAR_LABELS.output!}>
          <p className="font-mono text-[#b0b8c1]">{spec.output.schemaId}</p>
          <p className="mt-0.5 text-[#6b7684]">{spec.output.fields.join(" · ")}</p>
        </SpecRow>

        <SpecRow pillar="conditions" title={PILLAR_LABELS.conditions!}>
          <ConditionList label="✓" items={spec.conditions.success} tone="ok" />
          <ConditionList label="✕" items={spec.conditions.failure} tone="fail" />
        </SpecRow>
      </dl>

      <ImplementationBadge implementation={implementation} />
    </div>
  );
}

function SpecRow({
  pillar,
  title,
  children,
}: {
  pillar: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-white/[0.04] px-3 py-2")} data-pillar={pillar}>
      <dt className="text-[9px] font-semibold uppercase tracking-wide text-[#6b7684]">{title}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function ConditionList({
  label,
  items,
  tone,
}: {
  label: string;
  items: readonly { code: string; descriptionKo: string }[];
  tone: "ok" | "fail";
}) {
  return (
    <ul className={cn("mt-1 space-y-0.5", tone === "ok" ? "text-emerald-400/90" : "text-amber-400/80")}>
      {items.slice(0, 3).map((item) => (
        <li key={item.code} className="text-[10px]">
          {label} {item.descriptionKo}
        </li>
      ))}
    </ul>
  );
}

function ImplementationBadge({
  implementation,
}: {
  implementation: RimvioCapabilityPackage["implementation"];
}) {
  return (
    <p className="mt-4 rounded-lg bg-[#0f1218] px-3 py-2 text-[10px] text-[#6b7684]">
      Implementation · <span className="text-[#8ec0ff]">{implementation.kind}</span>
      {implementation.providerLabel ? ` · ${implementation.providerLabel}` : ""}
      {implementation.entry ? (
        <span className="mt-0.5 block font-mono text-[9px]">{implementation.entry}</span>
      ) : null}
    </p>
  );
}

"use client";

import type { CapabilityAction } from "@/lib/hub/capability/types";
import {
  buildCapabilityInspectorView,
  type CapabilityInspectorView,
} from "@/lib/hub/dev/capability-inspector";
import { HubDevStandaloneCapabilityPublish } from "@/components/hub/dev/hub-dev-standalone-capability-publish";
import { HubDevCapabilityCompatibilityPanel } from "@/components/hub/dev/hub-dev-capability-compatibility-panel";
import { HubDevCapabilitySpecPanel } from "@/components/hub/dev/hub-dev-capability-spec-panel";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevCapabilityViewProps = {
  draft: PlatformDraft;
  actions: CapabilityAction[];
  selectedId: string | null;
  testsPassed: boolean;
  onSelect: (id: string) => void;
  onViewConfiguration: (actionId: string) => void;
  onTest: () => void;
  onEditWithAi: (action: CapabilityAction) => void;
  onOpenCode: () => void;
};

export function HubDevCapabilityList({
  draft,
  actions,
  selectedId,
  testsPassed,
  onSelect,
  onViewConfiguration,
  onTest,
  onEditWithAi,
  onOpenCode,
}: HubDevCapabilityViewProps) {
  const selected = actions.find((a) => a.id === selectedId) ?? null;
  const inspector = selected
    ? buildCapabilityInspectorView(selected, draft, testsPassed)
    : null;

  return (
    <div className="flex h-full min-h-0">
      <div className="w-[220px] shrink-0 border-r border-white/[0.06] p-2">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase text-[#6b7684]">
          Capabilities
        </p>
        {actions.length === 0 ? (
          <p className="px-2 text-[11px] text-[#6b7684]">
            AI Build에서 Platform을 만든 후 Capability가 여기에 표시됩니다.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {actions.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelect(a.id)}
                  className={cn(
                    "w-full rounded-lg px-2 py-1.5 text-left font-mono text-[11px]",
                    selectedId === a.id
                      ? "bg-[#4593fc]/15 text-[#8ec0ff]"
                      : "text-[#b0b8c1] hover:bg-white/[0.04]",
                  )}
                >
                  {a.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {inspector ? (
        <HubDevCapabilityDetail
          view={inspector}
          draft={draft}
          ownerCreatorId={draft.operator?.name ?? draft.name}
          action={selected!}
          onViewConfiguration={() => onViewConfiguration(selected!.id)}
          onTest={onTest}
          onEditWithAi={() => onEditWithAi(selected!)}
          onOpenCode={onOpenCode}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-[12px] text-[#6b7684]">Capability를 선택하세요</p>
          {actions.length === 0 ? (
            <p className="max-w-xs text-[11px] text-[#4b5563]">
              또는 ✦ AI Build에서 &quot;호텔 예약 플랫폼&quot;을 생성하세요.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function HubDevCapabilityDetail({
  view,
  draft,
  ownerCreatorId,
  action,
  onViewConfiguration,
  onTest,
  onEditWithAi,
  onOpenCode,
}: {
  view: CapabilityInspectorView;
  draft: PlatformDraft;
  ownerCreatorId: string;
  action: CapabilityAction;
  onViewConfiguration: () => void;
  onTest: () => void;
  onEditWithAi: () => void;
  onOpenCode: () => void;
}) {
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
    <div className="min-h-0 flex-1 overflow-y-auto p-6 rimvio-scroll-touch">
      <h2 className="font-mono text-[18px] font-bold text-[#f2f4f6]">{view.name}</h2>
      <p className="mt-2 text-[13px] text-[#6b7684]">{view.description}</p>

      <dl className="mt-6 space-y-4 text-[12px]">
        <Row label="Status" value={statusLabel} valueClass={statusClass} />
        <Row label="Version" value={`v${view.version}`} />
        <Row label="Runtime" value={view.runtime} />
        <Row label="Input" value={view.inputs.join(", ")} mono />
        <Row label="Output" value={view.outputs.join(", ")} mono />
        <div>
          <dt className="text-[10px] font-semibold uppercase text-[#6b7684]">Permissions</dt>
          <dd className="mt-1 space-y-1">
            {view.permissions.map((p) => (
              <span key={p.id} className="block font-mono text-[11px] text-[#b0b8c1]">
                {p.id}
              </span>
            ))}
          </dd>
        </div>
        <Row
          label="Side Effect"
          value={view.sideEffect}
          valueClass={view.financialWarning ? "text-amber-400" : undefined}
        />
      </dl>

      <div className="mt-8 max-w-md space-y-4">
        <HubDevCapabilitySpecPanel draft={draft} action={action} />
        <HubDevCapabilityCompatibilityPanel draft={draft} action={action} />
        <HubDevStandaloneCapabilityPublish
          action={action}
          ownerCreatorId={ownerCreatorId}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenCode}
          className="rounded-lg border border-white/[0.1] px-4 py-2 text-[11px] font-medium text-[#b0b8c1] hover:bg-white/[0.04]"
        >
          Open Code
        </button>
        <button
          type="button"
          onClick={onViewConfiguration}
          className="rounded-lg border border-white/[0.1] px-4 py-2 text-[11px] font-medium text-[#b0b8c1] hover:bg-white/[0.04]"
        >
          View Configuration
        </button>
        <button
          type="button"
          onClick={onEditWithAi}
          className="rounded-lg border border-[#4593fc]/30 bg-[#4593fc]/10 px-4 py-2 text-[11px] font-medium text-[#8ec0ff]"
        >
          Edit with AI
        </button>
        <button
          type="button"
          onClick={onTest}
          className="rounded-lg bg-[#4593fc] px-4 py-2 text-[11px] font-semibold text-white"
        >
          Test
        </button>
      </div>
    </div>
  );
}

function Row({
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

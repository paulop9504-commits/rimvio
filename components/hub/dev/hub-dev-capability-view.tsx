"use client";

import type { CapabilityAction } from "@/lib/hub/capability/types";
import {
  buildCapabilityInspectorView,
  type CapabilityInspectorView,
} from "@/lib/hub/dev/capability-inspector";
import { buildDevCapabilityRows } from "@/lib/hub/dev/dev-capability-exposure-ui";
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
  const rows = buildDevCapabilityRows(actions);

  return (
    <div className="flex h-full min-h-0 bg-[#f4f5f7]">
      <div className="w-[240px] shrink-0 border-r border-[#e5e7eb] bg-white p-2">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase text-[#9ca3af]">
          Capabilities
        </p>
        {actions.length === 0 ? (
          <p className="px-2 text-[11px] text-[#9ca3af]">
            Platform을 연결하면 Capability가 여기에 표시됩니다.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {rows.map(({ action, badge, badgeLabel }) => (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => onSelect(action.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left font-mono text-[11px]",
                    selectedId === action.id
                      ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                      : "text-[#374151] hover:bg-[#f3f4f6]",
                  )}
                >
                  <span className="truncate">{action.name}</span>
                  <span
                    className={cn(
                      "ml-1 shrink-0 rounded px-1 text-[8px] font-bold uppercase",
                      badge === "approval" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
                    )}
                  >
                    {badgeLabel}
                  </span>
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
        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#f4f5f7] text-center">
          <p className="text-[12px] text-[#9ca3af]">Capability를 선택하세요</p>
          {actions.length === 0 ? (
            <p className="max-w-xs text-[11px] text-[#6b7280]">
              Blueprint에서 GitHub를 연결하거나 OsakaStay 데모를 로드하세요.
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
      ? "text-emerald-600"
      : view.status === "needs-test"
        ? "text-amber-600"
        : "text-[#9ca3af]";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-6 rimvio-scroll-touch">
      <h2 className="font-mono text-[18px] font-bold text-[#111827]">{view.name}</h2>
      <p className="mt-2 text-[13px] text-[#6b7280]">{view.description}</p>

      <dl className="mt-6 space-y-4 text-[12px]">
        <Row label="Status" value={statusLabel} valueClass={statusClass} />
        <Row label="Version" value={`v${view.version}`} />
        <Row label="Runtime" value={view.runtime} />
        <Row label="Input" value={view.inputs.join(", ")} mono />
        <Row label="Output" value={view.outputs.join(", ")} mono />
        <div>
          <dt className="text-[10px] font-semibold uppercase text-[#9ca3af]">Permissions</dt>
          <dd className="mt-1 space-y-1">
            {view.permissions.map((p) => (
              <span key={p.id} className="block font-mono text-[11px] text-[#374151]">
                {p.id}
              </span>
            ))}
          </dd>
        </div>
        <Row
          label="Side Effect"
          value={view.sideEffect}
          valueClass={view.financialWarning ? "text-amber-600" : undefined}
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
          className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-[11px] font-medium text-[#374151] shadow-sm hover:bg-[#fafafa]"
        >
          Open Code
        </button>
        <button
          type="button"
          onClick={onViewConfiguration}
          className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-[11px] font-medium text-[#374151] shadow-sm hover:bg-[#fafafa]"
        >
          View Configuration
        </button>
        <button
          type="button"
          onClick={onEditWithAi}
          className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-[11px] font-medium text-violet-700"
        >
          Edit with AI
        </button>
        <button
          type="button"
          onClick={onTest}
          className="rounded-lg bg-violet-600 px-4 py-2 text-[11px] font-semibold text-white hover:bg-violet-700"
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
      <dt className="text-[10px] font-semibold uppercase text-[#9ca3af]">{label}</dt>
      <dd className={cn("mt-0.5", mono && "font-mono", valueClass ?? "text-[#374151]")}>
        {value}
      </dd>
    </div>
  );
}

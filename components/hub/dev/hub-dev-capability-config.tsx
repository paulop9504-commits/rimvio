"use client";

import { useMemo, useState } from "react";
import { ContextStep } from "@/components/hub/capability/steps/context-step";
import { ManifestStep } from "@/components/hub/capability/steps/manifest-step";
import { PermissionsStep } from "@/components/hub/capability/steps/permissions-step";
import { HubDevCapabilityManifestEditor } from "@/components/hub/dev/hub-dev-capability-manifest-editor";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import {
  inferContextForAction,
  inferPermissionsForAction,
} from "@/lib/hub/dev/capability-inspector";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type ConfigTab = "manifest" | "permissions" | "context";

type HubDevCapabilityConfigProps = {
  wizard: HubCapabilityWizard;
  draft: PlatformDraft;
  selectedAction: CapabilityAction | null;
  scope: "capability" | "platform";
  onScopeChange: (scope: "capability" | "platform") => void;
  onApplyDraft: (draft: PlatformDraft) => void;
};

export function HubDevCapabilityConfig({
  wizard,
  draft,
  selectedAction,
  scope,
  onScopeChange,
  onApplyDraft,
}: HubDevCapabilityConfigProps) {
  const [tab, setTab] = useState<ConfigTab>("manifest");

  const capabilityPermissions = useMemo(() => {
    if (!selectedAction) return [];
    return inferPermissionsForAction(selectedAction, draft);
  }, [draft, selectedAction]);

  const capabilityContext = useMemo(() => {
    if (!selectedAction) return [];
    return inferContextForAction(selectedAction, draft);
  }, [draft, selectedAction]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-[#E2E8F0] bg-white px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
          Advanced configuration
        </p>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">
          {scope === "capability" && selectedAction
            ? selectedAction.name
            : "Platform manifest"}
        </h2>
        <p className="mt-1 text-[12px] text-[#64748b]">
          AI가 생성한 구성을 검토·수정합니다. Manifest · Permissions · Context / I/O
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <ScopeButton
            active={scope === "capability"}
            disabled={!selectedAction}
            onClick={() => {
              onScopeChange("capability");
              setTab("manifest");
            }}
          >
            Capability scope
          </ScopeButton>
          <ScopeButton
            active={scope === "platform"}
            onClick={() => {
              onScopeChange("platform");
            }}
          >
            Platform-wide
          </ScopeButton>
        </div>

        {scope === "capability" ? (
          <div className="mt-3 flex gap-1 rounded-lg border border-[#E2E8F0] bg-[#f8fafc] p-0.5">
            {(["manifest", "permissions", "context"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[11px] font-semibold capitalize",
                  tab === t ? "bg-white text-[#6366F1] shadow-sm" : "text-[#64748B]",
                )}
              >
                {t === "context" ? "Context / I/O" : t}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        {scope === "platform" ? (
          <div className="space-y-8">
            <ManifestStep wizard={wizard} />
            <PermissionsStep wizard={wizard} />
            <ContextStep wizard={wizard} />
          </div>
        ) : tab === "manifest" && selectedAction ? (
          <HubDevCapabilityManifestEditor
            key={`${selectedAction.id}-${draft.manifestJson?.length ?? 0}`}
            action={selectedAction}
            draft={draft}
            onApply={onApplyDraft}
          />
        ) : tab === "permissions" ? (
          <div className="mx-auto max-w-3xl space-y-3">
            {capabilityPermissions.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-[12px]"
              >
                <p className="font-mono font-semibold text-[#0f172a]">{p.id}</p>
                <p className="mt-1 text-[#64748b]">{p.whyNeeded}</p>
                <p className="mt-2 text-[11px] text-[#94a3b8]">
                  Risk: {p.risk} · Scope: {p.scope}
                </p>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                onScopeChange("platform");
              }}
              className="text-[12px] font-medium text-[#6366F1] hover:underline"
            >
              Platform-wide Permissions 편집 →
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <ul className="space-y-2">
              {capabilityContext.map((path) => (
                <li
                  key={path}
                  className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 font-mono text-[12px]"
                >
                  {path}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                onScopeChange("platform");
              }}
              className="mt-4 text-[12px] font-medium text-[#6366F1] hover:underline"
            >
              Platform-wide Context 편집 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScopeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors",
        active
          ? "bg-[#6366F1] text-white"
          : "border border-[#E2E8F0] bg-white text-[#64748B]",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

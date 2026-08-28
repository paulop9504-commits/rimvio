"use client";

import { useMemo, useState } from "react";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { computeSecurityImpact } from "@/lib/hub/capability/validation";
import type { CapabilityPermission } from "@/lib/hub/capability/types";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const RISK_COLORS = {
  low: "text-emerald-600 bg-emerald-50",
  medium: "text-amber-700 bg-amber-50",
  high: "text-red-700 bg-red-50",
  critical: "text-red-900 bg-red-100",
};

const SANDBOX_RESTRICTIONS = [
  "No password access",
  "No saved credential extraction",
  "Only approved browser session",
  "Network limited to declared domains",
];

export function PermissionsStep({ wizard }: { wizard: HubCapabilityWizard }) {
  const { draft, updateDraft } = wizard;
  const [selected, setSelected] = useState<CapabilityPermission | null>(
    draft.permissions.find((p) => p.enabled) ?? null,
  );
  const impact = useMemo(() => computeSecurityImpact(draft), [draft]);

  const enabled = draft.permissions.filter((p) => p.enabled);
  const disabled = draft.permissions.filter((p) => !p.enabled);
  const highRiskEnabled = enabled.some((p) => p.risk === "high" || p.risk === "critical");

  const toggle = (id: string) => {
    updateDraft({
      permissions: draft.permissions.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p,
      ),
    });
  };

  const impactLabel =
    impact === "low" ? "Low" : impact === "medium" ? "Medium" : impact === "high" ? "High" : "Critical";

  const impactBadgeClass =
    impact === "low"
      ? "bg-emerald-50 text-emerald-700"
      : impact === "medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <div className="mx-auto max-w-6xl">
      <WizardStepHeader
        step={3}
        title="Permissions"
        description="Declare the permissions your capability needs."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[12px] font-semibold text-[#334155]">Permission Details</p>

            {selected ? (
              <div className="space-y-3">
                <p className="font-mono text-[14px] font-semibold text-[#0F172A]">
                  {selected.label}
                </p>
                <p className="text-[12px] leading-relaxed text-[#64748B]">
                  {selected.scope === "Read"
                    ? "Allows reading browser content and page state."
                    : selected.scope === "Write"
                      ? "Allows filling forms, clicking buttons, and manipulating page content."
                      : "Allows access to scoped resources in Rimvio Runtime."}
                </p>
                <p className="text-[11px] font-semibold text-[#334155]">Why needed:</p>
                <p className="text-[12px] text-[#64748B]">{selected.whyNeeded}</p>
              </div>
            ) : (
              <p className="text-[12px] text-[#94A3B8]">
                Select a permission to view details.
              </p>
            )}

            {highRiskEnabled ? (
              <div className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  This permission may affect user accounts. Please request only if necessary.
                </span>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                <tr>
                  <th className="px-4 py-2.5">Permission</th>
                  <th className="hidden px-3 py-2.5 sm:table-cell">Scope</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Why needed</th>
                  <th className="px-4 py-2.5">Risk</th>
                </tr>
              </thead>
              <tbody>
                {draft.permissions.map((perm) => (
                  <tr
                    key={perm.id}
                    className={cn(
                      "cursor-pointer border-b border-[#F8FAFC] transition-colors hover:bg-[#F8FAFC]",
                      selected?.id === perm.id && "bg-[#F5F3FF]",
                    )}
                    onClick={() => setSelected(perm)}
                  >
                    <td className="px-4 py-2.5">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={perm.enabled}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggle(perm.id);
                          }}
                        />
                        <span className="font-mono font-medium text-[#0F172A]">{perm.label}</span>
                      </label>
                    </td>
                    <td className="hidden px-3 py-2.5 text-[#64748B] sm:table-cell">{perm.scope}</td>
                    <td className="hidden px-3 py-2.5 text-[#64748B] md:table-cell">{perm.whyNeeded}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                          RISK_COLORS[perm.risk],
                        )}
                      >
                        {perm.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {draft.actions.some((a) => a.approvalRequired) ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
              User approval required before:{" "}
              {draft.actions
                .filter((a) => a.approvalRequired)
                .map((a) => a.name)
                .join(", ")}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[12px] font-semibold text-[#334155]">Summary</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[#F8FAFC] px-2 py-2">
                <p className="text-[18px] font-bold text-[#0F172A]">{enabled.length}</p>
                <p className="text-[10px] text-[#64748B]">Required</p>
              </div>
              <div className="rounded-lg bg-[#F8FAFC] px-2 py-2">
                <p className="text-[18px] font-bold text-[#0F172A]">0</p>
                <p className="text-[10px] text-[#64748B]">Optional</p>
              </div>
              <div className="rounded-lg bg-[#F8FAFC] px-2 py-2">
                <p className="text-[18px] font-bold text-[#0F172A]">{disabled.length}</p>
                <p className="text-[10px] text-[#64748B]">Denied</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {enabled.map((p) => (
                <li key={p.id} className="font-mono text-[11px] text-[#64748B]">
                  {p.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-[12px] font-semibold text-[#334155]">Security Impact</p>
            <span
              className={cn(
                "mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold",
                impactBadgeClass,
              )}
            >
              {impactLabel}
            </span>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-2 text-[12px] font-semibold text-[#334155]">Sandbox Restrictions</p>
            <ul className="space-y-1 text-[11px] text-[#64748B]">
              {SANDBOX_RESTRICTIONS.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

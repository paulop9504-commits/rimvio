"use client";

import { useMemo, useState } from "react";
import { computeSecurityImpact } from "@/lib/hub/capability/validation";
import type { CapabilityPermission } from "@/lib/hub/capability/types";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { cn } from "@/lib/utils";

const RISK_COLORS = {
  low: "text-emerald-600 bg-emerald-50",
  medium: "text-amber-700 bg-amber-50",
  high: "text-red-700 bg-red-50",
  critical: "text-red-900 bg-red-100",
};

export function PermissionsStep({ wizard }: { wizard: HubCapabilityWizard }) {
  const { draft, updateDraft } = wizard;
  const [selected, setSelected] = useState<CapabilityPermission | null>(null);
  const impact = useMemo(() => computeSecurityImpact(draft), [draft]);
  const enabledCount = draft.permissions.filter((p) => p.enabled).length;

  const toggle = (id: string) => {
    updateDraft({
      permissions: draft.permissions.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p,
      ),
    });
  };

  const impactWidth =
    impact === "low" ? "25%" : impact === "medium" ? "55%" : impact === "high" ? "80%" : "100%";

  return (
    <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <div>
          <h2 className="text-[20px] font-semibold text-[#0F172A]">3. Permissions</h2>
          <p className="mt-1 text-[14px] text-[#64748B]">
            Declare the permissions your capability needs.
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-[12px] font-semibold text-[#334155]">Security Impact</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                impact === "low" && "bg-emerald-500",
                impact === "medium" && "bg-amber-500",
                (impact === "high" || impact === "critical") && "bg-red-500",
              )}
              style={{ width: impactWidth }}
            />
          </div>
          <p className="mt-1 text-[12px] capitalize text-[#64748B]">{impact}</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[11px] font-semibold uppercase text-[#94A3B8]">
              <tr>
                <th className="px-3 py-2">Permission</th>
                <th className="hidden px-3 py-2 sm:table-cell">Scope</th>
                <th className="hidden px-3 py-2 md:table-cell">Why needed</th>
                <th className="px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {draft.permissions.map((perm) => (
                <tr
                  key={perm.id}
                  className="cursor-pointer border-b border-[#F8FAFC] hover:bg-[#F8FAFC]"
                  onClick={() => setSelected(perm)}
                >
                  <td className="px-3 py-2.5">
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
                  <td className="px-3 py-2.5">
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
            ⚠ User approval required before:{" "}
            {draft.actions
              .filter((a) => a.approvalRequired)
              .map((a) => a.name)
              .join(", ")}
          </div>
        ) : null}
      </div>

      <aside className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        {selected ? (
          <>
            <p className="font-mono text-[14px] font-semibold text-[#0F172A]">{selected.label}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#64748B]">
              Allows this capability to access scoped resources in Rimvio Runtime.
            </p>
            <p className="mt-3 text-[11px] font-semibold text-[#334155]">Why this capability needs it:</p>
            <p className="text-[12px] text-[#64748B]">{selected.whyNeeded}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase text-red-600">
              Security impact: {selected.risk}
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-[#64748B]">
              <li>• No password access</li>
              <li>• No saved credential extraction</li>
              <li>• Only approved browser session</li>
            </ul>
          </>
        ) : (
          <p className="text-[12px] text-[#94A3B8]">
            Select a permission to view security details. {enabledCount} enabled.
          </p>
        )}
      </aside>
    </div>
  );
}
